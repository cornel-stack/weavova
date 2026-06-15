---
description: "Task list for T2.1 — Workspace Dashboard (the spine begins)"
---

# Tasks: T2.1 — Workspace Dashboard (the spine begins)

**Input**: Design documents from `specs/T2.1-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{dashboard-summary,db-retry,error-state}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Tests**: NOT requested for this slice — no test runner in the repo (as in T1). Verification is via
`npm run typecheck` / `lint` / `build`, CI, the rendered `/app` screen, and the `quickstart.md` DoD
checks. No test tasks are generated.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> scaffolded, or installed. Execution happens in `/speckit.implement` after human approval.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US5 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one commit.

---

## Phase 1: Setup (the data path — blocks the page)

- [x] T001 [P] Create the reusable cold-start retry wrapper `src/db/with-retry.ts`: `withDbRetry<T>(operation, { attempts=3, baseDelayMs≈250 })` + an `isTransientDbError(err)` classifier. Retry ONLY transient Neon signals (network/`fetch failed`, connection terminated/reset, timeout, HTTP 5xx); rethrow everything else immediately (SQL/constraint, and the `DATABASE_URL is not set` error from `getDb()`); default unknown → non-transient. Short fixed backoff, bounded total; rethrow last error on exhaustion; never log secrets. Per `contracts/db-retry.md`. → FR-013, FR-014
- [x] T002 Add `getDashboardSummary(workspaceId)` + the `DashboardSummary` / `LatestClipDescriptor` types to `src/db/queries.ts` (Drizzle only), wrapped in one `withDbRetry` boundary. Workspace-scoped: a counts aggregate (`proofThisWeek` = `capturedAt >= now() - 7 days`; `needsReview` = `reviewed = false`; `totalProof`) + one `order by capturedAt desc limit 7` fetch reusing the existing `proofColumns` + `latestConsentState` + `toView` (element 0 → `heroProof`, 1..6 → `recentProof`). Real-date windows (never anchored to newest proof). `clipsThisMonth: 0` and `latestClip: null` returned as constants, each with a `// T2.4` swap comment. Per `contracts/dashboard-summary.md` + `data-model.md`. → FR-002, FR-004, FR-005, FR-005a, FR-019, A-02, A-08
- [x] T003 [P] Wrap the existing `getDefaultWorkspace()` body in `src/db/queries.ts` with `withDbRetry` so the T1 layout's workspace read is cold-start hardened. Do NOT edit the session seam `src/lib/session.ts`. → FR-013

**Checkpoint**: the single workspace-scoped dashboard read + the reusable retry wrapper exist; both DB reads the dashboard depends on are retry-hardened.

---

## Phase 2: Foundational (the dashboard route scaffold — BLOCKS user stories)

**⚠️ CRITICAL**: the route + body + skeleton must exist before the story sub-components plug in.

- [x] T004 Replace the placeholder `src/app/app/page.tsx` with the Server dashboard page: resolve the workspace via `getCurrentWorkspace()` (cheap, retry-hardened) and render `<Suspense fallback={<DashboardSkeleton/>}><DashboardBody workspaceId={ws.id}/></Suspense>` inside the existing AppChrome `<main>`. Inherits the segment's `force-dynamic` (from the T1 layout). → FR-001, FR-011
- [x] T005 [P] Create `src/components/app/dashboard/dashboard-skeleton.tsx` (Server): a token-only skeleton preserving the page layout (masthead / KPI strip / hero / recent-grid placeholders) using Pressroom tokens; respects the global reduced-motion rule. Used by the page Suspense fallback and `loading.tsx`. → FR-011
- [x] T006 Create `src/components/app/dashboard/dashboard-body.tsx` (async Server): call `getDashboardSummary(workspaceId)`; if `totalProof === 0` render `<DashboardEmpty/>`; else compose `<DashboardMasthead summary/>` + `<DashboardHero proof={summary.heroProof}/>` + the recent-proof grid. The integrator the story phases fill in. → FR-002, FR-006, FR-008, FR-012

**Checkpoint**: `/app` mounts the dashboard route, streams the skeleton, then the (empty-aware) body; build green without `DATABASE_URL`.

---

## Phase 3: User Story 1 — Land on the dashboard and see what just arrived (Priority: P1) 🎯 MVP

