# Phase 0 — Research: T7.4 Ingest + normalize worker + generic inbound webhook

Policy settled at `/speckit.clarify` (D1 video-first; real authenticating secret; additive media model;
new-captures-only; emit-split; idempotency both layers; re-sync on redeploy; cores frozen). The
decisions below are the *how*, grounded in the real repo (Step 0).

---

## D1 — The two-deployable topology (the structural dep boundary)

**Decision** — one repo, two deployables; the dependency boundary is structural, not conventional.

| | **App (Vercel)** | **Worker (Railway)** |
|---|---|---|
| Code | webhook route, `inngest-emit.ts` (fetch), schema/migration, webhook CRUD, config surface | Inngest serve + functions, `normalize.ts` (ffmpeg), HTTP server, /health |
| Inngest | **emits** events via `fetch` to the Event API (`INNGEST_EVENT_KEY`) — **no SDK** | **serves** functions via the `inngest` SDK |
| Deps | unchanged — **stays 11** (no SDK, no ffmpeg) | host-side: `inngest`, `drizzle-orm`, `@neondatabase/serverless`, `aws4fetch`, an HTTP server, **ffmpeg** (system binary) |
| Data | Neon + R2 (existing `aws4fetch`) | Neon + R2 (own clients) |

**Why structural**: the app literally cannot import the Inngest SDK or ffmpeg (they're not in its
`package.json`), so a future edit can't accidentally pull them in — the 11-dep count is enforced by
absence, not discipline. The worker is a separate `package.json` under `worker/`.

---

## D2 — The event flow, traced through every failure point

**Happy path A (webhook → request):**
1. `POST /api/ingest` with header `X-Weavova-Webhook-Secret: <secret>` + JSON body.
2. **Validate secret** → look up `webhook_endpoint` by secret → workspace. Missing/invalid → **401
   generic** (no mint, no workspace-existence disclosure).
3. **Idempotency** → compute `eventKey` (caller `event_id` or derived). If `webhook_event(workspaceId,
   eventKey)` exists → return the **existing** `capture_request` (200, no new mint).
4. **Mint** → `createCaptureRequest(workspaceId, webhookSourceId, { customerEmail, customerName,
   transactionRef, transactionVerifiedAt })` (the existing primitive; token/72h/single-use unchanged).
   If transaction evidence present → `transaction_verified_at` set on the request (drives medium basis
   later, D5).
5. **Record** `webhook_event` (workspaceId, eventKey → mintedRequestId) — the idempotency ledger.
6. **Emit** `request.created` to the Inngest Event API via `fetch` (best-effort; the request is
   already durable, so a failed emit doesn't lose the mint — it only delays the send, which a retry or
   manual re-send covers).
7. Respond **202** with the minted request id (and the `/c/[token]` link).

**Happy path B (capture → normalize):**
1. Customer captures at `/c/[token]` (FROZEN) → the action calls `writeCapturedProof` (queries.ts).
2. `writeCapturedProof` writes proof (+ `media_status='captured'` when `mediaUrl` present) + consent +
   the basis (D5), then — when `mediaUrl` present — **emits `media.captured`** via the fetch helper
   (D7). Best-effort: a failed emit leaves `media_status='captured'`; the media is safe, just
   un-normalized (non-fatal pre-T8; a reconciliation sweep is a forward option, not built).
3. Inngest invokes the worker `media.captured` function → normalize (D6) → write
   `normalized_media_url` + `media_status='normalized'`.

**Failure / idempotency at each hop:**

