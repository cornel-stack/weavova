import { AwsClient } from "aws4fetch";

// ============================================================================
// Cloudflare R2 — the project's FIRST real object-storage wiring (T4-B2).
// SERVER-ONLY by convention (imported only from "use server" actions; mirrors
// src/db/client.ts — no `server-only` package is added). This module is the ONLY
// place R2 config + signing lives. The validation constants (ALLOWED_UPLOAD_TYPES,
// MAX_UPLOAD_BYTES) live in the client-safe src/lib/brand-asset.ts so they can be
// shared with the upload widget without pulling aws4fetch into a client bundle.
//
// It does NOT read env or construct a client at import time — so the app builds
// and typechecks WITHOUT any R2 credentials (CI / static build parity, mirroring
// src/db/client.ts's lazy getDb()). A missing var only throws when a presign is
// actually requested (the live upload walk), never at build.
//
// Transport = PRESIGNED PUT, browser → R2 (ratified): the server signs a
// short-lived PUT URL via aws4fetch; the BROWSER PUTs the file bytes directly to
// R2. Bytes NEVER transit the Next.js server (Vercel request-body / Active-CPU
// limits — these are product videos). `SAMPLE_CLIP_URL` (the stubbed clip seam)
// is unrelated and unchanged.
//
// TWO OBJECT CLASSES, TWO BUCKETS (T7.4a). There are two access models, kept apart by
// CLASS-NAMED helpers so they CANNOT cross (no `bucket` flag to misuse):
//   • PUBLIC brand assets  → getPublicConfig / assetUrlForKey / presignPut (R2_BUCKET,
//     R2_PUBLIC_BASE_URL) — permanent public URLs. UNCHANGED behaviour.
//   • PRIVATE customer media → getCapturesConfig / presignCaptureUpload /
//     presignCaptureRead / deleteCaptureObject (R2_CAPTURES_BUCKET, NO public domain) —
//     consent-bearing captured + normalized proof media. Reads ONLY via a signed,
//     expiring presignCaptureRead; `assetUrlForKey` is PHYSICALLY UNABLE to address this
//     bucket (it has no public base URL), so customer media can never become a public URL.
// ============================================================================

// The signed PUT URL is valid for a short window — long enough to start the
// browser upload, short enough to limit replay.
const PRESIGN_TTL_SECONDS = 300;

// Shared SigV4 credentials + the target bucket. Both buckets live in the SAME R2 account
// and (D7) are addressed by the SAME account-scoped token; only the bucket name differs.
type R2Creds = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
};

// PUBLIC brand-assets bucket — adds the permanent public base URL.
type PublicR2Config = R2Creds & { publicBaseUrl: string };
// PRIVATE customer-media bucket — NO publicBaseUrl by construction (no public domain).
type CapturesR2Config = R2Creds;

// Read PUBLIC (brand) config lazily from env (CORNEL-OWNED infra — never hardcoded). Throws
// a deterministic, credential-free error if a var is missing, and ONLY when called.
function getPublicConfig(): PublicR2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicBaseUrl
  ) {
    throw new Error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL.",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl };
}

// Read PRIVATE (customer-media) config lazily from env — same account + token as public
// (D7), but the captures bucket and NO public base URL. A missing R2_CAPTURES_BUCKET throws
// only when a captures helper is actually called (build/typecheck stay green without it).
function getCapturesConfig(): CapturesR2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_CAPTURES_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 captures bucket is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_CAPTURES_BUCKET.",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

// The R2 S3-compatible endpoint for an object key in a given bucket.
function objectEndpoint(cfg: R2Creds, key: string): string {
  return `https://${cfg.accountId}.r2.cloudflarestorage.com/${cfg.bucket}/${key}`;
}

// One aws4fetch SigV4 client builder, reused by every helper (no new dep).
function buildClient(cfg: R2Creds): AwsClient {
  return new AwsClient({
    accessKeyId: cfg.accessKeyId,
    secretAccessKey: cfg.secretAccessKey,
    service: "s3",
    region: "auto", // R2 uses the "auto" region
  });
}

// The stored, publicly-referenceable URL we persist as brand_asset.assetUrl. PUBLIC bucket
// ONLY (T7.4a): it reads the public base URL, which the captures bucket does not have — so
// this can NEVER produce a customer-media URL.
export function assetUrlForKey(key: string): string {
  const cfg = getPublicConfig();
  return `${cfg.publicBaseUrl.replace(/\/$/, "")}/${key}`;
}

// A workspace-scoped object key for a brand-asset upload. The random suffix is
// caller-supplied (server-generated) so this module needs no Math.random/Date.
export function brandAssetKey(workspaceId: string, suffix: string): string {
  return `brand-assets/${workspaceId}/${suffix}`;
}