**Goal**: the masthead greeting, the latest-proof hero, and the recent-proof grid render from real workspace data.
**Independent Test**: seed + open `/app`; greeting + hero (most-recent proof, quote/transcript largest) + recent grid (canonical ProofCard, most-recent-first, hero not duplicated) all render from fixtures, nothing hardcoded (quickstart §1).

- [x] T007 [US1] Create `src/components/app/dashboard/dashboard-masthead.tsx` (Server): the greeting line — time-of-day (server time, A-05) + the signed-in first name from `getSession()` + the `needsReview` count ("Good afternoon, Maya — N to review…", A-01) — plus the section frame and the "Latest proof" / "Recent proof" labels, with layout slots for the KPI strip (US2) and the Request-proof action (US3). Quiet chrome, tokens only. → FR-003, FR-017 (P-II)
- [x] T008 [US1] Create `src/components/app/dashboard/dashboard-hero.tsx` (Server): the latest-proof hero ported from screen 01 — the customer's quote/transcript in Fraunces (or honest media placeholder) as the largest, warmest element; verified mark, source, effective consent state + capture date; the "Make a clip" **persimmon** CTA rendered ONLY when `consentState === "granted"` (inert per US4-independent — present-but-not-wired, no error). Reuses `ProofView`; omits the unbacked product/variant line (A-06). → FR-006, FR-007 (P-II, P-VII)
- [x] T009 [US1] In `dashboard-body.tsx`, render the recent-proof grid: map `summary.recentProof` → the **byte-unchanged** canonical `ProofCard` (`src/components/proof-card.tsx`), most-recent-first, hero excluded; include the "View all in the inbox →" link as an `<a href="/app/proof">` (existing T1 placeholder; non-erroring). → FR-008, FR-009 (P-II, P-V)

**Checkpoint**: the dashboard renders the greeting, hero, and recent grid from real data — MVP.

---

## Phase 4: User Story 2 — Read at-a-glance numbers computed from real data (Priority: P1)

**Goal**: the KPI strip shows computed numbers (and the honest clip cells), never hardcoded.
**Independent Test**: change a fixture (toggle `reviewed`, add/remove a proof), reseed, reload — KPI numbers + greeting count change with no page-code edit; "clips made" reads 0 and the latest-clip slot is empty with no view figure (quickstart §2,4).

- [x] T010 [US2] Create `src/components/app/dashboard/dashboard-kpis.tsx` (Server) and slot it into the masthead: the 4-up strip ported from screen 01 — "proof collected this week" (`proofThisWeek`), "needs review / awaiting you" (`needsReview`), "clips made this month" (`clipsThisMonth`, honest **0**), and the latest-clip slot (`latestClip`, honest empty until T2.4 — internal descriptors only, **no view/engagement number**). Values from `DashboardSummary`; none hardcoded. → FR-004, FR-005, FR-005a, FR-019 (P-IV)

**Checkpoint**: the masthead KPI strip is fully data-driven; clip cells are honestly empty.

---

## Phase 5: User Story 3 — Reach the primary action: request more proof (Priority: P2)

**Goal**: the "Request proof" persimmon primary action is present and keyboard-reachable.
**Independent Test**: "Request proof" shows in the masthead as the single persimmon primary action, is keyboard-focusable, and does nothing on activate without erroring (quickstart §6).

- [x] T011 [US3] Add the "Request proof" primary action to `dashboard-masthead.tsx`: a `<button type="button">` styled as the **persimmon** primary action (persimmon-scarcity rule), keyboard-focusable with a visible focus ring, no handler / no destination (present-but-not-wired; must not error). → FR-010 (P-IV)

**Checkpoint**: the screen's primary call-to-action is present and on-brand.

---

## Phase 6: User Story 4 — Survive a cold database and degrade gracefully (Priority: P2)

**Goal**: loading skeleton + transparent retry; one shared themed error (page + layout) with retry; no raw error leakage.
**Independent Test**: a transient cold-start recovers behind the skeleton with no error; a genuine page-read failure shows `<ErrorState>` inside the chrome; a genuine workspace-read failure shows the same `<ErrorState>` full-page; "Try again" recovers; no raw error text anywhere (quickstart cold-start §).