| Hop | Failure | Behaviour |
|---|---|---|
| Secret | missing/invalid | 401 generic; nothing minted; no workspace disclosure |
| Idempotency | duplicate event (Zapier/network re-fire OR Inngest re-deliver) | ledger hit → returns the first request; **no second mint** |
| Mint | DB error | 5xx; nothing emitted; caller (Zapier) retries → idempotency makes the retry safe |
| Emit | Inngest Event API down | request already durable; emit is best-effort; send delayed not lost |
| `request.created` send | Resend transient fail | Inngest **retries** the function (at-least-once); `request_send` records honest status |
| `media.captured` worker | retried by Inngest | keyed on `media_status` — only act on `captured`/`normalizing`, **skip `normalized`**; deterministic output key → re-run overwrites the same object, never duplicates |
| Normalize | ffmpeg error / bad media | `media_status='failed'`; **original `mediaUrl` retained**; no partial `normalized_media_url`; honest state, not a crash loop |
| Worker → R2/DB unreachable | transient | function throws → Inngest retry/backoff; `media_status` stays `captured`/`normalizing` |

**The verification-basis write is the ONLY verification change** — the T7.5 resolver,
`qualifyingBasisExpr`, and `verification.ts` are untouched (D5). A medium basis lights the stamp through
the existing forward contract.

---

## D3 — Per-workspace secret model

