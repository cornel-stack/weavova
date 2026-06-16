---
description: "Task list for T2.4a — Derived-Asset Schema, Revocation Cascade & Seed"
---

# Tasks: T2.4a — Derived-Asset Schema, Revocation Cascade & Seed

**Input**: Design documents from `specs/T2.4a-derived-asset-schema/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{derived-asset-schema,clip-reads}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Tests**: NOT requested for this slice — no test runner in the repo (as in T0.3/T1/T2.x). Verification is
via `npm run typecheck` / `lint` / `build`, `db:generate`/`db:migrate` applying cleanly, the re-runnable
seed, and the `quickstart.md` DoD checks (the cascade observed; byte-stability; no new dep). No test
tasks are generated.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> scaffolded, migrated, or seeded. Execution happens in `/speckit.implement` after human approval.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US4 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one commit.

---

## Phase 1: Setup (the schema + migration — the foundation; blocks everything)

- [X] T001 Add the `derived_asset` table + two enums to `src/db/schema.ts`: `pgEnum`
  **`derived_asset_kind`** (`clip`/`carousel`/`embed`) and **`clip_format`** (`9x16`/`1x1`/`4x5`/`16x9`),
  and the **`derived_asset`** table — `id` (uuid PK), `workspaceId`→`workspace.id` (onDelete cascade),
  `proofId`→`proof.id` (onDelete cascade), `consentId`→`consent.id` (onDelete cascade — **provenance +
  hard-delete integrity only**, per Q2→A), `kind`, `format`, `assetUrl` (text not null), `hook` (text
  null — owned brand-hook provenance), `createdAt` (timestamptz not null default now()) — plus indexes
  `(workspaceId, createdAt desc)` and `(proofId)`. **Leave the existing `workspace`/`source`/`proof`/
  `consent` tables byte-unchanged** (additive only). Per `contracts/derived-asset-schema.md` +
  `data-model.md`. → FR-001, FR-002, FR-003 (P-VI, P-VII)
- [X] T002 Generate + **commit** the migration: run `npx drizzle-kit generate` → `drizzle/0001_*.sql`
  (CREATEs the two enums + `derived_asset` only) and the updated `drizzle/meta/` journal/snapshot; commit
  both. Hand-written SQL is NOT used. Depends on T001. → FR-004
- [X] T003 Apply the migration via the established neon-http migrator: `npm run db:migrate`
  (`src/db/migrate.ts`) — confirm `0001` applies cleanly on the current DB and the existing T0.3 tables/
  data are intact (no new migration tooling/dependency). Depends on T002. → FR-001, FR-013 (SC-005)

**Checkpoint**: `derived_asset` + the enums exist in the schema and the DB (additive); the existing tables/
data are untouched.

---

## Phase 2: Foundational (the shared effective-consent helper + clip view — BLOCKS the reads)

**⚠️ CRITICAL**: the P-VII withdrawal helper must exist and mirror the proof logic before any clip read.

- [X] T004 In `src/db/queries.ts`, extract the shared **`effectiveConsentState(proofIdColumn)`** helper —
  the correlated subquery `(select c.state from consent c where c.proof_id = <col> order by c.version
  desc limit 1)` — and **refactor `latestConsentState` to `effectiveConsentState(proof.id)`** (a
  **behaviour-preserving** change: identical generated SQL; `proofColumns`/`toView`/`getProofs`/`getProof`
  output and `ProofView`/`ProofDetailView` unchanged). This single helper is the **one source of truth**
  reused by the proof reads and the derived-asset withdrawal filter. Per `contracts/clip-reads.md`,
  research D2. → FR-002, FR-009 (P-VII)
- [X] T005 [P] Create `src/lib/clip.ts`: the **`ClipView`** type (the detail generated-assets shape —
  `id`, `kind`, `format`, `assetUrl`, `hook`, `createdAt`; owned only) + the clip enum value types,
  mirroring `src/lib/proof.ts`. → FR-007

**Checkpoint**: the shared effective-consent helper exists (proof reads unchanged) and the clip view type
is defined; the reads can be built.

---

## Phase 3: User Story 1 — The dashboard reflects generated clips (Priority: P1) 🎯 MVP

**Goal**: the dashboard's "clips this month" + latest-clip cells show real, withdrawal-filtered values.
**Independent Test**: with seeded clips, open `/app`; "clips this month" shows the real count of this
month's non-withdrawn clips and the latest-clip cell shows the most recent non-withdrawn clip (customer +
date, no view metric) — `dashboard-kpis.tsx` unchanged (quickstart §1).

- [X] T006 [US1] Swap the deferred `// T2.4` markers in `getDashboardSummary` (`src/db/queries.ts`),
  inside its existing `withDbRetry` block: compute **`clipsThisMonth`** = `count(*)::int` of
  `derived_asset` where `workspaceId = $ws` AND `createdAt >= date_trunc('month', now())` AND
  `effectiveConsentState(derivedAsset.proofId) = 'granted'` (replacing `0`); and **`latestClip`** = the
  most recent **non-withdrawn** `derived_asset` joined to `proof`, `order by createdAt desc limit 1`,
  projected to the existing `LatestClipDescriptor` (`customerName`, `verified`, `createdAt` — **owned
  only, no view metric**) (replacing `null`). **Do NOT edit `dashboard-kpis.tsx`** (it already consumes
  these fields + the honest-empty path). Per `contracts/clip-reads.md`. → FR-007, FR-008, FR-009, FR-010
  (FR-019)