- [x] T012 [US4] [P] Create the shared `src/components/app/error-state.tsx` (presentational): on-token error panel with a title, a safe generic message, and a single **persimmon** retry action bound to an `onRetry` prop. Never renders raw `error.message`/`stack`/`digest` or any connection string. Per `contracts/error-state.md`. → FR-014
- [x] T013 [US4] Create `src/app/app/error.tsx` (`"use client"`, page-segment boundary): renders `<ErrorState onRetry={reset}/>` inside the persisting AppChrome when the dashboard's own read throws past the retry budget. → FR-014
- [x] T014 [US4] Create the **root** `src/app/error.tsx` (`"use client"`): catches a throw in `app/app/layout.tsx` (the workspace read — a segment's own `error.tsx` cannot catch its own layout) and renders the **same** `<ErrorState onRetry={reset}/>` full-page. **Do NOT add `global-error.tsx`** and make no other chrome change. → FR-013, FR-014 (approved adjustment)
- [x] T015 [US4] [P] Create `src/app/app/loading.tsx` rendering `<DashboardSkeleton/>` (the route-segment loading fallback for client navigations into `/app`; complements the page-level Suspense). → FR-011

**Checkpoint**: loading, transparent retry, and both error boundaries (one shared UI) behave per spec; no `global-error.tsx`.

---

## Phase 7: User Story 5 — A new workspace with no proof yet (Priority: P3)

**Goal**: an honest empty state when the workspace has no proof.
**Independent Test**: point at a zero-proof workspace — greeting renders, all proof KPIs read 0, no hero, an empty panel points to Request proof, no broken regions (quickstart §7).

- [x] T016 [US5] Create `src/components/app/dashboard/dashboard-empty.tsx` (Server) and render it from `dashboard-body.tsx` when `totalProof === 0`: an on-token empty panel directing the user to "Request proof"; the masthead greeting still renders and all proof-derived KPIs read 0; no hero/grid. → FR-012 (P-V)

**Checkpoint**: the zero-proof first-run path is graceful.

---

## Phase 8: Polish & Definition of Done

- [x] T017 [P] Port-fidelity + token audit: the masthead/KPI/hero/grid match `/design-reference` screen 01 (no reinvented layout/restyle); only on-token colour/type/radii/spacing/motion; **persimmon ONLY** on Request proof, the hero "Make a clip", and the verified mark (inside ProofCard). → P-IV, P-V
- [x] T018 [P] "Customer is the headline" check: on the hero and every grid card the verbatim quote / honest media is the largest, warmest element; greeting, KPIs, labels, and chrome stay quiet. → P-II
- [x] T019 [P] States verified: loading (Suspense skeleton + `loading.tsx`), empty, and error (page-segment + root boundary, both rendering the shared `<ErrorState>` with retry, no raw error); confirm **no `global-error.tsx`** exists. → FR-011, FR-012, FR-013, FR-014
- [x] T020 [P] Responsive (480 / 1024 / 1280 + 1240px max — KPI/hero/grid reflow, no horizontal scroll/overlap) + keyboard (Request proof, hero CTA when present, "View all in the inbox", each ProofCard control reachable with visible focus). → FR-015, FR-016
- [x] T021 [P] Consent gate: no "Make" / "Make a clip" offered for `awaiting`/`revoked` proof on the hero or in the grid (seed includes a revoked: Leo M.). → FR-007, SC-004 (P-VII)
- [x] T022 [P] Unchanged-artifacts + no-new-dep gate: `git diff --quiet HEAD -- src/components/proof-card.tsx` (byte-identical) and `src/lib/session.ts src/db/schema.ts src/db/seed.ts` unchanged; no dependency added to `package.json`. → FR-008, FR-018, SC-007
- [x] T023 [P] Microcopy: section labels exactly "Latest proof" / "Recent proof" / "View all in the inbox →"; no "amazing"/"awesome", no emoji; `<ErrorState>` message exposes no raw error text. → FR-017 (P-XI)
- [x] T024 Run `npm run typecheck`, `npm run lint`, `npm run build` — all green (incl. without `DATABASE_URL`); run `quickstart.md` validation; confirm the `CLAUDE.md` SPECKIT pointer already targets this plan. Then **STOP and report**; do not advance to T2.2 until the human says to proceed (P-IX). → SC-002, SC-005, DoD

**Checkpoint**: Definition of Done met — renders on real data; empty/loading/error handled; responsive; on-token; keyboard-accessible; builds green.

---

## Dependencies & Execution Order

- **Setup (T001–T003)** → first. T001 (retry wrapper) before T002/T003 (both use it). T002 + T003 edit `src/db/queries.ts` (sequence them; not [P] with each other on that file — T003 marked [P] only relative to T001/UI).
- **Foundational (T004–T006)** → depends on Setup. T004 (page) references T005 (skeleton) + T006 (body); T006 calls `getDashboardSummary` (T002) and composes the story components below.
- **US1 (T007–T009)** → depends on Foundational. T007 (masthead) + T008 (hero) are different files [P]; T009 edits the body (after T006).
- **US2 (T010)** → depends on US1 (slots into the masthead, T007).
- **US3 (T011)** → depends on US1 (edits the masthead, T007).
- **US4 (T012–T015)** → T012 (shared ErrorState) before T013/T014 (both consume it); T013/T014 are different files [P after T012]; T015 (loading.tsx) uses the skeleton (T005), independent [P].
- **US5 (T016)** → depends on Foundational (body branch, T006).
- **Polish (T017–T024)** → after the stories.

## Parallel Opportunities

- Setup: T001 and T003 are [P] (different concerns); T002 follows T001.
- US1: T007 (masthead) and T008 (hero) — different files.
- US4: T013 (page error.tsx) and T014 (root error.tsx) after T012; T015 (loading.tsx) independent.
- Polish: T017–T023 are independent checks (different concerns); T024 last.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 — the dashboard renders the greeting, hero, and recent grid from real data.
- Then US2 (KPI strip) → US3 (Request proof) → US4 (loading/retry/error) → US5 (empty) → Polish/DoD.
- Commit after each task (one commit each). Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-013, FR-014 |
| T002 | FR-002, FR-004, FR-005, FR-005a, FR-019 (A-02, A-08) |
| T003 | FR-013 |
| T004 | FR-001, FR-011 |
| T005 | FR-011 |
| T006 | FR-002, FR-006, FR-008, FR-012 |
| T007 | FR-003, FR-017 (P-II) |
| T008 | FR-006, FR-007 (P-II, P-VII) |
| T009 | FR-008, FR-009 (P-V) |
| T010 | FR-004, FR-005, FR-005a, FR-019 (P-IV) |
| T011 | FR-010 (P-IV) |
| T012 | FR-014 |
| T013 | FR-014 |
| T014 | FR-013, FR-014 |
| T015 | FR-011 |
| T016 | FR-012 (P-V) |
| T017 | P-IV, P-V |
| T018 | P-II |
| T019 | FR-011, FR-012, FR-013, FR-014 |
| T020 | FR-015, FR-016, SC-003 |
| T021 | FR-007, SC-004 (P-VII) |
| T022 | FR-008, FR-018, SC-007 |
| T023 | FR-017 (P-XI) |
| T024 | SC-002, SC-005, DoD |

## Notes

- 24 atomic tasks; 0 test tasks (no runner; verification via typecheck/lint/build + CI + quickstart).
- **ProofCard stays byte-unchanged** (T009 consumes it; T022 gates it). The hero is a *separate* larger
  component, not an edit to ProofCard.
- **One shared `<ErrorState>`** (T012) is reused by both the page-segment boundary (T013) and the root
  boundary (T014, which exists specifically to catch the `/app` layout's workspace-read failure). **No
  `global-error.tsx`** (T014/T019); no other chrome change.
- The clip cells are **computed-not-hardcoded**: `clipsThisMonth: 0` / `latestClip: null` flow through
  `getDashboardSummary` with `// T2.4` swap markers; **no external view/engagement metric** anywhere
  (FR-019).
- Windows are **real-date** (FR-004/A-02). A sparse-looking demo is a **data** condition fixed by the
  out-of-slice T0.3 relative-date seed amendment (A-10) — NOT by changing this logic or the seed here.
- Inert affordances: "Request proof" (T011) + hero "Make a clip" (T008) are no-op buttons; "View all in
  the inbox →" (T009) links to the existing `/app/proof` placeholder.
- Out of scope (do NOT build): the proof inbox / detail / clip studio (T2.2–T2.4), the request-proof
  flow, any schema/seam/seed change, the seed amendment (A-10), and any new dependency.
