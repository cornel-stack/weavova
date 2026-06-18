---
description: "Task list for T-Showcase — the curate+preview wall of proof at /app/showcase (port screen 10's owned half; distribution → T9)"
---

# Tasks: T-Showcase — Showcase (curate + preview the wall of proof)

**Input**: Design documents from `specs/T-showcase/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D5), data-model.md, contracts/{showcase-read,showcase-surface}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Prerequisite slices**: the spine (proof, `derived_asset`, the shared `effectiveConsentState`/
`effectiveConsentGranted` + `proofColumns`/`toView` + `getLibraryClips`) + T3 — all shipped. **This slice does
NOT change the schema** (reads existing `proof`/`derived_asset`). Ports screen 10's **owned half**; the
distribution cluster defers to T9.
**Tests**: NOT requested (no test runner). Verification via `npm run typecheck`/`lint`/`build` (green
**without** `DATABASE_URL`) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented, scaffolded,
> or run. Execution happens in `/speckit.implement` AFTER human approval.
> **At implementation, leave EVERYTHING uncommitted** — no per-task commits, no push/merge. Cornel reviews
> and commits manually on the `T-showcase` branch (mirrors the prior slices).

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US4 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (the item type — no UI yet)

- [X] T001 [P] Add **`ShowcaseItem`** to `src/lib/showcase.ts` (D3): the discriminated union
  `{ kind: 'proof'; proof: ProofView } | { kind: 'clip'; clip: LibraryClipView }`, importing the **existing**
  `ProofView` (`@/lib/proof`) and `LibraryClipView` (`@/lib/clip`) **type-only**. Both stay **byte-unchanged**;
  this is additive. Per `data-model.md` §1. → FR-002 (FR-019, D3)

**Checkpoint**: the wall item type exists; `ProofView`/`LibraryClipView` unchanged. No read, no UI yet.

---

## Phase 2: Foundational (the read + the skeleton — BLOCK the surface)

**⚠️ CRITICAL**: the combined withdrawal-filtered read must exist (reusing the shared gate) before the surface.

- [X] T002 Add **`getShowcase(workspaceId): Promise<ShowcaseItem[]>`** to `src/db/queries.ts` (ADD only):
  `withDbRetry`-wrapped, **one block, two queries** — (1) **consented proof**: `select proofColumns from proof
  innerJoin source where eq(proof.workspaceId, $ws) AND effectiveConsentGranted(proof.id)` → `toView` →
  `ProofView[]` (reuse the existing `proofColumns`/`toView`, **read-only**); (2) **consented clips**: the
  `getLibraryClips` shape — `derived_asset innerJoin proof where eq(derivedAsset.workspaceId, $ws) AND
  effectiveConsentGranted(derivedAsset.proofId)` → `LibraryClipView[]`. **Merge** into `ShowcaseItem[]` and
  **sort newest-first** by item date (`capturedAt`/`createdAt`). **`getProofs` MUST stay UNFILTERED and
  byte-unchanged** (the inbox shows all consent states); the Showcase shows **only granted** — this is a
  SEPARATE query, NOT a change to `getProofs`. **Do NOT touch** `getProofs`/`getProof`/`getProofClips`/
  `getLibraryClips`/`getClip`/the `getDashboardSummary` clip reads/`effectiveConsentState`/
  `effectiveConsentGranted`/`getGrantedConsentId`/`insertDerivedAsset`/`proofColumns`/`toView`. Per
  `contracts/showcase-read.md`, research D2. → FR-002, FR-006 (P-VII, FR-019)
- [X] T003 [P] Create `src/components/app/showcase/showcase-skeleton.tsx` (Server): on-token loading skeleton
  mirroring the public-style wall. Used by the page Suspense + `loading.tsx`. → FR-011

**Checkpoint**: the combined read exists (existing reads untouched; `getProofs` still unfiltered) and the
skeleton is ready; the surface can be built.

---

## Phase 3: User Story 1 — Preview the wall of proof (Priority: P1) 🎯 MVP

**Goal**: `/app/showcase` replaces the placeholder and shows a public-style wall of consented proof+clips
(owned data + verified mark, newest-first) + an honest count, inside AppChrome.
**Independent Test**: with consented proof+clips seeded, open `/app/showcase`; confirm the wall + count +
per-item detail links, distinct from the inbox/Library (quickstart §1–5).

- [X] T004 [US1] Create `src/components/app/showcase/showcase-item.tsx` (Server): its **OWN** public-style
  presentation (D4 — **NOT** ProofCard; none of ProofCard's consent dot / "Unreviewed" stamp / "Make"
  button). Discriminates on `kind`: **proof** → a testimonial card (the customer's verbatim words/quote as
  the headline — P-II — + customer + the **verified mark** when verified + date); **clip** → a clip card (the
  **non-playing sample/preview** still in the clip's format + format/hook + customer + verified mark + date).
  Owned data only. The **whole item links to its detail** — proof → `/app/proof/[id]`, clip →
  `/app/clip/[id]` (both exist; keyboard-focusable, visible focus). Per `contracts/showcase-surface.md`. →
  FR-003, FR-004, FR-005 (P-II, P-V, FR-019, A-11)
- [X] T005 [US1] Create `src/components/app/showcase/showcase-wall.tsx` (Server): a header (title "Showcase" +
  the **honest count** = the filtered-list length + a quiet, honest note that publishing/embedding arrives
  later) and the **public-style wall** — a "Wall of Love"-style responsive layout, **distinct** from the
  inbox masonry and the Library grid, newest-first, of `<ShowcaseItem>`. → FR-003, FR-005
- [X] T006 [US1] Create `src/components/app/showcase/showcase-data.tsx` (async Server): `items = await
  getShowcase(workspace.id)`; `items.length === 0` → `<ShowcaseEmpty/>`, else `<ShowcaseWall items={…}/>`.
  → FR-002, FR-008
- [X] T007 [US1] **Replace the placeholder** `src/app/app/showcase/page.tsx` (Server): resolve the workspace
  via the unchanged seam (`getCurrentWorkspace`); `<Suspense fallback={<ShowcaseSkeleton/>}><ShowcaseData
  workspaceId={ws.id}/></Suspense>`; `export const metadata = { title: "Showcase — Weavova" }`. Inherits
  `/app` force-dynamic + AppChrome. Remove the `<SectionPlaceholder title="Showcase" …/>` usage. → FR-001

**Checkpoint**: the wall lists consented proof+clips (newest-first) with owned data + verified mark + count;
each item opens its proof/clip detail; chrome intact; distinct from the inbox/Library.

---

## Phase 4: User Story 2 — Withdrawn-consent items are absent (Priority: P1)

**Goal**: a revoked proof and its clips are absent from the wall + count (audit retained) — parity with the
dashboard/Library.
**Independent Test**: with the seeded withdrawn item (Leo M.), open the Showcase; confirm his proof AND its
clip are absent while consented items are present, and the count excludes them (quickstart §3).

- [X] T008 [US2] **P-VII withdrawal-parity verification** (on `getShowcase`): against the seed, confirm
  **Leo M.'s** proof (consent revoked) **AND** its born-then-withdrawn clip are **ABSENT** from the wall and
  the count, while the **granted** proof + clips are **PRESENT** — i.e. the Showcase shows exactly the consent
  set the dashboard/Library show (shared `effectiveConsentGranted`). Confirm the underlying rows are
  **retained** (read-time gate, not a delete). → FR-006 (P-VII, SC-002, SC-008)

**Checkpoint**: withdrawal on the wall read provably matches the rest of the app; rows retained.

---

## Phase 5: User Story 3 — Honest empty, loading, and error states (Priority: P2)

**Goal**: the Showcase handles its full state set — honest empty, loading skeleton, transparent cold-start
recovery, shared error.
**Independent Test**: with zero eligible (or all-withheld) items, confirm the empty state; simulate transient
then persistent reads; confirm loading/recovery/error (quickstart §6–7).

- [X] T009 [US3] Create `src/components/app/showcase/showcase-empty.tsx` (Server): the **honest empty** state
  (no fabricated rows/counts) — a quiet on-token panel orienting toward capturing proof / making clips, with
  a link to `/app/proof`. Rendered by `showcase-data.tsx` when there are **zero eligible OR all withheld**
  items. → FR-008 (P-XII)
- [X] T010 [US3] [P] Create `src/app/app/showcase/loading.tsx` (Server) → `<ShowcaseSkeleton/>` (route-segment
  fallback complementing the in-page Suspense). → FR-011
- [X] T011 [US3] [P] Create `src/app/app/showcase/error.tsx` (`"use client"` boundary) → `<ErrorState
  onRetry={reset}/>` — the shared T2.1 surface; **no raw error text/digest**; a transient cold start is
  retried transparently by `getShowcase`'s `withDbRetry`. → FR-012

**Checkpoint**: populated / honest-empty / loading / error all handled, server-first, mirroring the spine.

---

## Phase 6: User Story 4 — The distribution controls are honestly absent (Priority: P2)

**Goal**: screen 10's distribution + curation machinery is not rendered — the Showcase is unmistakably a
curate/preview surface, not a half-wired publishing tool.
**Independent Test**: inspect the Showcase; confirm none of the LIVE/curation/preset/embed/publish controls
render (quickstart §4).

- [X] T012 [US4] **A-11 audit** (the curate/publish/embed cluster, D5): confirm the Showcase renders **none**
  of — a **LIVE / "public set"** badge, the **"Add from library"** curation control / proof picker, the
  **Single highlight / Carousel / Wall of Love** layout-embed preset switchers, the embed **`<script>` snippet
  / "Copy embed"**, or any **publish / "go live" / public URL / share** control. No fabricated **LIVE/
  published** badge or "live since" date. The cluster defers to T9 as one coupled feature. → FR-007, FR-009,
  FR-010 (A-11, SC-004)

**Checkpoint**: the Showcase is an honest curate/preview surface; the distribution cluster is cleanly omitted.

---

## Phase 7: Polish & Definition of Done (the audits + green build)

- [X] T013 [P] **FR-019 honesty audit**: every value on the wall/items is **owned** — customer, verbatim
  words/quote (proof) or sample-preview + format/hook (clip), the verified mark, the date, the honest count —
  and there is **0** view/reach/likes/social-proof/published-since metric, **0** fabricated value, **0**
  finished-render claim (clips are sample/preview stills). → FR-004, FR-005 (FR-019, SC-003)
- [X] T014 [P] **Byte-stable + no-new-dep gate**: `src/components/proof-card.tsx` byte-identical (the wall
  uses its **own** `showcase-item`, NOT ProofCard); `src/lib/proof.ts` (`ProofView`/`ProofCardProps`/
  `ProofDetailView`) unchanged; `src/lib/clip.ts` (`ClipView`/`LibraryClipView`/`ClipDetailView`) unchanged;
  in `src/db/queries.ts` `getProofs` (still **UNFILTERED**)/`getProof`/`getProofClips`/`getLibraryClips`/
  `getClip`/the `getDashboardSummary` clip reads/`effectiveConsentState`/`effectiveConsentGranted`/
  `getGrantedConsentId`/`insertDerivedAsset`/`proofColumns`/`toView` unchanged (only `getShowcase` added);
  `src/db/schema.ts` unchanged (**NO migration**); AppChrome + the proof/Library/clip surfaces unchanged;
  **no dependency** added to `package.json`/`package-lock.json`. → FR-016
- [X] T015 [P] **Responsive + keyboard + on-token**: the wall reflows at 480 / 1024 / 1280 (+1240 max) with
  no horizontal scroll/overlap; every item link is reachable/operable with visible focus; tokens only. →
  FR-014 (P-IV, SC-007)
- [X] T016 [P] **Microcopy / honesty**: the Showcase copy matches screen 10 where it specifies wording, is
  honest that publishing/embedding isn't available yet, and avoids "amazing"/"awesome" and emoji. →
  FR-015 (P-XI)
- [X] T017 Run `npm run typecheck`, `npm run lint`, `npm run build` — all green, **without `DATABASE_URL`**
  (CI parity: move `.env.local` aside, build, restore — the lazy db client keeps the build green); run
  `quickstart.md` (open the wall; withdrawal parity — Leo M.'s proof+clip absent; empty/loading/error; no
  distribution controls; item links → proof/clip detail); confirm the `CLAUDE.md` SPECKIT pointer targets
  this plan. Then **STOP and report**; do **not** run `/speckit.implement` again, and **leave the entire
  change uncommitted** for Cornel's manual review/commit (no commit/push/merge) (P-IX). → SC-001..008, DoD

**Checkpoint**: Definition of Done met — the wall lists owned, withdrawal-filtered consented proof+clips with
honest count/states; the distribution cluster cleanly omitted; byte-stable; no schema change; no new
dependency; builds green without `DATABASE_URL`.

---

## Dependencies & Execution Order

- **Setup (T001)** → first (the item type). [P] alone.
- **Foundational (T002–T003)** → after Setup. T002 (read) blocks the surface; T003 (skeleton) is [P] and is
  needed by T007 (page Suspense) + T010 (loading).
- **US1 (T004–T007)** → T004 (item) + T005 (wall, uses the item) + T006 (data, uses wall + empty) + T007
  (page, uses data + skeleton). T006 imports `<ShowcaseEmpty>` (T009) — build T009 first or treat T006↔T009
  as paired (sequenced under US3 for story clarity; pull T009 earlier in implementation).
- **US2 (T008)** → verification, after T002 + the seed + US1 surface.
- **US3 (T009–T011)** → T009 (empty) needed by T006; T010 (loading) uses T003; T011 (error) is a leaf [P].
- **US4 (T012)** → audit, after T004/T005/T007.
- **Polish (T013–T017)** → after the stories; T017 last (build + quickstart + STOP, uncommitted).

## Parallel Opportunities

- Setup/Foundational: T001 ∥ (T002, T003); T003 ∥ T002 (different files).
- US3: T010 ∥ T011 (different files).
- Polish: T013–T016 are independent checks (different concerns); T017 last.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 (+ T009 empty) — the wall lists consented proof+clips with owned data,
  the verified mark, count, and per-item detail links.
- Then US2 (withdrawal parity) → US3 (states) → US4 (A-11 cluster audit) → Polish/DoD (FR-019 / byte-stable /
  responsive / build).
- **Do NOT commit per task.** Build the whole slice, then leave the entire change uncommitted; Cornel reviews
  and commits manually on `T-showcase`. Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-002 (FR-019, D3) |
| T002 | FR-002, FR-006 (P-VII, FR-019, D2) |
| T003 | FR-011 |
| T004 | FR-003, FR-004, FR-005 (P-II, P-V, FR-019, A-11, D4) |
| T005 | FR-003, FR-005 |
| T006 | FR-002, FR-008 |
| T007 | FR-001 |
| T008 | FR-006 (P-VII, SC-002, SC-008) |
| T009 | FR-008 (P-XII) |
| T010 | FR-011 |
| T011 | FR-012 |
| T012 | FR-007, FR-009, FR-010 (A-11, SC-004) |
| T013 | FR-004, FR-005 (FR-019, SC-003) |
| T014 | FR-016 |
| T015 | FR-014 (P-IV, SC-007) |
| T016 | FR-015 (P-XI) |
| T017 | SC-001..008, DoD |

## Notes

- 17 atomic tasks; 0 test tasks (no runner; verification via typecheck/lint/build + quickstart). A
  **read + surface** slice — the wall is a combined read counterpart to the proof + clip surfaces; **no
  schema change**, **no new dependency**.
- **D2 — `getShowcase` ≠ `getProofs`**: the inbox's `getProofs` is intentionally **unfiltered** (shows all
  consent states); the Showcase shows **only granted** via the shared gate — a separate query (T002), with
  `getProofs` byte-stable (T014).
- **D3 — `ShowcaseItem`** reuses `ProofView`/`LibraryClipView` (additive; both byte-stable — T001/T014).
- **D4 — own item, not ProofCard**: the public-style `showcase-item` omits ProofCard's consent dot /
  "Unreviewed" / "Make" chrome; ProofCard byte-unchanged (T004/T014).
- **D5 / A-11 — defer the cluster**: no LIVE / "Add from library" / presets / embed / "Copy embed" / publish
  — curation is coupled to publishing, so the whole cluster lands at T9 (T012).
- **P-VII**: visibility uses the shared `effectiveConsentGranted`; Leo M.'s proof + clip withheld, verified
  on the wall (T008); withheld rows retained.
- **FR-019**: owned values only; clips as honest sample/preview; no metrics (T013).
- **Byte-stable**: ProofCard, all shared view shapes, every existing read (incl. unfiltered `getProofs`),
  `schema.ts` unchanged; no new dependency (T014).
- **Uncommitted hand-off**: implementation leaves EVERYTHING uncommitted; Cornel commits manually (T017).
- Out of scope (do NOT build): publishing/embedding/sharing/public URLs/the public `/showcase[/slug]` page
  (T9), curation + the proof picker (T9, coupled to publishing), the real render engine (T8); any schema
  change; any new dependency.
