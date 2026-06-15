---
description: "Task list for T2.2 — Proof Inbox (the spine continues)"
---

# Tasks: T2.2 — Proof Inbox (the spine continues)

**Input**: Design documents from `specs/T2.2-proof-inbox/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{queries-workspace-scoped,inbox-derivation}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Tests**: NOT requested for this slice — no test runner in the repo (as in T1/T2.1). Verification is via
`npm run typecheck` / `lint` / `build`, CI, the rendered `/app/proof` screen, and the `quickstart.md`
DoD checks. No test tasks are generated.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> scaffolded, or installed. Execution happens in `/speckit.implement` after human approval.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US5 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one commit.

---

## Phase 1: Setup (the data path — blocks the page)

- [X] T001 [P] Scope the proof list read in `src/db/queries.ts`: change `getProofs()` →
  **`getProofs(workspaceId: string): Promise<ProofView[]>`** — add `where proof.workspaceId = $ws` to the
  existing `proofColumns` + `latestConsentState` projection, keep the `order by capturedAt desc`, reuse
  the `toView` mapper, and wrap the body in **one `withDbRetry`** boundary (T2.1, `src/db/with-retry.ts`).
  No schema/seed/`ProofView` change. Per `contracts/queries-workspace-scoped.md`. → FR-002, FR-015 (P-VI)
- [X] T002 Scope the single-proof read in `src/db/queries.ts`: change `getProof(id)` →
  **`getProof(workspaceId: string, id: string): Promise<ProofView | null>`** — add the workspace
  predicate (a proof from another workspace resolves to `null`), wrap in `withDbRetry`. No T2.2 caller
  beyond the optional placeholder; the signature is fixed now so T2.3 is mechanical. Same file as T001 →
  sequence after it. Per `contracts/queries-workspace-scoped.md`. → FR-002 (P-VI, T2.3 prep)
- [X] T003 Update the only existing `getProofs()` caller, `src/app/styleguide/data/page.tsx`: resolve a
  workspace via `getCurrentWorkspace()` and pass `ws.id` to `getProofs(ws.id)` (internal styleguide page;
  keeps the build green). Different file from T001/T002; depends on T001's new signature. → FR-002, FR-022

**Checkpoint**: `getProofs`/`getProof` are workspace-scoped and retry-hardened; the lone existing caller
compiles; no schema/seed/seam change.

---

## Phase 2: Foundational (the inbox route scaffold — BLOCKS user stories)

**⚠️ CRITICAL**: the route + skeleton + integrator must exist before the story components plug in.

- [X] T004 Replace the placeholder `src/app/app/proof/page.tsx` with the Server inbox page: resolve the
  workspace via `getCurrentWorkspace()` (cheap, retry-hardened) and render
  `<Suspense fallback={<InboxSkeleton/>}><InboxData workspaceId={ws.id}/></Suspense>` inside the existing
  AppChrome `<main>`. Inherits the segment's `force-dynamic` (from the T1 layout). → FR-001, FR-016
- [X] T005 [P] Create `src/components/app/proof-inbox/inbox-skeleton.tsx` (Server): a token-only skeleton
  preserving the page layout (sub-header / toolbar row / masonry-Wall placeholders) using Pressroom
  tokens; respects the global reduced-motion rule. Used by the page Suspense fallback and `loading.tsx`.
  → FR-016
- [X] T006 Create `src/components/app/proof-inbox/inbox-data.tsx` (async Server): call
  `getProofs(workspaceId)`; if `proofs.length === 0` render `<InboxEmpty/>` (US5, T016); else render
  `<InboxClient proofs={proofs}/>` (US1, T008). The integrator the story phases fill in. → FR-002, FR-017

**Checkpoint**: `/app/proof` mounts the inbox route and streams the skeleton; the integrator's two
branches (`<InboxEmpty/>`, `<InboxClient/>`) are wired once their components land in US1/US5.

---

## Phase 3: User Story 1 — See all proof in the workspace (Priority: P1) 🎯 MVP

**Goal**: the masonry Wall renders every proof in the workspace as the byte-unchanged canonical
ProofCard, with an honest "{shown} of {total} pieces of proof" count.
**Independent Test**: seed + open `/app/proof`; the Wall renders every seeded-workspace proof via the
workspace-scoped query, each as the canonical ProofCard, the customer's words/media leading, and the
count matches the data — nothing hardcoded (quickstart §1).

- [X] T007 [US1] Create `src/components/app/proof-inbox/inbox-wall.tsx` (`"use client"`): the masonry Wall
  via **CSS multi-column** (`columns-1 sm:columns-2 lg:columns-3`, column `gap`, each item
  `break-inside-avoid` + a bottom margin) — no JS masonry library — mapping `ProofView[]` → the
  **byte-unchanged** canonical `ProofCard` (`src/components/proof-card.tsx`), one card per proof. Stretched-
  link overlay deferred to US4 (T014). Per research D3. → FR-003, FR-018 (P-II, P-V)
- [X] T008 [US1] Create `src/components/app/proof-inbox/inbox-client.tsx` (`"use client"`): receive the
  full workspace `ProofView[]`, hold the default toolbar state (`status:'all'`, `type:'all'`, `search:''`,
  `sort:'newest'`), compute `{shown, total}` (`total = proofs.length`), render the
  **"{shown} of {total} pieces of proof"** count in the sub-header region + `<InboxWall proofs={...}/>`,
  and reserve a slot for the toolbar controls (filled in US2/US3). Counts computed, never fabricated. Per
  `contracts/inbox-derivation.md`. → FR-003, FR-011 (P-II)

**Checkpoint**: the inbox renders the Wall of every workspace proof + the honest count — MVP.

---

## Phase 4: User Story 2 — Filter and search to find specific proof (Priority: P1)

**Goal**: status chips, type chips, and "Search proof" narrow the Wall and the count; a zero-match
filter shows a distinct filtered-empty state.
**Independent Test**: apply each status chip, each type chip, and a search term; the Wall and the count
show exactly the matching proof (computed), combining filters narrows (AND); a no-match filter shows the
filtered-empty panel with a working clear-filters action (quickstart §3–6).

- [X] T009 [US2] Create `src/components/app/proof-inbox/inbox-toolbar.tsx` (`"use client"`): the screen-02
  toolbar controls (driven by props + setters from `inbox-client`) — the **status** chip group (All / New
  / Reviewed / Awaiting consent, single-select), the **type** chip group (All types / Video / Text / Photo
  / Audio, single-select), the **"Search proof"** field, and the inert **"Request proof"** (persimmon
  primary, no-op) + **"Add proof"** (ink secondary, no-op) entry-points — both keyboard-reachable and
  non-erroring (A-11). **Do NOT render** the Wall/List toggle, "Make clips", "Select all ready", or
  per-proof selection. Sort control deferred to US3 (T012). → FR-005, FR-006, FR-007, FR-014a, FR-014b,
  FR-021 (A-11)
- [X] T010 [US2] Extend `src/components/app/proof-inbox/inbox-client.tsx`: add `status`/`type`/`search`
  state + setters and the `useMemo` derivation — status → type → search, **AND-combined**, search
  case-insensitive over `customerName` + (`quote ?? transcript`) + `source` — mount `<InboxToolbar .../>`
  in the reserved slot, and update `{shown, total}` from the derived list. Per `contracts/inbox-derivation.md`.
  → FR-005, FR-006, FR-007, FR-008 (SC-003)
- [X] T011 [US2] Add the **filtered-empty** branch to `src/components/app/proof-inbox/inbox-client.tsx`:
  when `visible.length === 0 && total > 0`, render a distinct "no matches" panel with a **clear-filters**
  control that resets `status`/`type`/`search` to defaults and re-shows the Wall — distinct from the
  no-proof-at-all `<InboxEmpty/>` (US5). → FR-017 (SC-006)

**Checkpoint**: filtering, type-filtering, and search narrow the Wall and the count together; the
filtered-empty state is distinct and clearable.

---

## Phase 5: User Story 3 — Sort the proof (Priority: P2)

**Goal**: "Newest" orders the Wall by capture time; "Warmest" is visible-but-disabled and never reorders.
**Independent Test**: select "Newest" → Wall orders by `capturedAt` descending (computed); "Warmest" is
visible but disabled (not selectable, accessible "coming soon") and never reorders or fabricates an order
(quickstart §7).

- [X] T012 [US3] Add the **sort** control to `src/components/app/proof-inbox/inbox-toolbar.tsx`:
  **"Sort · Newest"** working + **"Warmest"** rendered **disabled** (`aria-disabled` + a clear, accessible
  "coming soon" affordance), never settable. Shape the control so the real warmth ranking slots in at
  T4/B3 with **no relayout** — the option exists now and only gains its data source later. No owned-data
  proxy ordering. Per research D4. → FR-009, FR-010, FR-019 (A-10, A-11)
- [X] T013 [US3] Add the **sort** step to `src/components/app/proof-inbox/inbox-client.tsx` derivation:
  `newest` → `capturedAt` descending (the default); `warmest` is never a settable value, so it is never
  applied. Per `contracts/inbox-derivation.md`. → FR-009 (FR-019)

**Checkpoint**: "Newest" sorts from data; "Warmest" is an honest disabled "coming soon", never reordering.

---

## Phase 6: User Story 4 — Open a proof toward its detail (Priority: P2)

**Goal**: each Wall card navigates to `/app/proof/[id]` without modifying the ProofCard; the detail route
exists as a minimal placeholder.
**Independent Test**: activate a card (pointer or keyboard) → navigates to `/app/proof/[id]`, which
renders a minimal placeholder (real detail = T2.3) and does not 404/error; the card's own "Make" stays
independently clickable (quickstart §8).

- [X] T014 [US4] Add the **stretched-link overlay** to `src/components/app/proof-inbox/inbox-wall.tsx`:
  wrap each `<ProofCard/>` in a `relative` container with a **sibling** absolutely-positioned
  `<Link href={`/app/proof/${id}`} className="absolute inset-0" aria-label="Open {customerName}'s proof"/>`;
  keep the ProofCard's "Make" button above the overlay (stacking) so it stays independently clickable.
  The ProofCard stays **byte-unchanged**; no `<button>`-inside-`<a>` nesting. Per research D1. → FR-012,
  FR-020 (A-06)
- [X] T015 [US4] [P] Create `src/app/app/proof/[id]/page.tsx` — a **minimal Server placeholder** for the
  proof detail (the real detail is T2.3); renders without erroring. → FR-012 (A-09)

**Checkpoint**: a card opens `/app/proof/[id]` (placeholder) via a real link, ProofCard untouched, "Make"
still works.

---

## Phase 7: User Story 5 — The inbox is reliable and handles its states (Priority: P2)

**Goal**: explicit loading, transparent cold-start retry, a shared retryable error, and an honest
no-proof-at-all empty state — reusing the T2.1 building blocks.
**Independent Test**: a transient cold start recovers behind the skeleton with no error; a persistent
failure shows the shared `<ErrorState>` with retry (no raw error); a zero-proof workspace shows the
no-proof empty state, distinct from filtered-empty (quickstart "States validation").

- [X] T016 [US5] Create `src/components/app/proof-inbox/inbox-empty.tsx` (Server): the **no-proof-at-all**
  empty state (capture-oriented copy), rendered by `inbox-data` (T006) when `proofs.length === 0`; the
  filter/sort chrome stays quiet or hidden as appropriate. Distinct from the client filtered-empty (T011).
  → FR-017
- [X] T017 [US5] [P] Create `src/app/app/proof/loading.tsx` (Server): the route-segment loading fallback
  rendering `<InboxSkeleton/>` (complements the page-level Suspense for client navigations into
  `/app/proof`). → FR-016
- [X] T018 [US5] [P] Create `src/app/app/proof/error.tsx` (`"use client"`, page-segment boundary):
  renders the **shared** `src/components/app/error-state.tsx` as `<ErrorState onRetry={reset}/>` inside the
  persisting AppChrome when the inbox read throws past the retry budget; no raw `error.message`/`digest`.
  Reuses T2.1's `<ErrorState>` unchanged; the root `src/app/error.tsx` (T2.1) still covers the layout's
  workspace read — unchanged here. → FR-015, FR-016

**Checkpoint**: loading, transparent retry, the shared error, and the no-proof empty state behave per
spec; `<ErrorState>` / `with-retry` / root `error.tsx` reused unchanged.

---

## Phase 8: Polish & Definition of Done

- [X] T019 [P] Port-fidelity + token audit: the sub-header / toolbar / masonry Wall match
  `/design-reference` screen 02 (no reinvented layout/restyle); only on-token colour/type/radii/spacing/
  motion; **persimmon ONLY** on "Request proof" and the ProofCard's Make/verified mark — chips, search,
  sort, "Add proof", and the count are ink. → P-IV, P-V
- [X] T020 [P] "Customer is the headline" check: on every Wall card the verbatim quote / honest media is
  the largest, warmest element; the toolbar chips, search, sort, count, and inert actions stay quiet
  chrome. → P-II
- [X] T021 [P] States verified: loading (Suspense skeleton + `loading.tsx`), **both** empty states
  (no-proof `<InboxEmpty/>` vs client filtered-empty with a working clear-filters), and error
  (page-segment boundary → shared `<ErrorState>` with retry, no raw error); confirm **no
  `global-error.tsx`** is added and the root `src/app/error.tsx` is unchanged. → FR-016, FR-017
- [X] T022 [P] **A-11 hidden-vs-inert audit**: the Wall/List toggle is **NOT rendered**; "Make clips",
  "Select all ready", and per-proof selection are **NOT rendered**; "Request proof" (persimmon) + "Add
  proof" (ink) are **present-but-inert** (keyboard-reachable, no-op, never error); "Warmest" is
  **disabled-in-dropdown** while "Newest" works. → FR-010, FR-013, FR-014a, FR-014b, FR-014c (A-11, A-12)
- [X] T023 [P] Responsive (480 / 1024 / 1280 + 1240px max — the Wall reflows its columns, the toolbar
  stays usable, no horizontal scroll/overlap) + keyboard (status chips, type chips, "Search proof", sort,
  and each card's overlay link + "Make" reachable with visible focus). → FR-018, FR-020 (SC-007)
- [X] T024 [P] Consent gate: no "Make" action is offered for any proof whose effective consent state is
  not "granted" anywhere in the Wall (seed includes a revoked: Leo M.) — inherited from the unchanged
  ProofCard. → FR-004, SC-004 (P-VII)
- [X] T025 [P] **Unchanged-artifacts + no-new-dep gate**: `git diff --quiet HEAD -- src/components/proof-card.tsx`
  (byte-identical); `src/components/app/error-state.tsx`, `src/db/with-retry.ts`, `src/app/error.tsx`,
  `src/lib/session.ts`, `src/db/schema.ts`, `src/db/seed.ts` unchanged; **no dependency** added to
  `package.json`/`package-lock.json` (masonry via CSS columns, not a JS lib). → FR-022, SC-008
- [X] T026 [P] **No-fabricated-counts + data-ownership** check: "{shown} of {total} pieces of proof" is
  computed from the workspace set (change a fixture → count changes, no code edit); no social/platform
  view/reach/engagement number and no un-owned "warmth" metric is displayed or sorted by. → FR-011,
  FR-019 (SC-002, SC-003)
- [X] T027 [P] Microcopy: the status/type chip labels, "Search proof", "{n} of {n} pieces of proof", and
  "Sort · Newest" match screen 02; no "amazing"/"awesome", no emoji; `<ErrorState>` exposes no raw error
  text. → FR-021 (P-XI)
- [X] T028 Run `npm run typecheck`, `npm run lint`, `npm run build` — all green (incl. **without
  `DATABASE_URL`** — CI parity); run `quickstart.md` validation; confirm the `CLAUDE.md` SPECKIT pointer
  targets this plan. Then **STOP and report**; do not run `/speckit.implement` or advance to T2.3 until
  the human says to proceed (P-IX). → SC-002, SC-005, DoD

**Checkpoint**: Definition of Done met — renders on real (fixture) data; empty (two kinds) / loading /
error handled; responsive; on-token; keyboard-accessible; ProofCard byte-unchanged; builds green.

---

## Dependencies & Execution Order

- **Setup (T001–T003)** → first. T001 then T002 edit the **same** file `src/db/queries.ts` (sequence;
  not [P] with each other). T003 (different file) depends on T001's new signature.
- **Foundational (T004–T006)** → depends on Setup. T004 (page) references T005 (skeleton) + T006 (data);
  T006 calls `getProofs` (T001) and branches to `<InboxClient/>` (T008) / `<InboxEmpty/>` (T016).
- **US1 (T007–T008)** → depends on Foundational. T007 (Wall) before T008 (client renders the Wall + count).
- **US2 (T009–T011)** → depends on US1. T009 (toolbar) before T010 (client mounts it + derivation); T011
  (filtered-empty) extends the same client after T010.
- **US3 (T012–T013)** → depends on US2. T012 extends the toolbar (sort), T013 extends the client derivation.
- **US4 (T014–T015)** → depends on US1's Wall. T014 extends `inbox-wall.tsx`; T015 (`[id]` placeholder) is
  a different file [P].
- **US5 (T016–T018)** → T016 (empty) completes the Foundational `inbox-data` branch; T017 (`loading.tsx`)
  uses the skeleton (T005); T018 (`error.tsx`) reuses the shared `<ErrorState>` (T2.1). T017/T018 are
  different files [P].
- **Polish (T019–T028)** → after the stories; T028 last.

## Parallel Opportunities

- Setup: T001 is [P] relative to the UI; T002 follows T001 (same file); T003 follows T001.
- Foundational: T005 (skeleton) is [P]; T004/T006 sequence around it.
- US4: T015 (`[id]` placeholder) is [P] with T014.
- US5: T017 (`loading.tsx`) and T018 (`error.tsx`) are [P] after their reused pieces exist.
- Polish: T019–T027 are independent checks (different concerns); T028 last.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 — the inbox renders the workspace Wall + the honest count.
- Then US2 (filter/search) → US3 (sort) → US4 (navigation) → US5 (loading/retry/error/empty) → Polish/DoD.
- Commit after each task (one commit each). Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-002, FR-015 (P-VI) |
| T002 | FR-002 (T2.3 prep) |
| T003 | FR-002, FR-022 |
| T004 | FR-001, FR-016 |
| T005 | FR-016 |
| T006 | FR-002, FR-017 |
| T007 | FR-003, FR-018 (P-II, P-V) |
| T008 | FR-003, FR-011 (P-II) |
| T009 | FR-005, FR-006, FR-007, FR-014a, FR-014b, FR-021 (A-11) |
| T010 | FR-005, FR-006, FR-007, FR-008 (SC-003) |
| T011 | FR-017 (SC-006) |
| T012 | FR-009, FR-010, FR-019 (A-10, A-11) |
| T013 | FR-009 (FR-019) |
| T014 | FR-012, FR-020 (A-06) |
| T015 | FR-012 (A-09) |
| T016 | FR-017 |
| T017 | FR-016 |
| T018 | FR-015, FR-016 |
| T019 | P-IV, P-V |
| T020 | P-II |
| T021 | FR-016, FR-017 |
| T022 | FR-010, FR-013, FR-014a, FR-014b, FR-014c (A-11, A-12) |
| T023 | FR-018, FR-020 (SC-007) |
| T024 | FR-004, SC-004 (P-VII) |
| T025 | FR-022, SC-008 |
| T026 | FR-011, FR-019 (SC-002, SC-003) |
| T027 | FR-021 (P-XI) |
| T028 | SC-002, SC-005, DoD |

## Notes

- 28 atomic tasks; 0 test tasks (no runner; verification via typecheck/lint/build + CI + quickstart).
- **The one real data change** is the workspace-scoping of `getProofs`/`getProof` (T001–T002, the T2.1
  deferral), both retry-wrapped; the only existing caller is updated (T003). No schema/seed/seam change.
- **ProofCard stays byte-unchanged** (T007 consumes it; T014 navigates *around* it via the stretched-link
  overlay; T025 gates it). No selection checkbox is added (A-12).
- **Reused unchanged from T2.1**: `withDbRetry`, the shared `<ErrorState>`, the Suspense + `loading.tsx` +
  page `error.tsx` pattern, and the root `src/app/error.tsx` boundary (D5). Only inbox-specific UI is new.
- **Filter/sort/search run client-side in memory** over the fetched workspace set (D2) — one server read,
  instant interactions, no URL coupling; counts are computed, never fabricated (FR-008/011/019).
- **Masonry via CSS columns** (D3), no JS library — **no new dependency** (T025).
- **A-11 governs the not-yet controls**: Newest works / Warmest disabled-in-dropdown (T012); "Request
  proof" + "Add proof" present-but-inert (T009); the Wall/List toggle and the batch/selection cluster are
  **not rendered** (T022, A-12).
- **Two distinct empty states**: server no-proof-at-all `<InboxEmpty/>` (T016) vs client filtered-empty
  with clear-filters (T011) — never confused (FR-017).
- Out of scope (do NOT build): the proof **detail** (beyond the `[id]` placeholder, T015), clip studio,
  upload, batch studio, request-proof flow (T2.3+/T4); any schema/seam/seed change; any new dependency.
