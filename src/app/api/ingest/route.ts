import { NextResponse } from "next/server";
import {
  createCaptureRequest,
  findWebhookEvent,
  getWorkspaceBySecret,
  recordWebhookEvent,
} from "@/db/queries";
import { emitInngest } from "@/lib/inngest-emit";

// ============================================================================
// T7.4 — the generic inbound webhook (the universal door). POST /api/ingest is
// PUBLIC (no OAuth / no user auth): the per-workspace SHARED SECRET selects the
// workspace (no workspace id in the URL). Any platform — Zapier / Make / n8n
// bridging Shopify / Stripe / Calendly (native OAuth DEFERRED to the Sources
// track) — maps its event onto the generic shape below. ZERO vendor-specific code.
//
// A valid event mints a capture_request through the EXISTING T7.2 primitive
// (token / 72h / single-use UNCHANGED) and, when the caller signals a confirmed
// transaction, stamps transaction_verified_at so the eventual consented proof earns
// a MEDIUM "Verified real" basis (the T7.5 forward contract — resolver untouched).
//
// Node runtime (DB + WebCrypto); dynamic (never statically cached).
// ============================================================================
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SECRET_HEADER = "x-weavova-webhook-secret";

// The generic, vendor-neutral payload. customer_email is the only required field.
interface IngestPayload {
  event_id?: unknown;
  customer_email?: unknown;
  customer_name?: unknown;
  transaction_ref?: unknown;
  transaction_verified?: unknown;
  transaction_verified_at?: unknown;
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// Resolve the transaction-evidence marker: an explicit ISO `transaction_verified_at`
// (the caller knows the confirmation time) takes precedence; else `transaction_verified:
// true` marks it confirmed as of receipt. Absent / false → null (the proof stays WEAK).
function resolveTransactionVerifiedAt(payload: IngestPayload): Date | null {
  const iso = asTrimmedString(payload.transaction_verified_at);
  if (iso) {
    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (payload.transaction_verified === true) return new Date();
  return null;
}

export async function POST(request: Request) {
  // 1. Authenticate by secret → workspace + the webhook source. A missing/invalid/unknown
  //    secret is the SAME generic 401 (no workspace-existence disclosure — P-XIII).
  const secret = request.headers.get(SECRET_HEADER)?.trim() ?? "";
  const ws = await getWorkspaceBySecret(secret);
  if (!ws) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 2. Parse the generic payload. customer_email is required.
  let payload: IngestPayload;
  try {
    payload = (await request.json()) as IngestPayload;
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const customerEmail = asTrimmedString(payload.customer_email);
  if (!customerEmail) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const customerName = asTrimmedString(payload.customer_name);
  const transactionRef = asTrimmedString(payload.transaction_ref);
  const transactionVerifiedAt = resolveTransactionVerifiedAt(payload);

  // 3. Idempotency: event_id if present, else a derived key (no stable id → callers SHOULD
  //    send event_id for exactly-once). A duplicate (workspace, event_key) returns the
  //    EXISTING request — NO second mint (the webhook_event ledger; FR-005).
  const eventId = asTrimmedString(payload.event_id);
  const eventKey =
    eventId ??
    `derived:${customerEmail}|${transactionRef ?? ""}|${
      transactionVerifiedAt?.toISOString() ?? ""
    }`;

  const existing = await findWebhookEvent(ws.workspaceId, eventKey);
  if (existing?.captureRequestId && existing.token) {
    return NextResponse.json(
      {
        request_id: existing.captureRequestId,
        capture_url: `/c/${existing.token}`,
        duplicate: true,
      },
      { status: 202 },
    );
  }

  // 4. Mint via the EXISTING primitive (token model unchanged), attributing to the webhook
  //    source. transactionVerifiedAt (when present) feeds the MEDIUM basis at proof-write.
  const minted = await createCaptureRequest(ws.workspaceId, ws.sourceId, {
    customerName,
    customerEmail,
    transactionRef,
    transactionVerifiedAt,
  });

  // 5. Record the idempotency ledger row (so a later re-fire replays, never re-mints).
  await recordWebhookEvent(ws.workspaceId, eventKey, minted.id);

  // 6. Best-effort emit (the worker orchestrates the Resend send — Increment 2). If Inngest
  //    isn't provisioned yet, this no-ops; the durable mint above is the source of truth.
  await emitInngest("request.created", {
    requestId: minted.id,
    workspaceId: ws.workspaceId,
    token: minted.token,
    customerEmail,
  });

  return NextResponse.json(
    {
      request_id: minted.id,
      capture_url: `/c/${minted.token}`,
      duplicate: false,
    },
    { status: 202 },
  );
}
