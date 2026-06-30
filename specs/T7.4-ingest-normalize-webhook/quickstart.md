# Quickstart — Validate T7.4 Ingest + normalize worker + webhook

Two-deployable, event-driven slice. The **build/typecheck stay green without infra**; the live paths
verify with provisioned Inngest + Railway (the T6 verify-with-real-infra pattern).

## Prerequisites

- Migration `0010` generated + applied (additive: `media_status` enum, proof + capture_request columns,
  `webhook_endpoint` + `webhook_event`).
- **App env** (Vercel/local): `INNGEST_EVENT_KEY`, `INNGEST_EVENT_API_URL` (+ existing `DATABASE_URL`,
  `R2_*`, `AUTH_*`).
- **Worker** (Railway): deployed from `worker/Dockerfile`, env per contracts/worker-host.md, ffmpeg in
  the image, functions registered (verify `/health`).

## Build gate (no infra needed)

```bash
npm run db:generate         # review 0010 is ADDITIVE (hard gate — no DROP/token/resolver change)
npm run lint && npm run build   # app green; deps still 11 (no inngest, no ffmpeg in package.json)
cd worker && npm run build      # worker typechecks against the shared schema
```

## Scenario 1 — Webhook mints a request (US1, SC-001/002)

```bash
# generate/show the workspace secret on the honest config surface first, then:
curl -X POST $APP_URL/api/ingest \
  -H "X-Weavova-Webhook-Secret: $WS_SECRET" \
  -H "content-type: application/json" \
  -d '{"event_id":"evt_1","customer_email":"buyer@example.com","customer_name":"Sam R."}'
```
- **Expect** `202` + `capture_url: /c/<token>`; one `capture_request` minted (72h, single-use,
  `customer_email`). Open the `/c/<token>` → behaves **identically** to a T7.3 request (zero `/c/[token]`
  edits).
- **Bad secret**: `curl … -H "X-Weavova-Webhook-Secret: wrong"` → `401` generic, **nothing minted**.

## Scenario 2 — Idempotency (SC-004)

- Re-POST the **same** `event_id` → `202` with `duplicate: true`, the **same** request id; **no second
  mint** (the `webhook_event` ledger). Covers Zapier/network re-fire + Inngest re-deliver.

## Scenario 3 — First earned MEDIUM verified stamp (US2, SC-003)

```bash
curl -X POST $APP_URL/api/ingest -H "X-Weavova-Webhook-Secret: $WS_SECRET" -H "content-type: application/json" \
  -d '{"event_id":"evt_2","customer_email":"buyer@example.com","transaction_ref":"order_999","transaction_verified":true}'
```
- The mint sets `capture_request.transaction_verified_at`. Capture at `/c/<token>` with granted consent
  → `writeCapturedProof` writes a **medium / source=webhook** basis → the proof shows the **stamp**.
- Control: a `manual_link` request (no evidence) → **weak** → no stamp.
- **Confirm**: `git diff src/lib/verification.ts` is **empty** — the stamp lit up via the unchanged
  T7.5 resolver (SC-003).

## Scenario 4 — Normalize worker (US3, SC-005/009)

- Capture a video proof → `media_status='captured'`, `media.captured` emitted → worker normalizes →
  `normalized_media_url` set, `media_status='normalized'`; the normalized object is ≤1080p H.264/AAC,
  upright.
- **Idempotency**: re-deliver `media.captured` → worker sees `normalized` → **no-op** (same key,
  no duplicate).
- **Failure**: feed a corrupt object → `media_status='failed'`, **`mediaUrl` (original) still present**,
  no `normalized_media_url` (SC-009).

## Scenario 5 — Re-sync on redeploy (SC-008)

- Redeploy the worker on Railway → check `/health` + the Inngest dashboard show functions
  **re-registered**. Emit a `media.captured` → it runs. (A stalled sync would silently no-op — the
  check catches it.)

## Pass criteria → Success Criteria

- SC-001/002 → Scenario 1 · SC-004 → Scenario 2 · SC-003 → Scenario 3 (+ empty resolver diff) ·
  SC-005/009 → Scenario 4 · SC-006 → build gate (deps still 11) · SC-007 → worker-host.md (T8 second
  service) · SC-008 → Scenario 5.