**Checkpoint**: the dashboard clip cells are data-driven and withdrawal-filtered; the kpis component is
untouched.

---

## Phase 4: User Story 2 — A proof's generated clips appear on its detail (Priority: P1)

**Goal**: the proof detail's "Generated assets" section lights up from real data (lit only when non-empty).
**Independent Test**: open a granted proof with seeded clips → its clips list; open a proof with none →
the section is honestly empty/absent (quickstart §2).

- [X] T007 [US2] Add **`getProofClips(workspaceId, proofId): Promise<ClipView[]>`** to `src/db/queries.ts`
  (workspace-scoped, `withDbRetry`): select `derived_asset` where `workspaceId = $ws` AND `proofId =
  $proofId` AND `effectiveConsentState(derivedAsset.proofId) = 'granted'`, `order by createdAt desc`,
  mapped to `ClipView[]`. Withdrawn → empty list. Per `contracts/clip-reads.md`. → FR-007, FR-009
- [X] T008 [US2] [P] Create `src/components/app/proof-detail/proof-detail-generated-assets.tsx` (Server):
  a **"Generated assets"** section listing the proof's clips (format/kind + created date + an honest
  reference to the sample clip; owned data only). Renders **nothing** when the list is empty (no
  fabricated "· N"). On-token, quiet chrome. → FR-008 (P-V, FR-019)
- [X] T009 [US2] Wire the detail: in `src/components/app/proof-detail/proof-detail-data.tsx` call
  `getProofClips(ws.id, id)` after the proof resolves (the `getProof` → `null → notFound()` path is
  unchanged) and pass the clips into `<ProofDetail>`; in
  `src/components/app/proof-detail/proof-detail.tsx` render `<ProofDetailGeneratedAssets clips={…}/>` in
  the content column **only when non-empty**. Keep `getProof`/`ProofDetailView` byte-stable (clips are a
  separate read). → FR-008

**Checkpoint**: a proof's clips show on its detail when present; honest-empty/absent otherwise; the T2.3
detail read contract is unchanged.

---

## Phase 5: User Story 3 — Consent governs derived assets; revocation withdraws (Priority: P1)

**Goal**: the seed encodes the cascade — a born-then-withdrawn clip under Leo M. + active clips under
granted proofs — so revocation-withdrawal is observable in static data.
**Independent Test**: Leo M.'s seeded clip is absent from the dashboard count/latest and his detail
(withdrawn), while granted proofs' clips are present — from the seed, no code edit (quickstart §3).

- [X] T010 [US3] Seed `derived_asset` in `src/db/seed.ts`: capture the inserted **granted** consent row
  id per proof (to set `consentId`); seed **active** clips for a few currently-granted proofs (e.g. Maria
  L., Aisha K., Greta S.) — `kind='clip'`, `format='9x16'`, `assetUrl` = the sample-clip reference, a
  brand `hook`, `createdAt` **this month** (relative dates, A-10); seed **one born-then-withdrawn** clip
  under **Leo M.** (`consentId` = his v1 granted consent, `createdAt = ago(10)` — granted window) so his
  revoked effective consent **withdraws** it. Add `delete(derivedAsset)` to the FK-safe reset; keep the
  seed **re-runnable**. Per research D4. → FR-005, FR-006 (P-VII)

