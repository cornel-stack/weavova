// ============================================================================
// Inngest event emit (T7.4). SERVER-ONLY by convention (imported only from route
// handlers + "use server" actions; mirrors src/lib/r2.ts + src/lib/resend.ts — no
// `server-only` package is added). The APP emits events via `fetch` to the Inngest
// Event API — it does NOT depend on the `inngest` SDK. The SDK (serve + functions)
// lives ONLY in the Railway worker (T7.4 Increment 2). This keeps the app at exactly
// 11 runtime deps (P-III dep boundary): no new dependency enters package.json.
//
// Env is read LAZILY (no import-time access), so the app builds/typechecks WITHOUT
// credentials (CI / static-build parity, mirroring getDb() + the R2 helper). A missing
// var is a SILENT no-op — never a throw — because the emit is BEST-EFFORT: the durable
// source of truth is the DB write the caller already committed (the minted
// capture_request, the captured proof). Inngest only schedules the async follow-up
// (the orchestrated send / the normalize). If Inngest isn't provisioned yet (Increment
// 1 runs on Neon + R2 only), the emit no-ops and the durable mint still stands.
// ============================================================================

// The Inngest Event API ingest endpoint. The event key is the path segment; the base
// is overridable for self-hosted/branch Inngest (defaults to the cloud Event API).
const DEFAULT_EVENT_API_BASE = "https://inn.gs";

/**
 * Emit one Inngest event. Best-effort: never throws to the caller, never blocks the
 * durable write's success. Missing env → silent no-op (build/run green without infra).
 *
 * @param name the event name (e.g. "request.created", "media.captured")
 * @param data the event payload (serialized as JSON)
 */
export async function emitInngest(
  name: string,
  data: Record<string, unknown>,
): Promise<void> {
  const eventKey = process.env.INNGEST_EVENT_KEY;
  if (!eventKey) {
    // Not provisioned (the Increment-1 / CI state) — the durable DB write is the source
    // of truth; the async follow-up simply isn't scheduled. Quiet by design.
    return;
  }

  const base = process.env.INNGEST_EVENT_API_URL || DEFAULT_EVENT_API_BASE;
  const url = `${base.replace(/\/+$/, "")}/e/${eventKey}`;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, data }),
    });
    // We deliberately do NOT inspect the response: a non-2xx is logged-and-forgotten,
    // not surfaced. The worker's at-least-once + idempotency model tolerates a missed
    // emit (a re-sync / retry re-drives it); the caller's write must not depend on it.
  } catch {
    // Network error reaching Inngest — swallow. The mint/proof already committed.
  }
}
