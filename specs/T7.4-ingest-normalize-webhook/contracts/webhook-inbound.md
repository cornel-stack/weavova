# Contract — Generic inbound webhook

**Route**: `POST /api/ingest` (Vercel, public, **no OAuth / no user auth**). Single global endpoint;
the **secret selects the workspace** (no workspace id in the URL).

## Auth

- Header: `X-Weavova-Webhook-Secret: <secret>`.
- The secret is looked up in `webhook_endpoint` (unique index) → workspace; **constant-time** compare.
- Missing/invalid/unknown secret → **401** with a generic body (`{ "error": "unauthorized" }`) — **no**
  workspace-existence disclosure (the same 401 whether the secret is wrong or no endpoint exists).
- Real and authenticating (P-XIII): no request mints without a valid secret.

## Request body (the generic shape — zero vendor-specific fields)

```jsonc
{
  "event_id":          "string",   // OPTIONAL but RECOMMENDED — the caller's stable id (exactly-once)
  "customer_email":    "string",   // REQUIRED — the recipient of the capture ask
  "customer_name":     "string",   // OPTIONAL — brand-addressed prompt
  "transaction_ref":   "string",   // OPTIONAL — the evidence id (order/payment/booking id)
  "transaction_verified": true     // OPTIONAL — true ⇒ real transaction evidence ⇒ MEDIUM basis later
  // (or "transaction_verified_at": ISO8601 — if the caller knows the confirmation time)
}
```

- Zapier / Make / n8n map any vendor event onto this shape — **no vendor-specific code** in the route.
- `transaction_verified` (or `_at`) present ⇒ the mint sets `capture_request.transaction_verified_at`
  ⇒ the eventual proof earns a **medium** basis (D5). Absent ⇒ stays **weak** (no stamp).

## Idempotency

- `eventKey` = `event_id` if present, else a derived hash (`customer_email` + `transaction_ref` +
  event timestamp). Callers SHOULD send `event_id` for exactly-once.
- A duplicate `(workspace_id, event_key)` (Zapier re-fire / network retry / Inngest re-deliver) returns
  the **existing** `capture_request` — **no second mint** (FR-005). The ledger is `webhook_event`.

## Behaviour (happy path)

1. Validate secret → workspace.
2. Idempotency check (`webhook_event`).
3. `ensureWebhookSource(workspace)` → `createCaptureRequest(ws, webhookSourceId, { customerEmail,
   customerName, transactionRef, transactionVerifiedAt })` (existing primitive; token/72h/single-use
   **unchanged**).
4. Insert `webhook_event(ws, eventKey → requestId)`.
5. `fetch`-emit `request.created` to the Inngest Event API (best-effort).

## Responses

| Status | When | Body |
|--------|------|------|
| `202 Accepted` | minted (or idempotent replay) | `{ "request_id": "...", "capture_url": "/c/<token>", "duplicate": false\|true }` |
| `400` | missing `customer_email` / malformed | `{ "error": "invalid_payload" }` |
| `401` | bad/missing secret | `{ "error": "unauthorized" }` (generic) |
| `5xx` | mint/DB error | retried by the caller; idempotency makes the retry safe |

## Integration guard

A webhook-minted request's `/c/[token]` resolves **identically** to a T7.3-minted request — **zero
edits** to `src/app/c/[token]/**` (FR-017). If any edit there appears needed, STOP and surface.
