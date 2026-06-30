# Implementation Plan: T7.4 — Ingest + normalize worker + generic inbound webhook

**Branch**: `T7.4-ingest-normalize-webhook` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T7.4-ingest-normalize-webhook/spec.md`

## Summary

The first **two-deployable** slice. The capture funnel becomes automatic and the verified stamp earns
itself from a real (medium) transaction — via the **unchanged** T7.5 forward contract.

- **Vercel app** gains: a generic inbound **webhook route** (per-workspace shared secret, idempotent),
  a **`fetch`-emit helper** to the Inngest Event API (no SDK → app stays **11 deps**), additive schema
  (`media_status` + `normalized_media_url` on proof; `transaction_verified_at` on capture_request;
  `webhook_endpoint` + `webhook_event` tables), the per-workspace secret generation, and a **minimal
  honest** webhook-URL/secret surface (real, authenticating).
- **Railway worker** (new deployable, `worker/`) gains: the **Inngest serve endpoint + functions**
  (`request.created` → orchestrated Resend send; `media.captured` → **ffmpeg normalize**), idempotency
  keyed on `media_status`, and a **re-sync-on-redeploy** step (the Bristle mitigation). ffmpeg +
  Inngest SDK are **worker-side** deps.

Cores frozen (P-V): `/c/[token]`, the token model, and the T7.5 resolver are untouched. The medium
basis is a **data write** (in `writeCapturedProof`), not a resolver change. The `media.captured` event
is emitted from `writeCapturedProof` (queries.ts) so the frozen capture route never changes.

## Technical Context

**Language/Version**: TypeScript (strict). App: Next.js 15 / React 19 (Vercel). Worker: Node (Railway,
containerized).

**Primary Dependencies**:
- **App** — Drizzle/Neon, `aws4fetch` (R2), plain `fetch` for Inngest Event API + Resend. **No new app
  dependency** (stays 11). Inngest events emitted via the Event API, not an SDK.
- **Worker** (host-side, separate `worker/package.json`) — `inngest` (SDK + serve), `drizzle-orm` +
  `@neondatabase/serverless` (DB), `aws4fetch` (R2), a minimal HTTP server for the serve+health
  endpoints, **ffmpeg** (system binary in the worker image). `next-auth` as a **type-only devDep** iff
  the worker imports the shared schema (see research D9).

**Storage**: Neon Postgres (shared by app + worker). Cloudflare R2 (shared). Migrations in `./drizzle`
(latest `0009`; this slice adds **`0010`**, additive).

**Testing**: type-check + `npm run build` (app) green without infra; live-path verification via the
provisioning runbook + quickstart (webhook → mint → medium stamp; capture → normalize). Worker has its
own build/typecheck.

**Target Platform**: Vercel (app, serverless) + Railway (worker, long-running container). Media work
**never** on Vercel (4 GB / time / bundle limits).

**Project Type**: Web app + a sibling worker deployable in the same repo (`worker/`).

**Performance Goals**: webhook responds fast (mint + emit; the send/normalize are async). Normalize is
bursty; Railway sleep-on-idle fits. ffmpeg caps at ≤1080p to bound worker memory/time.

**Constraints**: app stays **11 deps**; `/c/[token]` untouched; token model + T7.5 resolver unchanged;
additive migration only; idempotency on both layers; Inngest functions re-sync on every redeploy.

**Scale/Scope**: one webhook route, one emit helper, 2 new tables + 3 additive columns + 1 enum, one
worker with 2 Inngest functions, one honest config surface.

## Constitution Check

*GATE: PASS before Phase 0; re-checked after Phase 1 (unchanged — still PASS).*

- [ ] **Customer is the headline (P-II)**: N/A — no proof-surface layout change. The only visible
      effect is the (now earned, medium) verified stamp lighting up via the unchanged resolver.
- [x] **Locked stack (P-III)**: PASS — Inngest is in the locked stack (CLAUDE.md §3) and is finally
      wired; Railway is the sanctioned worker host (T8 precedent). **App stays 11 deps** (Event-API
      emit, no SDK); ffmpeg + Inngest SDK are worker/host-side. No unsanctioned dependency.
- [x] **Pressroom tokens (P-IV)**: PASS — the webhook-config surface uses on-token styling; persimmon
      stays scarce (only the verified stamp).
- [x] **Port, don't redesign (P-V)**: PASS — `/c/[token]`, the `capture_request` token model, and the
      T7.5 resolver/`verification.ts`/`qualifyingBasisExpr` are **unchanged**. Touch points enumerated
      (below); STOP-and-surface if a core needs a real change. No designed webhook-config screen
      exists → that surface is a documented derived state (P-XII).
- [x] **Fixtures-first (P-VI)**: PASS — additive columns/tables shaped like the real schema; build/seed
      green without live infra. New-captures-only (no fixture media to normalize).
- [x] **Consent (P-VII)**: PASS — unchanged and still necessary; a medium basis never verifies a
      non-consented proof; the webhook never bypasses `/c/[token]` consent capture.
- [ ] **No editor (P-VIII)**: N/A — no studio surface.
- [x] **SDD scope (P-IX)**: PASS — generic spine only; native OAuth connectors deferred (Sources
      track); no speculative connector code.
- [x] **Ambiguity (P-XII)**: PASS — the no-designed-config-surface gap is a documented derived state;
      the genuinely-open build decisions (worker topology/schema-sharing) are surfaced in research, not
      invented.
- [x] **Port-completeness (P-XIII)**: PASS — the webhook secret is **real and authenticating** (no
      decorative/dead control); deferred native connectors stay honest "coming" states.
- [x] **Owned data only (P-XIV / FR-019)**: PASS — a **medium** basis is written ONLY when real
      transaction evidence is present; manual/no-evidence stays weak. "Generic webhook live, native
      OAuth coming" stated honestly; nothing implies Shopify-native works.
- [ ] **Plan-not-code (P-XV)**: N/A — normalize is **media prep, not composition**; the render engine
      is T8. No runtime plan.
- [ ] **No-LLM-in-render (P-XVI)**: N/A — no render; normalization is deterministic ffmpeg.

**Touch points (P-V enumeration — additive only; STOP if a core needs real change):**

| File / area | Change | Core? |
|---|---|---|
| `src/db/schema.ts` | + `media_status` enum, `proof.normalized_media_url`, `proof.media_status`, `capture_request.transaction_verified_at`, `webhook_endpoint` + `webhook_event` tables, `"webhook"` in `SOURCE_KINDS` | additive |
| `./drizzle/0010_*.sql` | additive migration | additive |
| `src/db/queries.ts` → `writeCapturedProof` | basis branch (medium iff `capture_request.transaction_verified_at` set, else weak) + emit `media.captured` when `mediaUrl` present; set `media_status='captured'` | extends a T7.5 touch point |
| `src/db/queries.ts` → `createCaptureRequest` | + additive `transactionVerifiedAt?` opt | additive |
| `src/db/queries.ts` (new) | webhook endpoint/secret CRUD, idempotency ledger, `ensureWebhookSource`, `mintFromWebhook` | additive |
| `src/lib/inngest-emit.ts` (new) | `fetch`-emit to Inngest Event API | additive |
| `src/app/api/ingest/route.ts` (new) | the webhook route | additive |
| webhook-config surface (new) | honest URL+secret spot | additive |
| `worker/**` (new) | the Railway deployable | new |
| **`src/app/c/[token]/**`** | **UNTOUCHED** | **FROZEN** |
| **`src/lib/verification.ts`, `qualifyingBasisExpr`, consent model, token columns** | **UNTOUCHED** | **FROZEN** |

**Definition of done**: build green (app + worker) without infra; the live webhook+worker paths verify
with provisioned Inngest/Railway; idempotent on both layers; re-sync verified; cores byte-stable.

## Project Structure

### Documentation (this feature)

```text
specs/T7.4-ingest-normalize-webhook/
├── plan.md
├── research.md          # Phase 0 — D1–D10 (topology, event flow, failure semantics, the 1 flagged)
├── data-model.md        # Phase 1 — 2 tables + 3 columns + 1 enum; the medium-basis bridge
├── quickstart.md        # Phase 1 — provisioning runbook + live verify (webhook→stamp; capture→normalize)
├── contracts/
│   ├── webhook-inbound.md       # route, auth (secret), payload, idempotency, responses
│   ├── inngest-events.md        # event names/payloads + the 2 worker functions + failure/retry
│   └── worker-host.md           # Railway topology, repo layout, schema-sharing, re-sync, provisioning
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── api/ingest/route.ts          # NEW — generic inbound webhook (Vercel)
│   └── c/[token]/**                 # FROZEN — untouched
├── lib/
│   └── inngest-emit.ts              # NEW — fetch-emit to the Inngest Event API (no SDK)
├── db/
│   ├── schema.ts                    # + tables/columns/enum (additive); "webhook" in SOURCE_KINDS
│   ├── migrations (./drizzle)/0010_*.sql
│   └── queries.ts                   # webhook CRUD/idempotency/mint; writeCapturedProof basis+emit
└── (webhook-config surface)         # NEW — minimal honest spot (dev/styleguide + trigger area)

worker/                              # NEW — the Railway deployable (separate package)
├── package.json                     # inngest, drizzle, @neondatabase/serverless, aws4fetch, http server
├── Dockerfile                       # node + ffmpeg (apt); build context = repo root (schema import)
├── src/
│   ├── index.ts                     # HTTP server: Inngest serve endpoint + /health
│   ├── inngest.ts                   # Inngest client + function registration (re-sync on boot)
│   ├── functions/
│   │   ├── request-created.ts       # orchestrated Resend send (retry-safe)
│   │   └── media-captured.ts        # ffmpeg normalize (idempotent on media_status)
│   └── normalize.ts                 # ffmpeg invocation (video cap+re-encode+rotation; photo resize)
└── (imports ../src/db/schema.ts as the single schema source — research D9)
```

**Structure Decision**: One repo, two deployables. The app ships to Vercel (unchanged build). The
worker is `worker/` — Railway builds it from the **repo root context** (so it can import the shared
`src/db/schema.ts`, the single schema source) via a `worker/Dockerfile`. The app never imports any
worker code or the Inngest SDK (the dep boundary is structural, not conventional).

## Phase 0 — Research (decisions)

See [research.md](./research.md). D1–D10:

- **D1 — two-deployable topology**: exactly what ships to Vercel vs Railway; the structural dep
  boundary (app emits via Event API; SDK+ffmpeg on worker).
- **D2 — event flow + failure/idempotency at every hop** (webhook secret → idempotency ledger → mint →
  emit; capture → media.captured → normalize → media_status).
- **D3 — per-workspace secret model** (`webhook_endpoint`, plain high-entropy token, constant-time
  validate, regenerable; the real authenticating secret per D2-spec).
- **D4 — webhook idempotency** (`webhook_event` ledger; caller `event_id` or derived key).
- **D5 — the medium-basis bridge** (webhook sets `capture_request.transaction_verified_at`;
  `writeCapturedProof` writes medium/webhook basis; resolver UNCHANGED).
- **D6 — normalize scope + idempotency** (video ≤1080p H.264/AAC + rotation; photo resize; audio
  deferred; deterministic output key; act only on `captured`/`normalizing`).
- **D7 — `media.captured` emit point** (from `writeCapturedProof`, NOT the frozen route).
- **D8 — re-sync on redeploy** (auto-sync on boot + /health registration check).
- **D9 — worker schema-sharing** (FLAGGED — shared `schema.ts` import + next-auth type devDep, vs
  worker-local minimal schema; recommend shared; confirm at /speckit-tasks).
- **D10 — provisioning runbook** (app env vs worker env; Inngest + Railway setup; the T6 pattern).

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — `webhook_endpoint`, `webhook_event`, `media_status` enum, the
  proof + capture_request additive columns, and the medium-basis state bridge.
- [contracts/webhook-inbound.md](./contracts/webhook-inbound.md) — route, secret auth, generic payload,
  idempotency, response codes (no workspace disclosure).
- [contracts/inngest-events.md](./contracts/inngest-events.md) — `request.created` + `media.captured`
  payloads, the two worker functions, retry/idempotency semantics.
- [contracts/worker-host.md](./contracts/worker-host.md) — Railway topology, repo layout, schema
  sharing, ffmpeg, the re-sync step, and the provisioning runbook.
- [quickstart.md](./quickstart.md) — provision → POST a webhook event → verify mint + medium stamp →
  capture media → verify normalize → idempotency + re-sync checks.

## Complexity Tracking

*No constitution violations. The two-deployable topology is inherent to the slice (media work cannot
run on Vercel — P-III). The one genuinely-open build decision (worker schema-sharing, D9) is surfaced
for confirmation at /speckit-tasks, not invented — recommend the shared-schema import.*