**Checkpoint**: the seed carries active + born-then-withdrawn clips; the cascade is encoded in static data.

---

## Phase 6: User Story 4 — Honest, owned-data counts only (Priority: P2)

**Goal**: every clip count/descriptor is computed from owned data; nothing fabricated, no platform metric.
**Independent Test**: change a fixture (add/remove a clip, revoke a proof's consent), reseed → the
dashboard count, latest clip, and detail generated-assets change accordingly; no un-owned metric anywhere
(quickstart §4).

- [X] T011 [US4] Verify the reads expose **owned data only**: `clipsThisMonth`, `latestClip`, and
  `getProofClips` are computed from `derived_asset` (+ owned joins), with **0** fabricated values and
  **0** social/platform metrics (views/reach/engagement); the `LatestClipDescriptor` and `ClipView` carry
  only owned fields. Confirm values track fixtures (add/remove/revoke → reseed → change). →
  FR-010, FR-019 (SC-004)

**Checkpoint**: the layer exposes only honest, owned, fixture-driven values.

---

## Phase 7: Polish & Definition of Done (the foundation-change verifications)

- [X] T012 [P] **Additive-migration verification**: `drizzle/0001_*.sql` only `CREATE`s the two enums +
  `derived_asset` — it contains **no** `ALTER`/`DROP` of `workspace`/`source`/`proof`/`consent`; applying
  it leaves existing data intact (SC-005). → FR-001 (SC-005)
- [X] T013 [P] **DEDICATED behaviour-identical-refactor verification**: confirm the
  `latestConsentState → effectiveConsentState(proof.id)` refactor changes **nothing** observable —
  `getProofs`/`getProof` produce unchanged output/SQL, and the **inbox** (`/app/proof`), **proof detail**
  (`/app/proof/[id]`), and **dashboard** (`/app`) render exactly as before (no change to counts, cards,
  ordering, or consent display). Verify via `git diff src/db/queries.ts` (only the `latestConsentState`
  definition line changes in the proof path) + rendering the three surfaces. → FR-002 (byte-stable)
- [X] T014 [P] **DEDICATED P-VII read-time-withdrawal verification**: against the seed, **Leo M.'s
  born-then-withdrawn clip is ABSENT** from `clipsThisMonth`, `latestClip`, and `getProofClips`, while the
  **active clips under granted proofs are PRESENT** — and Leo M.'s `derived_asset` row still **exists**
  in the table (audit retained). Verify via the dashboard + Leo M.'s detail + the `quickstart.md` SQL
  spot-check. → FR-009, P-VII (SC-003)
- [X] T015 [P] **Byte-stable + no-new-dep gate**: `git diff --quiet HEAD -- src/components/proof-card.tsx`
  (byte-identical); `src/lib/proof.ts` (`ProofView`/`ProofCardProps`/`ProofDetailView`) unchanged; in
  `src/db/queries.ts` `getProofs`/`proofColumns`/`toView`/`getProof`/`toDetailView` unchanged (only the
  helper + the dashboard swap + `getProofClips` + the `latestConsentState` refactor are new);
  `src/components/app/dashboard/dashboard-kpis.tsx` unchanged; the existing schema tables unchanged;
  `specs/T2.4b-clip-studio/` (parked) untouched; **no dependency** added to `package.json`/`package-lock.json`.
  → FR-012, SC-007
- [X] T016 [P] Responsive + keyboard + on-token for the detail **generated-assets** section (480 / 1024 /
  1280 + 1240 max; reflows, no horizontal scroll/overlap; reachable with visible focus; tokens only). →
  P-IV, DoD
- [X] T017 [P] Microcopy / honesty: the lit-up cells/section use honest wording (no "amazing"/"awesome",
  no emoji); the sample clip reads as an honest stand-in (no claim of a real per-proof render); no
  fabricated counts. → FR-010 (P-XI, FR-019)
- [X] T018 Run `npm run typecheck`, `npm run lint`, `npm run build` — all green (incl. **without
  `DATABASE_URL`** — CI parity; the migration/seed are separate steps); run `quickstart.md` (generate +
  commit + migrate + seed + observe the cascade); confirm the `CLAUDE.md` SPECKIT pointer targets this
  plan. Then **STOP and report**; do not run `/speckit.implement` or unpark T2.4b until the human says to
  proceed (P-IX). → SC-005, DoD

**Checkpoint**: Definition of Done met — additive migration applied; the cascade observable; the refactor
behaviour-identical; ProofCard/shared shapes/dashboard-kpis byte-stable; honest counts; builds green.

---

## Dependencies & Execution Order

- **Setup (T001–T003)** → first. T001 (schema) → T002 (generate+commit) → T003 (apply). Strictly
  sequential (each depends on the prior).
- **Foundational (T004–T005)** → depends on Setup. T004 (helper + refactor) blocks every clip read; T005
  (clip type) is [P] (different file).
- **US1 (T006)** → depends on T004 (helper) + the table (T001/T003). Dashboard swap, queries-only.
- **US2 (T007–T009)** → T007 (read) depends on T004/T005; T008 (component) is [P]; T009 wires the detail
  (after T007 + T008).
- **US3 (T010)** → seed depends on the table (T001/T003); provides the data US1/US2/US3 verifications
  observe.
- **US4 (T011)** → depends on the reads (T006/T007) + seed (T010).
- **Polish (T012–T018)** → after the stories; T013/T014 need the seed (T010) applied; T018 last.

## Parallel Opportunities

- Foundational: T005 (clip type) is [P] with T004.
- US2: T008 (generated-assets component) is [P] with T007 (read); T009 follows both.
- Polish: T012–T017 are independent checks (different concerns); T018 last.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 (+ the US3 seed to see data) — the dashboard clip cells light up
  from real, withdrawal-filtered data.
- Then US2 (detail generated-assets) → US3 (the cascade seed) → US4 (honest counts) → Polish/DoD (the
  dedicated migration / refactor / withdrawal verifications).
- Commit after each task (one commit each); the migration (T002) + its meta are committed together. Stop
  at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-001, FR-002, FR-003 (P-VI, P-VII) |
| T002 | FR-004 |
| T003 | FR-001, FR-013 (SC-005) |
| T004 | FR-002, FR-009 (P-VII) |
| T005 | FR-007 |
| T006 | FR-007, FR-008, FR-009, FR-010 (FR-019) |
| T007 | FR-007, FR-009 |
| T008 | FR-008 (P-V, FR-019) |
| T009 | FR-008 |
| T010 | FR-005, FR-006 (P-VII) |
| T011 | FR-010, FR-019 (SC-004) |
| T012 | FR-001 (SC-005) |
| T013 | FR-002 (byte-stable refactor) |
| T014 | FR-009, P-VII (SC-003) |
| T015 | FR-012, SC-007 |
| T016 | P-IV, DoD |
| T017 | FR-010 (P-XI, FR-019) |
| T018 | SC-005, DoD |

## Notes

- 18 atomic tasks; 0 test tasks (no runner; verification via typecheck/lint/build + migrate/seed +
  quickstart). This is a **foundation/schema slice** — the FIRST schema change since T0.3.
- **P-VII read-time withdrawal** is the core: revocation is a new `revoked` consent version (never a
  delete), so `ON DELETE CASCADE` on `consentId` never fires on it — it's kept for provenance + hard-delete
  integrity only. Withdrawal is the **read-time effective-consent filter** (T004 helper → T006/T007), the
  asset row retained for audit. T014 verifies it against the seed; T010 encodes the case (Leo M.).
- **Shared helper**: `effectiveConsentState(proofIdColumn)` (T004) is the one source of truth, reused by
  the proof reads (refactored, behaviour-identical — T013 verifies) and the clip filter — mirrors the
  existing `ProofView` effective-consent logic.
- **Marker swap**: dashboard is **queries-only** (`dashboard-kpis.tsx` unchanged — T006/T015); the detail
  generated-assets section lights **only when non-empty** (T008/T009).
- **Byte-stable**: ProofCard, `ProofView`/`ProofCardProps`/`ProofDetailView`, `getProofs`/`proofColumns`/
  `toView`/`getProof`, `dashboard-kpis.tsx`, and the existing schema tables stay unchanged (T015); the
  parked **T2.4b** studio is untouched. **No new dependency.**
- **Migration**: generated by `drizzle-kit generate`, committed (`0001` + `meta`), applied by the
  neon-http migrator (T0.3 pattern) — additive only (T012). Build stays green without `DATABASE_URL`
  (migration/seed are separate steps — T018).
- Out of scope (do NOT build): the clip studio UI / generate flow (parked **T2.4b**), the real render
  engine (T8), publishing/distribution, batch studio; any non-additive schema change; any new dependency.