**Decision** — new table `webhook_endpoint` (one per workspace): `workspaceId` (unique), `sourceId`
(the workspace's `webhook` source the mints attribute to), `secret` (a high-entropy random token), and
the timestamps. The webhook validates by looking up `webhook_endpoint` **by secret** (unique index) and
comparing constant-time.

- **Stored retrievably (plain high-entropy token), not hashed** — because D2-spec requires the surface
  to **show the real secret** so the merchant can paste it into Zapier. This is standard for a
  workspace shared-secret (cf. Stripe/GitHub webhook secrets); the secret is **regenerable** (rotating
  it invalidates the old one). Future hardening (encrypt-at-rest / show-once) is deferrable and noted.
- **Real and authenticating** (P-XIII): the secret genuinely gates the endpoint; a request without the
  correct secret mints nothing. No decorative control.
- A workspace's `webhook` **source** is ensured (created if absent) when the endpoint is generated; add
  `"webhook"` to the `SOURCE_KINDS` code-side allowlist (no migration — `source.kind` is text).

---

## D4 — Webhook idempotency (the ledger)

**Decision** — new table `webhook_event`: `workspaceId`, `eventKey` (text), `captureRequestId` (the
mint it produced), `createdAt`; **unique(`workspaceId`, `eventKey`)**.

- `eventKey` = a **caller-supplied `event_id`** when present (preferred — the caller knows the sale's
  identity), else a **derived** key (a hash of stable fields: `customer_email` + `transaction_ref` +
  the event's own timestamp). Derived keys are best-effort; the contract documents that callers SHOULD
  send `event_id` for exactly-once.
- On a duplicate `(workspaceId, eventKey)`, the webhook returns the **existing** `captureRequestId` —
  no second mint. Covers Zapier re-tries, network retries, and Inngest re-delivery alike.

---

## D5 — The medium-basis bridge (resolver UNCHANGED)

**Decision** — the webhook records transaction evidence on the **capture_request**; the proof-write
path promotes it to a **medium** basis:

1. Webhook mint sets `capture_request.transaction_verified_at` (additive column) when the event carries
   transaction evidence (and `transaction_ref` = the evidence id — column already exists).
2. `writeCapturedProof` (already a T7.5 touch point) branches its basis insert:
   - `capture_request.transaction_verified_at` present → `source='webhook', strength='medium',
     transaction_verified_at=<the request's value>, transaction_ref=<…>`.
   - else → `source='manual', strength='weak', transaction_verified_at=null` (today's behaviour).
3. The T7.5 resolver + `qualifyingBasisExpr` are **unchanged** — `strength IN (strong,medium) AND
   transaction_verified_at NOT NULL` already lights the stamp. **No edit to `verification.ts`.**

`createCaptureRequest` gains an additive `transactionVerifiedAt?` opt so the webhook can set it at mint.

---

## D6 — Normalize scope + idempotency (the worker function)

**Decision** (D1 from clarify) — **video-first**: `ffmpeg` caps resolution (≤1080p long edge),
re-encodes to standard **H.264/AAC MP4**, and **bakes rotation** (`-metadata:s:v rotate=0` + transpose
as needed). **Photo**: resize/re-encode to a sane max. **Audio**: deferred (no audio capture path yet —
T7.2b; not a render-crash source).

- **Idempotent**: the function reads the proof's `media_status`; acts only on `captured` (or resumes
  `normalizing`); **skips `normalized`**. The normalized object key is **deterministic** (e.g.
  `capture/{ws}/{proofId}/normalized.mp4`) so an Inngest retry overwrites the same object — never a
  duplicate.
- **Failure**: ffmpeg error → `media_status='failed'`; **original `mediaUrl` retained**; no
  `normalized_media_url` written (no partial state). Not a crash loop — a failed proof stops, honestly.
- ffmpeg is invoked via `child_process` against the system binary (installed in the worker image) — no
  ffmpeg-wrapper dependency.

---

## D7 — `media.captured` emit point (the frozen-route workaround)

**Decision** — emit `media.captured` from **`writeCapturedProof`** (queries.ts), after the batch
write succeeds and only when `input.mediaUrl` is present. **Not** from `src/app/c/[token]/actions.ts`
(FROZEN — FR-017). `writeCapturedProof` is already this slice's basis touch point, the proofId +
mediaKey are known there, and the route stays byte-untouched. Best-effort: a failed emit leaves
`media_status='captured'` (safe; re-triggerable).

---

## D8 — Inngest re-sync on every redeploy (Bristle mitigation)

**Decision** — the worker **auto-syncs on boot** (registers its functions with Inngest when the serve
endpoint starts) AND exposes a **/health** endpoint that reports registration state. The provisioning
runbook makes "verify functions registered after deploy" a **mandatory step** (SC-008). The failure
mode is explicit: after a redeploy, functions can silently fail to register → events fire, nothing
runs, the worker looks up. The health check catches it.

---

## D9 — Worker schema-sharing *(FLAGGED — confirm at /speckit-tasks)*

The worker writes `proof.normalized_media_url` / `media_status` and reads `capture_request`. It needs
the table definitions. `src/db/schema.ts` is the single source of truth but imports
`import type { AdapterAccountType } from "next-auth/adapters"` (type-only).

| Option | Approach | Implication |
|--------|----------|-------------|
| A *(recommended)* | Worker imports the **shared `src/db/schema.ts`**; Railway builds from the **repo-root context** (`worker/Dockerfile`); `next-auth` added as a worker **type-only devDep** (erased at runtime) | Single schema source — **no drift** (P-VI). The type devDep is host-side and erased; app's 11 runtime deps untouched. Standard "one repo, one service subdir" Railway pattern. |
| B | Worker declares a **minimal local Drizzle schema** for just the 3 tables it touches | No cross-dir build context, no next-auth; but **schema drift risk** (two declarations of `proof`) — violates the spirit of P-VI. |
| C | Worker uses **raw SQL** for its few writes | Smallest dep surface; but conflicts with P-X (Drizzle-only) and loses type safety. |

**Recommendation**: **A** — shared schema import, Railway root-context build, next-auth type-only
devDep. Confirm the build-context detail at /speckit-tasks (it's the one real implementation fork).

---

## D10 — Provisioning runbook (app env vs worker env; T6 pattern)

**Decision** — document in `.env.example` (app block) + `worker/.env.example` (worker block); build
green without any of it. See contracts/worker-host.md for the step-by-step.

- **App (Vercel)**: `INNGEST_EVENT_KEY`, `INNGEST_EVENT_API_URL` (the fetch-emit target). Existing
  `DATABASE_URL` / `R2_*` / `AUTH_*` unchanged.
- **Worker (Railway)**: `INNGEST_SIGNING_KEY` (serve), `R2_*`, `DATABASE_URL`, `AUTH_RESEND_KEY` +
  `AUTH_EMAIL_FROM` (the `request.created` send reuses the shared Resend helper). ffmpeg in the image.
- **Per-workspace webhook secret**: app-generated (not env); shown on the honest config surface.
- **Re-sync verify**: after each Railway deploy, confirm the Inngest functions registered (D8 / SC-008).
