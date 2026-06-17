---
description: "Task list for T3.1 — Library (the home for generated clips): clips-only read of derived_asset + surface"
---

# Tasks: T3.1 — Library (the home for generated clips)

**Input**: Design documents from `specs/T3.1-library/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D6), data-model.md, contracts/{library-read,library-surface}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Prerequisite slices**: T2.4a (`derived_asset` + the shared `effectiveConsentState`/`effectiveConsentGranted`
helpers + `getProofClips`/`getDashboardSummary` clip reads) and T2.4b (the studio that writes clips) — both
shipped. **This slice does NOT change the schema** (reads the existing `derived_asset`).
**Tests**: NOT requested (no test runner in the repo, as throughout). Verification is via `npm run
typecheck`/`lint`/`build` (green **without** `DATABASE_URL`) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented, scaffolded,
> or run. Execution happens in `/speckit.implement` AFTER human approval.
> **At implementation, leave EVERYTHING uncommitted** — no per-task commits, no push/merge. Cornel reviews
> and commits manually on the `T3.1-library` branch (mirrors the T2.4a/T2.4b hand-off).

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US3 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (the view type — no UI yet)

- [X] T001 [P] Add **`LibraryClipView`** to `src/lib/clip.ts` (D2): the owned card shape = `ClipView`'s
  fields (`id`, `kind`, `format`, `assetUrl`, `hook`, `createdAt`) **plus** `proofId`, `customerName`,
  `verified`. Define it **alongside** `ClipView` — **`ClipView` stays byte-unchanged** (`getProofClips`
  still returns `ClipView[]`). Owned fields only — no metric. Per `data-model.md` §1. → FR-005 (FR-019, D2)

**Checkpoint**: the Library view type exists; `ClipView` is unchanged. No read, no UI yet.

---

## Phase 2: Foundational (the read + the skeleton — BLOCK the surface)

**⚠️ CRITICAL**: the withdrawal-filtered read must exist and reuse the shared gate before the surface.

- [X] T002 Add **`getLibraryClips(workspaceId): Promise<LibraryClipView[]>`** to `src/db/queries.ts` (ADD
  only): `withDbRetry`-wrapped; `select` from `derived_asset` **innerJoin** `proof` (for `customerName` +
  `verified` + the link target); `where eq(derivedAsset.workspaceId, $ws) AND
  effectiveConsentGranted(derivedAsset.proofId)` — the **shared** read-time withdrawal gate (→
  `effectiveConsentState`), **identical** to the T2.4a clip reads; `orderBy(desc(derivedAsset.createdAt))`
  (newest first); project the owned fields → `LibraryClipView[]` (no view/engagement/performance, no render
  status). **Do NOT touch** `getProofs`/`getProof`/`getProofClips`/the `getDashboardSummary` clip reads/
  `effectiveConsentState`/`effectiveConsentGranted`/`getGrantedConsentId`/`insertDerivedAsset`. Per
  `contracts/library-read.md`, research D1. → FR-002, FR-003, FR-007 (P-VII)
- [X] T003 [P] Create `src/components/app/library/library-skeleton.tsx` (Server): the on-token loading
  skeleton mirroring the grid (placeholder clip cards; tokens only). Used by the page Suspense + `loading.tsx`.
  → FR-009

**Checkpoint**: the read exists (existing reads untouched) and the loading skeleton is ready; the surface
can be built.

---

## Phase 3: User Story 1 — Browse every generated clip (Priority: P1) 🎯 MVP

**Goal**: `/app/library` replaces the placeholder and shows every consent-visible clip (newest first) with
owned fields + the sample/preview label + an honest count, inside AppChrome; each card links to the source
proof.
**Independent Test**: with seeded clips under granted proofs, open `/app/library`; confirm the grid lists
them newest-first with the owned fields + sample label + count, and a card links to its source proof
(quickstart §1–4).

- [X] T004 [US1] Create `src/components/app/library/library-clip-card.tsx` (Server): one clip — the **source
  customer** (the headline, P-II), the **brand hook** when set (clearly the brand's words, separate from any
  customer quote — render spec §7.4), the **format** (display label via the studio's `FORMAT_OPTIONS` map in
  `src/lib/studio.ts`), the **created date**, and an honest **"Sample preview"** chip. The **whole card is a
  `Link href={\`/app/proof/${proofId}\`}`** (the source proof — the one existing destination;
  keyboard-focusable, visible focus). The persimmon verified mark when `verified`. **No** clip-detail link,
  **no** inline play, **no** re-make/export/share. Per `contracts/library-surface.md`. → FR-005, FR-006,
  FR-011, FR-012 (P-II, A-11, FR-019)
- [X] T005 [US1] Create `src/components/app/library/library-grid.tsx` (Server): a header (title "Library" +
  the **honest owned count**, e.g. "{n} clips" / "1 clip" = the length of the filtered list) and the
  **clip grid** — a responsive multi-column collection of `<LibraryClipCard>` (newest first; mirrors the
  inbox Wall's CSS columns, no JS masonry dependency). → FR-005, FR-007
- [X] T006 [US1] Create `src/components/app/library/library-data.tsx` (async Server): `clips = await
  getLibraryClips(workspace.id)`; `clips.length === 0` → `<LibraryEmpty/>`, else `<LibraryGrid clips={…}/>`.
  → FR-002, FR-008
- [X] T007 [US1] **Replace the placeholder** `src/app/app/library/page.tsx` (Server): resolve the workspace
  via the unchanged seam (`getCurrentWorkspace`); `<Suspense fallback={<LibrarySkeleton/>}><LibraryData
  workspaceId={ws.id}/></Suspense>`; `export const metadata = { title: "Library — Weavova" }`. Inherits
  `/app` `force-dynamic` + AppChrome. Remove the `<SectionPlaceholder title="Library" …/>` usage. →
  FR-001

**Checkpoint**: the Library lists the workspace's consent-visible clips (newest first) with owned fields +
count; each card opens its source proof; chrome intact.

---

## Phase 4: User Story 2 — Revoked-consent clips are withheld (Priority: P1)

**Goal**: a clip whose source proof's consent is not granted is absent from the Library + count (audit row
retained) — parity with the dashboard/detail.
**Independent Test**: with the seeded born-then-withdrawn clip (Leo M.), open the Library; confirm it is
absent while active clips are present, and the count excludes it (quickstart §3).

- [X] T008 [US2] **P-VII withdrawal verification** (the same demonstration as T2.4a, now on this read):
  against the seed, confirm **Leo M.'s** clip (source proof granted→revoked) is **ABSENT** from the Library
  grid and the count, while the **active clips** (Maria L., Aisha K., Greta S.) are **PRESENT** — i.e. the
  Library shows exactly the clip set the dashboard "clips this month"/latest and the proof detail's
  "Generated assets" show (shared `effectiveConsentGranted`). Confirm Leo M.'s `derived_asset` row still
  **exists** (audit retained; withdrawal is read-time, not a delete). → FR-003 (P-VII, SC-002, SC-008)

**Checkpoint**: withdrawal on the Library read provably matches the rest of the app; rows retained.

---

## Phase 5: User Story 3 — Honest empty, loading, and error states (Priority: P2)

**Goal**: the Library handles its full state set — honest empty, loading skeleton, transparent cold-start
recovery, and the shared error surface.
**Independent Test**: with zero (or all-withheld) clips, confirm the empty state; simulate a transient then
a persistent read failure; confirm loading, recovery, and the shared error state (quickstart §5–6).

- [X] T009 [US3] Create `src/components/app/library/library-empty.tsx` (Server): the **honest empty** state
  (no fabricated rows/counts) — a quiet on-token panel orienting the merchant toward making a clip, with a
  link to the proof inbox `/app/proof` (where "Make a clip" lives on a granted proof). Rendered by
  `library-data.tsx` when there are **zero clips OR all are withheld**. → FR-008 (P-XII)
- [X] T010 [US3] [P] Create `src/app/app/library/loading.tsx` (Server) → `<LibrarySkeleton/>` (route-segment
  fallback; covers client navigations + the page await, complementing the in-page Suspense). → FR-009
- [X] T011 [US3] [P] Create `src/app/app/library/error.tsx` (`"use client"` boundary) → `<ErrorState
  onRetry={reset}/>` — the shared T2.1 surface; **no raw error text/digest**; a transient cold start is
  retried transparently by `getLibraryClips`'s `withDbRetry` (no error surfaced). → FR-010

**Checkpoint**: populated / honest-empty / loading / error all handled, server-first, mirroring the spine.

---

## Phase 6: Polish & Definition of Done (the audits + green build)

- [X] T012 [P] **A-11 audit** (hidden, not dead): confirm the Library renders **none** of — a List/Grid
  **toggle**, a **Status** (Ready/Queued) column, Kind/Source/Consent **filters**, a **"Download clips (N)"**
  bulk action, a per-clip **detail link** (T3.2 unbuilt), or **inline sample playback**. The only per-clip
  destination is the **source-proof link**. → FR-004, FR-011, FR-012 (A-11, SC-004)
- [X] T013 [P] **FR-019 honesty audit**: confirm every value on a card/grid is **owned** — source customer,
  brand hook, format, created date, the honest **sample/preview** label, the honest count — and there is **0**
  view/reach/engagement/performance metric, **0** render status, **0** fabricated value. → FR-005, FR-006,
  FR-012 (FR-019, SC-003)
- [X] T014 [P] **Byte-stable + no-new-dep gate**: `src/components/proof-card.tsx` byte-identical; `src/lib/
  proof.ts` (`ProofView`/`ProofCardProps`/`ProofDetailView`) unchanged; `src/lib/clip.ts` `ClipView`
  byte-unchanged (`LibraryClipView` added); in `src/db/queries.ts` `getProofs`/`getProof`/`getProofClips`/
  the `getDashboardSummary` clip reads/`effectiveConsentState`/`effectiveConsentGranted`/`getGrantedConsentId`/
  `insertDerivedAsset` unchanged (only `getLibraryClips` added); `src/db/schema.ts` unchanged (**NO
  migration**); AppChrome/rail/top-bar/switcher/palette unchanged; **no dependency** added to `package.json`/
  `package-lock.json`. → FR-016
- [X] T015 [P] **Responsive + keyboard + on-token**: the grid reflows at 480 / 1024 / 1280 (+1240 max) with
  no horizontal scroll/overlap; every card link is reachable/operable with visible focus; tokens only. →
  FR-014 (P-IV, SC-007)
- [X] T016 [P] **Microcopy / honesty**: the Library copy matches screen 09 where it specifies wording, is
  honest about the sample stub + the empty state, and avoids "amazing"/"awesome" and emoji. → FR-015 (P-XI)
- [X] T017 Run `npm run typecheck`, `npm run lint`, `npm run build` — all green, **without `DATABASE_URL`**
  (CI parity: move `.env.local` aside, build, restore — the lazy db client keeps the build green); run
  `quickstart.md` (open the Library; populated/empty/loading/error; withdrawal parity — Leo M. absent;
  source-proof link); confirm the `CLAUDE.md` SPECKIT pointer targets this plan. Then **STOP and report**;
  do **not** run `/speckit.implement` again, and **leave the entire change uncommitted** for Cornel's manual
  review/commit (no commit/push/merge) (P-IX). → SC-001..008, DoD

**Checkpoint**: Definition of Done met — the Library lists owned, withdrawal-filtered clips with honest
count/states; A-11 omissions clean; byte-stable; no schema change; no new dependency; builds green without
`DATABASE_URL`.

---

## Dependencies & Execution Order

- **Setup (T001)** → first (the view type). [P] alone.
- **Foundational (T002–T003)** → after Setup. T002 (read) blocks the surface; T003 (skeleton) is [P] and is
  needed by T007 (page Suspense) + T010 (loading).
- **US1 (T004–T007)** → T004 (card) + T005 (grid, uses the card) + T006 (data, uses grid + empty) + T007
  (page, uses data + skeleton). T006 imports `<LibraryEmpty>` (T009) — build T009 first or treat T006↔T009
  as paired (sequenced under US3 for story clarity; pull T009 earlier in implementation).
- **US2 (T008)** → verification, after T002 + the seed + US1 surface.
- **US3 (T009–T011)** → T009 (empty) needed by T006; T010 (loading) uses T003; T011 (error) is a leaf [P].
- **Polish (T012–T017)** → after the stories; T017 last (build + quickstart + STOP, uncommitted).

## Parallel Opportunities

- Setup/Foundational: T001 ∥ (T002, T003); T003 ∥ T002 (different files).
- US3: T010 ∥ T011 (different files).
- Polish: T012–T016 are independent checks (different concerns); T017 last.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 (+ T009 empty) — the Library lists the workspace's consent-visible
  clips with owned fields, count, and source-proof links.
- Then US2 (withdrawal verification) → US3 (states) → Polish/DoD (the A-11 / FR-019 / byte-stable audits +
  green build).
- **Do NOT commit per task.** Build the whole slice, then leave the entire change uncommitted; Cornel
  reviews and commits manually on `T3.1-library`. Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-005 (FR-019, D2) |
| T002 | FR-002, FR-003, FR-007 (P-VII, D1) |
| T003 | FR-009 |
| T004 | FR-005, FR-006, FR-011, FR-012 (P-II, A-11, FR-019) |
| T005 | FR-005, FR-007 |
| T006 | FR-002, FR-008 |
| T007 | FR-001 |
| T008 | FR-003 (P-VII, SC-002, SC-008) |
| T009 | FR-008 (P-XII) |
| T010 | FR-009 |
| T011 | FR-010 |
| T012 | FR-004, FR-011, FR-012 (A-11, SC-004) |
| T013 | FR-005, FR-006, FR-012 (FR-019, SC-003) |
| T014 | FR-016 |
| T015 | FR-014 (P-IV, SC-007) |
| T016 | FR-015 (P-XI) |
| T017 | SC-001..008, DoD |

## Notes

- 17 atomic tasks; 0 test tasks (no runner; verification via typecheck/lint/build + quickstart). A
  **read + surface** slice — the read counterpart to the studio's write; **no schema change**, **no new
  dependency**.
- **P-VII**: the Library's visibility uses the **shared** `effectiveConsentGranted` (→ `effectiveConsentState`)
  — so it withholds exactly what the dashboard/detail withhold (T008 verifies via Leo M.); withheld rows are
  retained (read-time withdrawal, "pull don't destroy").
- **D2**: `LibraryClipView` is a **new** view (the card needs customer + proofId + verified); `ClipView` +
  `getProofClips` stay byte-stable (T001/T014).
- **D3**: a **clip-card grid** (clips are visual), not screen-09's proof+clips table — the toggle + Status
  column are not built (A-11, T012).
- **D5 / A-11**: filters, List/Grid toggle, bulk download, render status, clip-detail link, and inline play
  are **hidden, not dead** (T012); the only per-clip destination is the **source-proof link** (T004).
- **FR-019**: owned values only — no metrics, clips shown as honest **sample/preview** (T013).
- **Byte-stable**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`, `ClipView`, all existing
  clip reads, and `schema.ts` unchanged; no new dependency (T014).
- **Uncommitted hand-off**: implementation leaves EVERYTHING uncommitted; Cornel commits manually (T017).
- Out of scope (do NOT build): bulk select/export (T4), publishing/distribution/showcase (later), the real
  render engine (T8 — clips stay sample-stubbed), the per-clip detail (T3.2); any schema change; any new
  dependency.