// A workspace-scoped object key for a brand-kit LOGO upload (T5-BrandKit). Reuses the
// same R2 bucket + the presignPut/assetUrlForKey path; only the key prefix differs
// (brand-kit/). The random suffix is caller-supplied (server-generated).
export function brandKitLogoKey(workspaceId: string, suffix: string): string {
  return `brand-kit/${workspaceId}/${suffix}`;
}

// A workspace-scoped object key for a capture-page media upload (T7.2). Same R2
// bucket + presignPut/assetUrlForKey path; only the prefix differs (capture/). The
// random suffix is caller-supplied (server-generated). Used by the video/audio/photo
// paths whose bytes PUT directly to R2 (never through the app server).
export function captureMediaKey(workspaceId: string, suffix: string): string {
  return `capture/${workspaceId}/${suffix}`;
}

// Sign a short-lived PUT URL for `key` bound to `contentType` (aws4fetch SigV4).
// The browser will PUT the file to this URL directly. Returns the URL only; the
// row is recorded separately AFTER the browser confirms the PUT succeeded.
export async function presignPut(
  key: string,
  contentType: string,
): Promise<string> {
  const cfg = getPublicConfig();
  const url = new URL(objectEndpoint(cfg, key));
  url.searchParams.set("X-Amz-Expires", String(PRESIGN_TTL_SECONDS));
  const signed = await buildClient(cfg).sign(
    new Request(url, { method: "PUT", headers: { "content-type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

// ============================================================================
// PRIVATE customer-media helpers (T7.4a). These target the captures bucket ONLY
// (getCapturesConfig). They are the entire surface for consent-bearing customer media:
// upload, read, delete. `assetUrlForKey` (public) cannot reach this bucket, so customer
// media is private by construction.
// ============================================================================

// Sign a short-lived PUT URL for a CAPTURE upload, bound to `contentType`. Mirrors
// presignPut but targets the PRIVATE captures bucket. Replaces presignPut in the
// /c/[token] capture action — the browser PUTs the bytes directly to the private bucket.
export async function presignCaptureUpload(
  key: string,
  contentType: string,
): Promise<string> {
  const cfg = getCapturesConfig();
  const url = new URL(objectEndpoint(cfg, key));
  url.searchParams.set("X-Amz-Expires", String(PRESIGN_TTL_SECONDS));
  const signed = await buildClient(cfg).sign(
    new Request(url, { method: "PUT", headers: { "content-type": contentType } }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

// FR-007a forward-contract reconcile. The consent-gated READER (T8 playback) resolves the
// proof's EFFECTIVE consent (the resolver) and passes the verdict here — r2.ts NEVER reads
// the DB itself (that would create a queries.ts ↔ r2.ts import cycle and break the FR-012
// "caller gates" contract). When the proof is withdrawn, the read path does NOT sign: it
// idempotently re-deletes the (now-orphaned) captured + normalized objects — shrinking the
// recordConsentWithdrawal transient-failure residual without a background sweep — and denies.
export type CaptureReadReconcile = {
  consentWithdrawn: boolean;
  // The proof's captured + normalized keys to idempotently re-delete on a withdrawn read.
  cascadeKeys: ReadonlyArray<string | null | undefined>;
};

// Sign a short-lived, EXPIRING GET URL for a captures-bucket object — the ONLY sanctioned
// customer-media read path (what T8 playback will use). NEVER a permanent public URL: the
// captures bucket has no public domain, so a signed, TTL-bound GET is the only readable
// form. NO live consumer this slice (no playback is built; the T7.2 non-playing seam is
// byte-stable). When `reconcile.consentWithdrawn` is true, this DENIES (throws) after the
// idempotent delete-on-access (FR-007a) instead of signing.
export async function presignCaptureRead(
  key: string,
  reconcile?: CaptureReadReconcile,
): Promise<string> {
  if (reconcile?.consentWithdrawn) {
    for (const k of reconcile.cascadeKeys) {
      if (k) await deleteCaptureObject(k);
    }
    throw new Error("Capture media not available: consent withdrawn.");
  }
  const cfg = getCapturesConfig();
  const url = new URL(objectEndpoint(cfg, key));
  url.searchParams.set("X-Amz-Expires", String(PRESIGN_TTL_SECONDS));
  const signed = await buildClient(cfg).sign(
    new Request(url, { method: "GET" }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

// HARD-DELETE a captures-bucket object (the P-VII withdrawal cascade reaches the FILE).
// IDEMPOTENT: an already-absent object (404) resolves as success — re-withdrawal, a prior
// delete, or the FR-007a on-access reconcile all no-op cleanly. Only an unexpected non-OK,
// non-404 status throws (a transient failure the caller logs but does not surface).
export async function deleteCaptureObject(key: string): Promise<void> {
  const cfg = getCapturesConfig();
  const res = await buildClient(cfg).fetch(objectEndpoint(cfg, key), {
    method: "DELETE",
  });
  // S3/R2 DELETE returns 204 on success and 404 when the object is already gone; both are
  // success for an idempotent hard delete.
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE ${key} failed: ${res.status}`);
  }
}
