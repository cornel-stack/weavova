---
description: "Task list — T7.4 Ingest + normalize worker + generic inbound webhook"
---

# Tasks: T7.4 — Ingest + normalize worker + generic inbound webhook

**Input**: Design documents from `specs/T7.4-ingest-normalize-webhook/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D10), data-model.md, contracts/ (webhook-inbound,
inngest-events, worker-host), quickstart.md

**Tests**: No test-runner in the demo tiers. Validation = quickstart scenarios + explicit gates
(Phase 7). Worker DoD = build-green + provisioning/registration (live verify is Cornel's real-infra
walk, like T6 Resend/Google).

**Organization**: Foundational = schema/migration + the emit helper + secret/ledger model (blocks the
stories). US1 (webhook mint) and US2 (medium stamp) are the **app-only MVP** (no worker needed to
demonstrate). US3 (the Railway worker) is the second deployable. Phases 6–8 = provisioning runbook,
explicit gates, polish/DoD.

**Settled inputs (do not re-open)**: D9 = worker shares the single `src/db/schema.ts` via a **type-only
`next-auth` devDep** (compile-time only, no runtime worker dep → schema-drift impossible); Railway
builds from **repo-root context** (not `worker/`). App emits Inngest via `fetch` to the Event API (no
SDK → **app stays 11 deps**); SDK + ffmpeg are **worker-side**. Migration 0010 additive only. Cores
frozen: `/c/[token]`, token model, T7.5 resolver. Generic webhook live / native OAuth deferred.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no incomplete dependency)
- **[Story]**: US1 / US2 / US3 (Setup/Foundational/Provisioning/Gates/Polish carry no story label)

---

## Phase 1: Setup

- [X] T001 Confirm baseline: `./drizzle` latest is `0009`; **app `package.json` has exactly 11 runtime
      deps** (record them — the boundary to defend); `.env.local` has `DATABASE_URL` + `R2_*`. So the
      next `db:generate` emits a single additive `0010`. (P-III dep boundary)

**Checkpoint**: baseline clean.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the additive schema + the shared emit helper + the secret/ledger model. **Blocks US1, US2,
US3.**

- [X] T002 `src/db/schema.ts` (additive, per data-model.md): add `media_status` pgEnum
      (`captured`/`normalizing`/`normalized`/`failed`); add `proof.normalized_media_url` (text) +
      `proof.media_status` (`media_status`, nullable); add `capture_request.transaction_verified_at`
      (timestamptz, nullable); add `webhook_endpoint` (unique `workspace_id`, unique `secret`) +
      `webhook_event` (unique `(workspace_id, event_key)`) tables; add `"webhook"` to `SOURCE_KINDS`.
      `mediaUrl` + token columns UNCHANGED. (P-VI; P-V additive)
- [X] T003 Generate migration: `npm run db:generate` → **review `./drizzle/0010_*.sql` is ADDITIVE
      ONLY** — 1 `CREATE TYPE`, `ADD COLUMN`s, 2 `CREATE TABLE` + unique indexes; **no** `DROP`, no
      token/resolver/consent change. STOP and surface if anything non-additive. (hard gate; P-IX)
- [X] T004 Apply: `npm run db:migrate` (additive, shared Neon). Confirm the new columns/tables exist.
      (P-VI)
- [X] T005 [P] `src/lib/inngest-emit.ts` (NEW): `emitInngest(name, data)` — `fetch` POST to the Inngest
      Event API; lazy `INNGEST_EVENT_KEY` / `INNGEST_EVENT_API_URL`; **best-effort** (a failed emit
      never throws to the caller); **NO Inngest SDK** (app stays 11). (P-III dep boundary;
      contracts/inngest-events.md)
- [X] T006 `src/db/queries.ts` (NEW functions): `ensureWebhookSource(ws)` (get/create a `webhook`
      source); `getOrCreateWebhookEndpoint(ws)` (generate a **high-entropy** secret, one per workspace);
      `getWorkspaceBySecret(secret)` (unique-index lookup, **constant-time** compare → workspace);
      `findWebhookEvent(ws, eventKey)` + `recordWebhookEvent(ws, eventKey, requestId)` (the idempotency
      ledger). Real, authenticating secret (P-XIII); data-model.md / D3 / D4.
- [X] T007 `src/db/queries.ts`: `createCaptureRequest` gains an **additive** `transactionVerifiedAt?`
      opt, written to `capture_request.transaction_verified_at`. Token model UNCHANGED. (D5; P-V)

**Checkpoint**: schema + emit + secret/ledger exist; app builds green; no surface uses them yet.

---

## Phase 3: User Story 1 — The universal door (Priority: P1) 🎯 MVP

**Goal**: a secret-validated event mints a `capture_request` through the existing primitive; the merchant
can get their webhook URL + real secret.

**Independent Test**: POST a valid event → one 72h single-use `capture_request` (+ `customer_email`);
its `/c/[token]` resolves identically to a T7.3 request (zero `/c` edits); bad secret → 401 generic;
duplicate `event_id` → same request, no second mint. (quickstart Scenarios 1–2)

- [X] T008 [US1] `src/app/api/ingest/route.ts` (NEW): `POST` — validate secret via
      `getWorkspaceBySecret` (missing/invalid → **401 generic**, no workspace disclosure); parse the
      generic payload (`customer_email` required → 400 else); idempotency (`eventKey = event_id` or
      derived; ledger hit → return existing request, **no second mint**); mint via `createCaptureRequest`
      (set `transactionVerifiedAt` when `transaction_verified`/`_at` present — feeds US2);
      `recordWebhookEvent`; `emitInngest('request.created', …)`; respond **202** `{request_id,
      capture_url, duplicate}`. **Zero vendor-specific code.** (contracts/webhook-inbound.md; P-XIV/P-XIII)
- [X] T009 [US1] The honest webhook-config surface (minimal spot — the dev/styleguide data surface +
      the request-builder trigger area): show the workspace's **REAL** webhook URL +
      `getOrCreateWebhookEndpoint` secret; generic webhook = **live**, native Shopify/Stripe/Calendly =
      honest **"coming"** (existing banners unchanged). The secret genuinely authenticates (no
      decorative/dead control — P-XIII); on-token styling, persimmon scarce (P-IV). (Decision 2)
- [X] T010 [US1] Verify quickstart **Scenarios 1–2**: valid POST → 202 + minted request + `/c/[token]`
      identical to T7.3; bad secret → 401 generic; duplicate `event_id` → same request, no second mint.
      (SC-001/002/004)

**Checkpoint**: the funnel is automatic — requests mint from external events. (MVP part 1.)

---

## Phase 4: User Story 2 — The first earned (medium) verified stamp (Priority: P1)

**Goal**: a webhook event with transaction evidence makes the eventual consented proof earn a **medium**
stamp — via the **unchanged** T7.5 resolver.

**Independent Test**: webhook with `transaction_verified:true` → capture at `/c/[token]` (granted
consent) → proof shows the stamp (medium); a manual/no-evidence path → weak, no stamp; `verification.ts`
diff is **empty**. (quickstart Scenario 3)

- [X] T011 [US2] `src/db/queries.ts` → `writeCapturedProof`: read the `capture_request`
      `{transactionRef, transactionVerifiedAt}` by `requestId`; basis branch — `transactionVerifiedAt`
      present → `{source:'webhook', strength:'medium', transactionVerifiedAt, transactionRef}`; else →
      `{source:'manual', strength:'weak'}` (today's behaviour). **`verification.ts` /
      `qualifyingBasisExpr` / resolver UNTOUCHED.** (D5; P-XIV no over-claim; P-V)
- [X] T012 [US2] Verify quickstart **Scenario 3**: webhook+evidence → capture → **medium stamp**;
      manual/no-evidence → no stamp; `git diff src/lib/verification.ts` **empty** (resolver-untouched
      gate). (SC-003)

**Checkpoint**: the verified moat earns itself from a real transaction — resolver unchanged. (MVP part 2.)

---

## Phase 5: User Story 3 — The normalize worker on Railway (Priority: P2)

**Goal**: stand up the Railway worker (first service; T8 = second later); normalize captured media;
orchestrate the send. Idempotent + retry-safe.

**Independent Test**: a captured video → `media.captured` → worker normalizes → `normalized_media_url` +
`media_status='normalized'`; re-deliver → no-op; corrupt media → `failed`, original retained. (quickstart
Scenario 4)

- [X] T013 [US3] `worker/package.json` (NEW, separate deployable): deps `inngest` (serve+SDK),
      `drizzle-orm` + `@neondatabase/serverless`, `aws4fetch`, a minimal HTTP server; **`next-auth` as a
      type-only devDep** (compile-time only, for the shared-schema import — no runtime worker dep). These
      are **host-side**, NOT app deps. (D1/D9; P-III dep boundary)
- [X] T014 [US3] `worker/Dockerfile` (NEW): node base + `apt-get install ffmpeg`; **build context = REPO
      ROOT (root, not `worker/`)** so the worker imports the **shared `../src/db/schema.ts`** (single
      source — drift impossible); start the HTTP server. (D9; contracts/worker-host.md)
- [X] T015 [US3] `worker/src/inngest.ts` + `worker/src/index.ts`: the Inngest client; an HTTP server
      hosting the Inngest **serve endpoint** (`/api/inngest`) + a **`/health`** endpoint reporting
      registration; **auto-sync functions on boot** (re-register on every start). (D8; contracts)
- [X] T016 [US3] `worker/src/functions/media-captured.ts`: **idempotency gate** — act only if
      `media_status ∈ {captured, normalizing}`, **skip `normalized`** (no-op); claim `normalizing`; pull
      the R2 object; call `normalize.ts`; write the normalized object to the **deterministic key**; update
      proof `normalized_media_url` + `media_status='normalized'`. **Failure** → `media_status='failed'`,
      **original `mediaUrl` retained**, no partial `normalized_media_url`, throw (Inngest records;
      bounded retries; no crash loop). (D6; FR-013; SC-005/009)
- [X] T017 [US3] `worker/src/normalize.ts`: ffmpeg via `child_process` — **video**: cap ≤1080p long
      edge + re-encode H.264/AAC MP4 + **bake rotation**; **photo**: resize/re-encode; **audio**: skip
      (deferred). Deterministic output key `capture/{ws}/{proofId}/normalized.mp4`. (D6; D1)
- [X] T018 [US3] `worker/src/functions/request-created.ts`: orchestrated Resend send — reuse the shared
      `composeCaptureRequestEmail` + `sendCaptureRequestEmail` (`src/lib/resend.ts`); record
      `request_send`; retry-safe (skip if already `accepted`). Worker env `AUTH_RESEND_KEY`/
      `AUTH_EMAIL_FROM`. (contracts/inngest-events.md)
- [X] T019 [US3] `src/db/queries.ts` → `writeCapturedProof`: set `media_status='captured'` on the proof
      insert when `mediaUrl` present; after the batch, **emit `media.captured`** via `emitInngest` (only
      when `mediaUrl` present). **NOT** in `src/app/c/[token]/**` (D7; FR-017). (same file as T011 —
      sequential)
- [X] T020 [US3] Worker build-green: `cd worker && npm install && npm run build` (typechecks against the
      shared schema). (worker DoD — build green; live verify is Phase 6.)

**Checkpoint**: media normalizes; the host is ready for T8 as a second service.

---

## Phase 6: Provisioning Runbook (Cornel-owned — the T6 pattern)

**Purpose**: the hands-on infra setup. Build stays green without it; the webhook+worker **live paths**
are the verify-with-real-infra part.

- [X] T021 `.env.example` (app block) + `worker/.env.example` (worker block): document **App**
      `INNGEST_EVENT_KEY`, `INNGEST_EVENT_API_URL`; **Worker** `INNGEST_SIGNING_KEY`, `R2_*`,
      `DATABASE_URL`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` — each with the "CORNEL-OWNED; build green
      without it" note. (D10; T6 pattern)
- [X] T022 Provisioning (Cornel): create the Inngest app → **event key** (set on Vercel) + **signing
      key** (set on Railway); create the Railway service (`worker/Dockerfile`, **repo-root context**) +
      set the worker env; **deploy the worker REACHABLE FIRST, then register** its serve endpoint with
      Inngest; verify functions registered. ffmpeg is in the worker image (host dep, not app).
      (contracts/worker-host.md)
- [X] T023 **MANDATORY re-sync-on-redeploy verify** (SC-008): after **every** Railway deploy, confirm the
      Inngest functions re-registered (`/health` + the Inngest dashboard). A stalled sync = events fire,
      nothing runs (the Bristle cron-stall). **Non-optional.** (D8)

**Checkpoint**: live infra provisioned; functions serving; re-sync verified.

---

## Phase 7: Gates (explicit — cores frozen, dep boundary, idempotency)

- [X] T024 [P] **Cores-frozen gate (P-V)**: confirm **zero** changes under `src/app/c/[token]/**`; the
      `capture_request` token/expiry/single-use/status columns unchanged; `src/lib/verification.ts`,
      `qualifyingBasisExpr`, and the consent model unchanged. **STOP and surface** if any. (FR-017/018/019)
- [X] T025 [P] **Resolver-untouched diff (SC-003)**: `git diff src/lib/verification.ts` empty — the
      medium stamp lit purely via the data write.
- [X] T026 [P] **App-11-deps + ffmpeg-worker-only (SC-006)**: app `package.json` still **11** runtime
      deps (no `inngest`, no ffmpeg/`fluent-ffmpeg`); grep confirms ffmpeg + the Inngest SDK appear
      **only** under `worker/`. (P-III dep boundary)
- [X] T027 **Idempotency gate — both layers** (SC-004; FR-005/013): duplicate webhook (same `event_id`)
      → one `capture_request` (ledger); a retried `media.captured` on a `normalized` proof → no-op, same
      deterministic key, **no duplicate object**.
- [X] T028 **Normalize failure gate** (SC-009): corrupt media → `media_status='failed'`, **original
      `mediaUrl` retained**, no `normalized_media_url`, no crash loop.

**Checkpoint**: frozen cores proven untouched; the dep boundary and both idempotency layers enforced.

---

## Phase 8: Polish, Cross-Cutting & Definition of Done

- [X] T029 [P] Honesty audit (P-XIV/P-XIII): generic webhook = live; native triggers stay honest
      "coming"; the config-surface secret is **real + authenticating**, not decorative; **medium basis
      only on real evidence** (no fabricated verification).
- [X] T030 [P] Microcopy (P-XVII): webhook-config / 401 / "coming" copy is plain — no hype, no emoji.
- [X] T031 [P] Pressroom token audit (P-IV) on the config surface; persimmon only on the verified stamp.
- [X] T032 App: `npm run lint && npm run build` green (TS strict; no `any`). Worker: `npm run build`
      green. (DoD)
- [X] T033 Run `quickstart.md` end-to-end against provisioned infra (Scenarios 1–5) — Cornel's
      real-infra verify. (DoD)

> **P-XV / P-XVI**: N/A — normalize is media prep, not composition; no render in this slice.
> **Flagged decision D9**: resolved — shared `src/db/schema.ts` import + type-only `next-auth` devDep;
> Railway repo-root build context.

**Definition of done**: app + worker build green without infra; the additive migration applied; the
webhook mints + the medium stamp lights via the unchanged resolver; the worker normalizes idempotently;
re-sync verified; cores byte-stable; app deps still 11. Then **STOP and report** — do not advance until
the human says so (P-IX).

---

## Dependencies & Execution Order

### Phase order

- **Setup (T001)** → **Foundational (T002–T007)** blocks all → **US1 (T008–T010)** → **US2 (T011–T012)**
  → **US3 (T013–T020)** → **Provisioning (T021–T023)** → **Gates (T024–T028)** → **Polish (T029–T033)**.
- US1 and US2 are the **app-only MVP** (demonstrable on real infra without the worker — the mint is
  durable, the medium stamp is data-driven). US3 (the worker) is the second deployable; the orchestrated
  send (`request.created`) and normalize (`media.captured`) run there.

### Within Foundational

- T002 → T003 (generate) → T004 (apply), sequential (schema → migration). T005 (emit helper) is [P]
  (own file). T006, T007 are in `queries.ts` (sequential with each other; precede US1/US2).

### Cross-story same-file note

- T011 (US2 basis branch) and T019 (US3 `media.captured` emit + `media_status='captured'`) both edit
  `writeCapturedProof` in `src/db/queries.ts` — **sequential**, not [P].

### Parallel opportunities

- T005 (emit helper) ∥ the schema work. Worker files T015/T016/T017/T018 are largely independent within
  US3 (different files) once T013/T014 exist. Gates T024/T025/T026 are [P]; polish T029/T030/T031 are [P].

---

## Implementation Strategy

### MVP (Foundational + US1 + US2 — app-only)

1. T001 → T002–T007 (schema + emit + secret/ledger).
2. T008–T010 (webhook mints) + T011–T012 (medium stamp).
3. **STOP and validate** on provisioned Inngest (emit) + DB: a webhook event mints a request and an
   evidenced event earns a medium stamp — **resolver-untouched**. The funnel is automatic and the moat
   earns itself, before the worker exists.

### Incremental

- Add US3 (the Railway worker) → normalize + orchestrated send.
- Run the provisioning runbook (Phase 6) + gates (Phase 7) + polish (Phase 8) → DoD → STOP and report.

## Notes

- [P] = different files, no incomplete dependency. The `queries.ts` edits (T006/T007/T011/T019) are NOT
  [P] (one file).
- The app's 11-dep boundary is **structural** — the Inngest SDK and ffmpeg live only under `worker/`.
- Build stays green throughout: additive migration first, app webhook/emit/secret next, then the worker
  (separate package), then the bridge emit, then gates.
