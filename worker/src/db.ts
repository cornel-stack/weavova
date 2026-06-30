import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
// D9 — the SINGLE shared schema (src/db/schema.ts). The worker imports it directly from
// the repo (Railway builds from the repo-root context); there is NO worker-local copy, so
// the worker and the app can never drift (P-VI). The `.js` specifier is the nodenext
// convention; tsc resolves it to ../../src/db/schema.ts and emits ../../src/db/schema.js.
import {
  brandKit,
  captureRequest,
  consent,
  proof,
  requestSend,
  workspace,
} from "../../src/db/schema.js";

// Lazy Neon + Drizzle client — mirrors the app's src/db/client.ts. Does NOT connect at
// import time, so a missing DATABASE_URL only errors when a query actually runs.
let cached: ReturnType<typeof drizzle> | undefined;
function getDb() {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set on the worker.");
  cached = drizzle(neon(url));
  return cached;
}

// ── media.captured (normalize) ──────────────────────────────────────────────

export type MediaStatus =
  | "captured"
  | "normalizing"
  | "normalized"
  | "failed";

export interface NormalizeTarget {
  id: string;
  workspaceId: string;
  proofType: "text" | "video" | "photo" | "audio";
  mediaUrl: string | null;
  mediaStatus: MediaStatus | null;
}

// Load the proof's normalize-relevant fields. Null = the proof vanished (revoked/deleted).
export async function getNormalizeTarget(
  proofId: string,
): Promise<NormalizeTarget | null> {
  const rows = await getDb()
    .select({
      id: proof.id,
      workspaceId: proof.workspaceId,
      proofType: proof.proofType,
      mediaUrl: proof.mediaUrl,
      mediaStatus: proof.mediaStatus,
    })
    .from(proof)
    .where(eq(proof.id, proofId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    workspaceId: r.workspaceId,
    proofType: r.proofType,
    mediaUrl: r.mediaUrl,
    mediaStatus: r.mediaStatus as MediaStatus | null,
  };
}

// Atomically CLAIM the proof for normalization: captured|normalizing → normalizing.
// Returns true iff this call won the claim (the row was in an actionable state). A
// concurrent/duplicate delivery that finds it already `normalized` gets false → skip.
export async function claimForNormalize(proofId: string): Promise<boolean> {
  const rows = await getDb()
    .update(proof)
    .set({ mediaStatus: "normalizing" })
    .where(
      and(
        eq(proof.id, proofId),
        inArray(proof.mediaStatus, ["captured", "normalizing"]),
      ),
    )
    .returning({ id: proof.id });
  return rows.length > 0;
}

// Success path, made ATOMIC for the D6 orphan race (T7.4a). A SINGLE consent-gated
// conditional UPDATE: write the normalized key + flip to `normalized` ONLY IF the proof's
// effective consent is still granted. Returns the affected row count:
//   • 1 row  → persisted (consent held through the encode).
//   • 0 rows → consent was WITHDRAWN mid-encode; the worker's own output is now an orphan
//     (the caller deletes it + sets terminal media_status='failed'). No read-then-write
//     window — the cascade is airtight under concurrency; the worker's output is subject to it.
// The captured original (mediaUrl) is NEVER touched.
//
// F5 — PREDICATE PARITY (CANONICAL PAIR). The WHERE consent predicate below MUST match
// `effectiveConsentState`/`effectiveConsentGranted` in src/db/queries.ts EXACTLY — the latest
// consent row by `version`, state = 'granted'. These two are the canonical pair; a drift
// between them is a P-VII bug. If you change one, change the other.
export async function markNormalized(
  proofId: string,
  normalizedKey: string,
): Promise<number> {
  const rows = await getDb()
    .update(proof)
    .set({ normalizedMediaUrl: normalizedKey, mediaStatus: "normalized" })
    .where(
      and(
        eq(proof.id, proofId),
        // Mirror of src/db/queries.ts effectiveConsentState (latest version, granted).
        sql`(
          select c.state from ${consent} c
          where c.proof_id = ${proof.id}
          order by c.version desc
          limit 1
        ) = 'granted'`,
      ),
    )
    .returning({ id: proof.id });
  return rows.length;
}

// Failure (terminal, after bounded retries): flip to `failed`. The ORIGINAL mediaUrl is
// retained and normalized_media_url is left null — never a partial/corrupt normalized key.
export async function markFailed(proofId: string): Promise<void> {
  await getDb()
    .update(proof)
    .set({ mediaStatus: "failed" })
    .where(eq(proof.id, proofId));
}

// ── request.created (orchestrated send) ─────────────────────────────────────

export interface SendContext {
  token: string;
  customerEmail: string | null;
  workspaceName: string;
  brand: { logoAssetUrl: string | null; brandColor: string | null } | null;
}

// Resolve everything the brand-framed email needs: the request token + recipient, the
// workspace name, and the brand kit (logo + colour) for the framed CTA.
export async function getSendContext(
  requestId: string,
): Promise<SendContext | null> {
  const rows = await getDb()
    .select({
      token: captureRequest.token,
      customerEmail: captureRequest.customerEmail,
      workspaceId: captureRequest.workspaceId,
      workspaceName: workspace.name,
    })
    .from(captureRequest)
    .innerJoin(workspace, eq(captureRequest.workspaceId, workspace.id))
    .where(eq(captureRequest.id, requestId))
    .limit(1);
  const r = rows[0];
  if (!r) return null;

  const kitRows = await getDb()
    .select({
      logoAssetUrl: brandKit.logoAssetUrl,
      brandColor: brandKit.brandColor,
    })
    .from(brandKit)
    .where(eq(brandKit.workspaceId, r.workspaceId))
    .orderBy(desc(brandKit.createdAt))
    .limit(1);
  const kit = kitRows[0];

  return {
    token: r.token,
    customerEmail: r.customerEmail,
    workspaceName: r.workspaceName,
    brand: kit
      ? { logoAssetUrl: kit.logoAssetUrl, brandColor: kit.brandColor }
      : null,
  };
}

// Idempotency for the send: has this request already been accepted by Resend? A retry of
// the same request.created event must not double-send.
export async function hasAcceptedSend(requestId: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: requestSend.id })
    .from(requestSend)
    .where(
      and(
        eq(requestSend.requestId, requestId),
        eq(requestSend.deliveryStatus, "accepted"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

// Record one orchestrated send outcome (the worker mirror of the app's recordSend — one
// row per dispatch; powers the honest per-request delivery state). Never stores opens/clicks.
export async function recordWorkerSend(input: {
  requestId: string;
  workspaceId: string;
  recipientEmail: string;
  deliveryStatus: "accepted" | "failed";
  providerId: string | null;
}): Promise<void> {
  await getDb().insert(requestSend).values({
    requestId: input.requestId,
    workspaceId: input.workspaceId,
    templateId: null,
    channel: "email",
    recipientEmail: input.recipientEmail,
    deliveryStatus: input.deliveryStatus,
    providerId: input.providerId,
  });
}
