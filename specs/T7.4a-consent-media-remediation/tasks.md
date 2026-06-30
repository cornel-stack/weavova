---
description: "Task list — T7.4a Consent-Media Remediation"
---

# Tasks: T7.4a — Consent-Media Remediation

**Input**: Design documents from `/specs/T7.4a-consent-media-remediation/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D8; D6/D7 resolved below), data-model.md,
contracts/{r2-bucket-routing,withdrawal-cascade,presign-read}.md, quickstart.md

**Tests**: No automated test runner in the demo tiers (plan.md → Testing). Validation = the
quickstart.md scenarios + the explicit gates below, run as Cornel's real-infra walk wherever R2 is
involved. **No test tasks are generated** (none requested; consistent with the slice).

## Resolved decisions carried into these tasks (do not re-open)

- **D6 → A, made ATOMIC** (orphan race): `markNormalized` becomes a **single consent-gated
  conditional UPDATE** — `UPDATE proof SET normalized_media_url=…, media_status='normalized' WHERE
  id=:proofId AND <effective-consent-granted>` — returning a row count. **1 row** → persisted. **0
  rows** (consent withdrawn during ffmpeg) → the worker **deletes the just-produced normalized object**
  from the captures bucket, sets terminal `media_status='failed'` (reuse the existing enum — **no
  migration**; a dedicated `'withdrawn'` value is deferred), and does **NOT** persist
  `normalized_media_url`. No read-then-write window — the cascade is airtight under concurrency; the
  worker's own output is subject to it. The WHERE predicate MUST match `src/db/queries.ts`
  `effectiveConsentState` exactly (canonical pair, F5).
- **D7 → reuse** the existing **account-scoped R2 token** for both buckets (no new credential setup);
  separate per-bucket least-privilege tokens are noted future hardening, not this slice.
- **Bucket topology**: PUBLIC brand-assets bucket (existing, `media.weavova.com` /
  `R2_PUBLIC_BASE_URL` — UNCHANGED) + **NEW PRIVATE** captures bucket (`R2_CAPTURES_BUCKET`, **no**
  public domain, presigned-GET reads only). Customer media is private **by construction**.

## Constitution tags

**P-VII** (central — revocation cascades to the FILE) · **P-V** (cores frozen, enumerated touch
points) · **P-XIV** (honest state; `media_status` + failure contract preserved) · **P-III/FR-016**
(no new dep; app stays 11) · **P-XV/P-XVI**: N/A (non-render slice).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different file, no dependency on an incomplete task)
- **[Story]**: US1 (withdrawal removes footage) · US2 (private storage + worker fetch) · US3
  (mediated read) · US4 (brand regression guard)

---

## Phase 1: Setup (env + provisioning — Cornel-owned; build green without)

**Purpose**: Make the new private bucket addressable in config. **No schema migration** — the
`proof.media_url` / `proof.normalized_media_url` columns already exist (T7.4); this slice changes the
value form (key, not URL) and the bucket, not the schema.

- [X] T001 [P] Document the new env var `R2_CAPTURES_BUCKET` in the app env reference (`.env.example`
      or the project's env doc) and in the worker env reference; record the provisioning delta in
      `specs/T7.4a-consent-media-remediation/quickstart.md` (already drafted) — Cornel creates the
      SECOND private R2 bucket (NO public domain / no r2.dev URL) and sets `R2_CAPTURES_BUCKET` on
      app `.env.local`, Vercel, and the Railway worker; existing `R2_*` + `R2_PUBLIC_BASE_URL`
      unchanged; the existing account-scoped token covers both buckets (D7). **(P-III: bucket =
      config, not a library.)**

**Checkpoint**: env name exists; app + worker still build green without the bucket provisioned
(lazy config — a missing var throws only when a captures helper is actually called).

---

## Phase 2: Foundational — `r2.ts` two-bucket routing + helpers (BLOCKS all stories)

**Purpose**: The single place bucket routing lives. Class-named helpers per object class so the two
classes **cannot cross** (no `bucket` flag to misuse). Contract:
`contracts/r2-bucket-routing.md`. This phase must complete before US1/US2/US3.

**⚠️ CRITICAL**: every store/withdrawal/worker story routes through these helpers.

- [X] T002 [US-shared] Split the lazy config in `src/lib/r2.ts`: keep today's `getConfig` as
      **`getPublicConfig()`** (R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET/`R2_BUCKET`/`R2_PUBLIC_BASE_URL` —
      behaviour UNCHANGED) and add **`getCapturesConfig()`** (same account + creds, `R2_CAPTURES_BUCKET`,
      **no** `publicBaseUrl`). `assetUrlForKey` / `presignPut` keep calling the public config. (P-V:
      `r2.ts` is an enumerated touch point.)
- [X] T003 [US-shared] Add the PRIVATE captures helpers in `src/lib/r2.ts` (after T002, same file):
      `presignCaptureUpload(key, contentType)` (signed PUT → captures), `presignCaptureRead(key)`
      (signed, **expiring** GET → captures; reuse `PRESIGN_TTL_SECONDS = 300`), and
      `deleteCaptureObject(key)` (S3 `DELETE` → captures; a **404 = success**, idempotent). All reuse
      the existing single `aws4fetch` `AwsClient` builder — **no new dep**. `assetUrlForKey` is
      physically unable to address the captures bucket (no public base URL). (FR-006/FR-011; P-III.)
- [X] T004 [P] [US-shared] Route the worker storage at `worker/src/r2.ts` to the captures bucket:
      `getConfig` reads **`R2_CAPTURES_BUCKET`** (was `R2_BUCKET`); `getObject` / `putObject` now
      target captures; **add `deleteObject(key)`** (S3 `DELETE`, 404 = success) for the D6 self-cascade.
      The worker only ever touches customer media, so it points wholly at captures. (FR-004; FR-006.)

**Checkpoint**: routing table (contract §"Routing table") is realized; no path lets brand media reach
captures or customer media reach public. App + worker build green.

---

## Phase 3: User Story 2 — Private storage + the worker fetch works (Priority: P1) 🎯 MVP-critical

**Goal**: Capture persists the **key** (not a public URL); as a direct consequence the normalize
worker fetches the original by key and produces a normalized object. Closes the storage root-cause +
the Finding-2 worker break.

**Independent Test**: Capture a video at `/c/[token]` → `proof.media_url` is a `capture/…` **key**
(no `http`) → run the worker on its `media.captured` event → it fetches the original by key, writes
`normalized_media_url` = a captures key, `media_status='normalized'`, original retained. Corrupt
input → `media_status='failed'`, original retained, no normalized. (Maps quickstart Scenarios 1–2,
SC-001/SC-003.)

- [X] T005 [US2] Capture key-store in `src/app/c/[token]/actions.ts`: import `presignCaptureUpload`;
      at the presign site (currently `presignPut(key, …)`, line ~68) call **`presignCaptureUpload`**
      (captures PUT); in the video branch (currently `mediaUrl = assetUrlForKey(input.mediaKey)`, line
      ~115) persist **`mediaUrl = input.mediaKey`** (the raw KEY). Drop the now-unused `assetUrlForKey`
      / `presignPut` imports from this file. **The `/c/[token]` PAGE UI is untouched** — only the
      action's internals change (it already returns `{ uploadUrl, key }`; the client flow is
      identical). Matches the schema.ts:134 comment ("the captured SOURCE-media R2 key"). (FR-001–003;
      P-V cores frozen — STOP-and-surface if this needs a page edit.)
- [X] T006 [US2] Worker fetch fix in `worker/src/functions/media-captured.ts`: confirm the normalize
      `step.run` fetches via `getObject(mediaKey)` where `mediaKey` is now the captures **key** (from
      T005) against the captures bucket (from T004) — the previously-malformed GET now resolves. The
      **normalize encode logic (`normalizeMedia`) is UNCHANGED**; `markNormalized` keeps writing a
      **key** (`capture/{ws}/{proofId}/normalized.{ext}`), now in captures. Preserve the failure
      contract: on terminal failure `markFailed` → `media_status='failed'`, original retained, no
      normalized key. (FR-004/005; P-XIV.)
- [X] T007 [US2] D6 orphan-race — **atomic** consent-gated write (the cascade reaches the worker's OWN
      output, with no read-then-write window). (a) In `worker/src/db.ts` make `markNormalized` a
      **single conditional UPDATE** that returns the affected row count: `UPDATE proof SET
      normalized_media_url=:normalizedKey, media_status='normalized' WHERE id=:proofId AND
      <effective-consent-granted>`. The WHERE predicate MUST replicate `src/db/queries.ts`
      `effectiveConsentState`/`effectiveConsentGranted` **exactly** (latest consent row by `version`,
      `state='granted'`) — add a **cross-reference comment in BOTH** `worker/src/db.ts` and the
      `effectiveConsentState` definition in `src/db/queries.ts` naming each other as the canonical pair
      (F5; a drift is a P-VII bug). (b) In `worker/src/functions/media-captured.ts` normalize
      `step.run`, after `putObject(normalizedKey)` call the conditional `markNormalized`; if it
      affects **0 rows** (consent withdrawn mid-normalize): `deleteObject(normalizedKey)`, set terminal
      `media_status='failed'` (reuse existing enum — **no migration**), do NOT persist the URL, return
      a `skipped`/`withdrawn` reason. (FR-010; P-VII — worker output subject to withdrawal; P-XIV —
      terminal honest state, not left `normalizing`.)

**Checkpoint**: real captures store keys; the worker fetches by key and normalizes; a withdrawal that
lands mid-encode leaves no orphaned normalized object.

---

## Phase 4: User Story 1 — Withdrawing consent removes the footage (Priority: P1) 🎯 THE P-VII PROOF

**Goal**: Withdrawal cascades to the FILE — the captured + normalized objects are hard-deleted from
the private bucket; the consent record is retained for audit. This is the reason the slice exists.

**Independent Test**: For a proof with media, both objects are fetchable via `presignCaptureRead`
(signed) → withdraw consent → a fetch of either object now returns **not available** (gone from
captures), while `getConsentHistory(proofId)` still returns the full timeline including the `revoked`
version. Text proof (no media) withdrawal → no-op, no error. (Maps quickstart Scenario 3, SC-002.)

- [X] T008 [US1] Withdrawal cascade in `src/db/queries.ts` → `recordConsentWithdrawal(workspaceId,
      proofId)` (additive, line ~1224): **after** the `revoked`-version insert (authoritative — keep
      ordering: revoked write FIRST), read the proof's `media_url` + `normalized_media_url` (both
      keys) and call `deleteCaptureObject` on each present key. Rules from
      `contracts/withdrawal-cascade.md`: **hard delete** (FR-008 — consent record retained, media
      destroyed); **idempotent / no-media-safe** (null keys → no delete; already-gone → no error,
      FR-009); **transient delete failure is LOGGED, not surfaced** — the function STILL returns
      `'recorded'` (the consent record + resolver-hide is the **authoritative gate**; the file delete
      is **best-effort + idempotently retried**, with a residual window on transient R2 failure closed
      by the FR-007a reconcile in T009). Return type unchanged (`{ status: 'recorded' | 'not_granted';
      version? }`). The consent **action** (`src/app/app/consent/actions.ts`) is UNCHANGED — the
      cascade is intrinsic to the data-layer function so no UI path can bypass it. (FR-006–010; P-VII
      CENTRAL — enforced in data, not just UI.)

**Checkpoint**: withdrawing a proof with media destroys both objects; consent history intact. P-VII
holds at the file layer.

---

## Phase 5: User Story 3 — A mediated read path exists (Priority: P2, forward-contract plumbing)

**Goal**: Lock the only sanctioned customer-media read (signed, expiring) so T8 cannot re-introduce a
public-URL read. **No playback is built**; the T7.2 non-playing seam is byte-stable.

**Independent Test**: `presignCaptureRead(key)` returns a time-limited URL that fetches while valid
and is rejected after TTL — never a permanent public URL; the proof-detail media region renders 0
playback elements. (Maps quickstart Scenario 4, SC-005/SC-006. Contract: `contracts/presign-read.md`.)

- [X] T009 [US3] Establish-not-build verification: `presignCaptureRead` (built in T003) is the ONLY
      customer-media read path and has **no live consumer** in this slice. Confirm the proof-detail
      media region (`src/components/app/proof-detail/proof-detail-media.tsx` — the T7.2 seam) is
      **byte-stable**:
      no `<video>`, no `<img>`, no playback control added; honest "media stored · playback coming"
      seam unchanged. Confirm no code path surfaces a permanent public URL for customer media
      (grep: `assetUrlForKey` is never called on a capture key). (FR-011–013; P-XIII honesty.)
- [X] T009a [US3] FR-007a reconcile hook (forward-contract, **no live consumer this slice**): wire
      **delete-if-withdrawn-on-access** into `presignCaptureRead` — when invoked for a **withdrawn**
      proof it re-issues the idempotent `deleteCaptureObject` for the captured + normalized keys (and
      denies/returns "not available") rather than signing a URL. Since US3 builds **no reader**, this
      is real plumbing inside the helper (P-XIII — not a dead control), and it activates when T8's
      consent-gated reader lands; the live reconcile this slice is the worker self-cascade (T007) +
      re-withdrawal idempotency. Shrinks the T008 transient-failure residual without a background
      sweep (full sweep = deferred hardening). (FR-007a; P-VII.)

**Checkpoint**: the read architecture is locked; the seam is unchanged; the helper + its on-access
reconcile await T8's reader.

---

## Phase 6: User Story 4 — Brand assets unchanged (Priority: P2, regression guard)

**Goal**: The two-object-classes split only holds if the brand (public) path is provably untouched.

**Independent Test**: render a brand logo / brand-kit image / brand footage card → loads from its
public URL exactly as before. (Maps quickstart Scenario 5, SC-004.)

- [X] T010 [P] [US4] Brand regression guard: confirm `assetUrlForKey` + `presignPut` + the public key
      builders (`brandAssetKey` / `brandKitLogoKey`) keep targeting the PUBLIC bucket with UNCHANGED
      behaviour, and that the brand callers — `src/app/app/brand/actions.ts` and
      `src/app/app/footage/actions.ts` — are **not edited**. Render a brand logo / brand-kit image /
      footage card and confirm it still loads from its public URL. (FR-014; P-V.)

**Checkpoint**: brand surfaces load from public URLs, 0 regressions.

---

## Phase 7: Backfill verification, gates & Definition of Done

**Purpose**: the live remediation check + the constitution-mandated per-slice gates. Run as Cornel's
real-infra walk where R2/DB is involved (quickstart.md).

- [X] T011 Backfill live-count verify (re-run the plan's DB check immediately before ship): count
      live `/c` captures holding a public URL — `select count(*) from proof where media_url like
      'http%'`. **If 0** (plan verified 15 proofs / 0 with media): **no backfill code**, verification
      only. **If > 0**: convert each `media_url` `http…` → its key form AND note the object physically
      lives in the OLD public bucket — decide per-case per plan (migrate the object to captures, or
      delete it as pre-fix test data). Record the count in the ship notes. (P-VI; data-model.md
      §(Non-)backfill.)
- [X] T012 [P] Cores-frozen audit (P-V): `git diff` shows **0** edits to the `/c/[token]` **page**,
      the `capture_request` token model, `src/lib/verification.ts` / `qualifyingBasisExpr`, the
      consent schema, and the worker `normalizeMedia` **encode** logic. The only touched files are the
      enumerated set: `src/lib/r2.ts`, `src/app/c/[token]/actions.ts`, `src/db/queries.ts`,
      `worker/src/r2.ts`, `worker/src/db.ts`, `worker/src/functions/media-captured.ts`, env/runbook.
      **STOP-and-surface** if any core needed a real change.
- [X] T013 [P] Deps + honesty + no-migration audit: app `package.json` still **11** runtime deps, no
      new dependency (FR-016/P-III); **no migration** — `mediaStatusEnum` is UNCHANGED (the
      withdrawn-mid-normalize path reuses the existing `'failed'` value; a dedicated `'withdrawn'` enum
      value is deferred to a future migration); `media_status` states stay honest and the T7.4 failure
      contract is preserved (P-XIV); no fabricated success/failure from deletion.
- [X] T014 Build gate: `npm run lint && npm run build` (app) green; `cd worker && npm run build`
      green (worker now reads `R2_CAPTURES_BUCKET`).
- [ ] T015 Quickstart live walk (Cornel real-infra, R2 provisioned) — the gates:
      **(a) P-VII proof** — withdraw a proof with media → captured + normalized objects unretrievable;
      consent history intact (SC-002). **(b) Worker fetch** — worker fetches & normalizes a real key
      (SC-003, the Finding-2 fix). **(c) Orphan-race** — withdraw during normalize → no orphaned
      normalized object persists (D6). **(d) Two-class routing** — customer media never lands in the
      public bucket; brand assets never in the private bucket. **(e) Brand regression** — brand render
      still works (SC-004). Run `specs/T7.4a-consent-media-remediation/quickstart.md` end-to-end.

**Definition of done (slice complete only when ALL hold)**: capture stores a key (SC-001); worker
fetches by key and normalizes, failure contract preserved (SC-003); withdrawal hard-deletes both
objects, consent history intact (SC-002, P-VII proof); the orphan race is closed (D6); the
presign-read helper exists and the non-playing seam is byte-stable (SC-005/006); brand assets render
unchanged (SC-004); app + worker build green; app deps still 11 (SC-007); cores byte-stable (SC-008).
Then **STOP and report**; do not advance until the human says proceed (P-IX).

---

## Dependencies & Execution Order

### Phase order (chosen to keep the app build green at every step)

1. **Setup (Phase 1)** — env name only; no code dependency.
2. **Foundational (Phase 2)** — `r2.ts` + worker `r2.ts` helpers/routing. **BLOCKS US1, US2, US3.**
3. **US2 (Phase 3)** — capture key-store + worker fetch + D6. Depends on T002–T004.
4. **US1 (Phase 4)** — withdrawal cascade. Depends on T003 (`deleteCaptureObject`). *Independent of
   US2's worker code — can run in parallel with Phase 3 once Foundational is done.*
5. **US3 (Phase 5)** — mediated-read pattern guard. Depends on T003 (`presignCaptureRead`).
6. **US4 (Phase 6)** — brand regression guard. Depends only on Foundational (T002 must not have
   changed public behaviour). Fully **[P]**.
7. **Phase 7** — backfill verify + gates. After all code phases.

### Critical path

T002 → T003 → (T005 → T006 → T007) and (T008) and (T009 → T009a) → T011–T015.

### Key dependency notes

- **T002 → T003**: same file (`src/lib/r2.ts`), sequential.
- **T005 → T006 → T007**: T006 needs T005's key + T004's bucket routing; T007 edits the same worker
  function as T006 (sequential).
- **T008 (US1)** needs only `deleteCaptureObject` (T003) — not the US2 worker chain; US1 and US2 can
  proceed in parallel after Foundational. *Minor overlap*: T007 (US2) adds a **one-line F5
  cross-reference comment** to `effectiveConsentState` in `src/db/queries.ts`, the same file T008
  edits (different functions) — coordinate the two `queries.ts` touches if run concurrently (trivial,
  non-conflicting).
- **T004, T010** are `[P]` (distinct files; no incomplete-task dependency once Foundational logic is
  settled).

### Parallel opportunities

- **T001** (env doc) ∥ anything.
- After Foundational: **US1 (T008)** ∥ **US2 (T005→T007)** ∥ **US3 (T009→T009a)** ∥ **US4 (T010)**.
- Gate audits **T012 ∥ T013** (read-only, distinct concerns).

---

## Parallel Example: post-Foundational fan-out

```text
# Once T002–T004 land, these run independently:
Task T008 [US1]: withdrawal cascade in src/db/queries.ts
Task T010 [US4]: brand regression guard (render check; no edits expected)
Task T009 [US3]: presign-read pattern guard + byte-stable seam confirm
# US2 runs as its own sequential chain: T005 → T006 → T007
```

---

## Implementation Strategy

### MVP-critical pair (do these first, they are the slice's reason for being)

1. Phase 1 (env) + Phase 2 (Foundational `r2.ts` routing).
2. **US2** (private storage + worker fetch) — unbreaks the worker on real data and stops persisting
   public URLs.
3. **US1** (withdrawal cascade) — the **P-VII proof**. STOP and validate this against real R2
   (quickstart Scenario 3) — it is SC-002, the central success criterion.

### Then the guards

4. **US3** (mediated-read pattern locked; seam byte-stable) and **US4** (brand unchanged) — both are
   guard/forward-contract phases, no new live UI.
5. Phase 7 — backfill verify (expect 0 → verification only), gates, build, and the quickstart live
   walk.

---

## Notes

- `[P]` = different file, no dependency on an incomplete task.
- `[US-shared]` Foundational tasks have no story label per template (they block all stories); marked
  `[US-shared]` only for readability.
- No automated tests (none requested; no runner in the demo tiers) — validation is the quickstart +
  gates.
- **No migration, no new dependency.** Additive env (`R2_CAPTURES_BUCKET`) only.
- Live R2/DB verification (P-VII proof, worker fetch, orphan-race, routing) is Cornel's real-infra
  walk — the app/worker build green without the bucket provisioned.
