---
description: "Task list for T2.3 — Proof Detail (the spine continues)"
---

# Tasks: T2.3 — Proof Detail (the spine continues)

**Input**: Design documents from `specs/T2.3-proof-detail/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{queries-proof-detail,detail-states}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Tests**: NOT requested for this slice — no test runner in the repo (as in T1/T2.1/T2.2). Verification is
via `npm run typecheck` / `lint` / `build`, CI, the rendered `/app/proof/[id]`, and the `quickstart.md`
DoD checks. No test tasks are generated.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> scaffolded, or installed. Execution happens in `/speckit.implement` after human approval.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US4 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one commit.

---

## Phase 1: Setup (the read — the one data change; blocks the page)

- [X] T001 [P] Add the detail-only read type to `src/lib/proof.ts`: **`ProofDetailView`** —
  `interface ProofDetailView extends ProofView { consentVersion: number | null; consentAt: string | null }`
  (the effective consent's version + ISO effective date). **Leave `ProofView` and `ProofCardProps`
  byte-unchanged** (superset only; the shared shape is untouched). Per `contracts/queries-proof-detail.md`.
  → FR-005, A-12 (P-VI)
- [X] T002 Upgrade `getProof` in `src/db/queries.ts` to return **`ProofDetailView | null`**: add two
  correlated subqueries mirroring the existing `latestConsentState` idiom — `latestConsentVersion`
  (`select version … order by version desc limit 1`) and `latestConsentEffectiveAt`
  (`select coalesce(revoked_at, granted_at, created_at) … order by version desc limit 1`) — a
  `detailColumns = { ...proofColumns, consentVersion, consentEffectiveAt }`, and a `toDetailView` mapper
  (`{ ...toView(row), consentVersion, consentAt: row.consentEffectiveAt?.toISOString() ?? null }`).
  `getProof` selects `detailColumns`, keeps the `and(eq(workspaceId), eq(id))` predicate + `limit(1)` +
  **`withDbRetry`**. **Leave `proofColumns`, `toView`, `latestConsentState`, and `getProofs` byte-unchanged.**
  Depends on T001's type. Per `contracts/queries-proof-detail.md` + `data-model.md`. → FR-002, FR-005,
  FR-013 (P-VI, P-VII)

**Checkpoint**: the single workspace-scoped detail read returns `ProofDetailView` (state + date + version),
retry-hardened; the shared `ProofView`/`getProofs`/ProofCard read path is untouched; no schema/seed change.

---

## Phase 2: Foundational (the detail route scaffold — BLOCKS user stories)

**⚠️ CRITICAL**: the route + skeleton + integrator (incl. the `notFound()` branch) must exist before the
story components plug in.

- [X] T003 Replace the placeholder `src/app/app/proof/[id]/page.tsx` with the Server detail page: `await`
  the route `params` (Next 15) to read `id`, resolve the workspace via `getCurrentWorkspace()` (cheap,
  retry-hardened), and render `<Suspense fallback={<ProofDetailSkeleton/>}><ProofDetailData
  workspaceId={ws.id} id={id}/></Suspense>` inside the existing AppChrome `<main>`. Inherits the segment's
  `force-dynamic` (from the T1 layout). → FR-001, FR-014
- [X] T004 [P] Create `src/components/app/proof-detail/proof-detail-skeleton.tsx` (Server): a token-only
  skeleton preserving the screen-03 layout (back link / two-column: content + side panel placeholders)
  using Pressroom tokens; respects the global reduced-motion rule. Used by the page Suspense fallback and
  `loading.tsx`. → FR-014
- [X] T005 Create `src/components/app/proof-detail/proof-detail-data.tsx` (async Server): call
  `getProof(workspaceId, id)`; if it returns **`null`** call Next's **`notFound()`** (the
  tenant-isolation / not-found branch — missing OR cross-workspace, US3, T011); else render
  `<ProofDetail proof={proof}/>` (US1, T006). The integrator the story phases fill in. → FR-002, FR-011

**Checkpoint**: `/app/proof/[id]` mounts the detail route and streams the skeleton; the integrator
branches `null → notFound()` vs `<ProofDetail/>` once those land in US3/US1.

---

## Phase 3: User Story 1 — Read one piece of proof in full (Priority: P1) 🎯 MVP

**Goal**: the screen-03 detail renders one proof — the customer's words as the headline, plus the
metadata — from the workspace-scoped read.
**Independent Test**: open a proof from the inbox; the detail renders inside the chrome with a "← Proof"
back link, the customer's words (transcript for media, quote for text) the largest element, and real
customer/source/date/type/verified/reviewed — nothing hardcoded (quickstart §1).

- [X] T006 [US1] Create `src/components/app/proof-detail/proof-detail.tsx` (Server): the screen-03 layout —
  the **"← Proof"** back `<Link href="/app/proof">`, the customer-name title, and the **two-column**
  content+side-panel frame. The **content column** leads with the customer's verbatim words
  (`transcript ?? quote`) in Fraunces as the largest, warmest element, with the conditional media slot
  (T008) above it. **No tab chrome** (Q3): the transcript is the content; no Suggested formats / Generated
  assets / Activity tabs, no "Use this as the hook". Composes the meta / consent / actions slots
  (T007/T009/T010). → FR-003, FR-010, FR-015, FR-016a (P-II, P-V)
- [X] T007 [US1] Create `src/components/app/proof-detail/proof-detail-meta.tsx` (Server): the side-panel
  metadata — customer name + the **verified-real-customer mark** (only when `verified`), the **source**
  label, the **captured date**, the **proof type**, and the **reviewed/unreviewed** state — all from
  `ProofDetailView`. Omits the unbacked product/variant line and capture-channel phrasing (FR-017). →
  FR-004, FR-017 (P-II)
- [X] T008 [US1] Create `src/components/app/proof-detail/proof-detail-media.tsx` (Server): a pure
  `hasMedia(proof)` predicate (true only when a real media reference exists — `proof.thumbnail` present on
  a media-type proof) gating the media region. When **absent** (every current fixture), the component
  **renders nothing** — no frame, poster, placeholder, or fake/disabled player. Same seam logic as the
  T2.1 clip cells; forward-compatible for real media (T7/T8). Per research D4. → FR-009, FR-019 (P-V)

**Checkpoint**: the detail renders one proof — words leading, metadata, conditional (absent) media, no tab
chrome — MVP.

---

## Phase 4: User Story 2 — Trust the proof is real, consented, and sourced (Priority: P1)

**Goal**: the consent panel (state + date + version, read-only) and the consent-gated, inert "Make a clip"
make the proof's permission and provenance trustworthy.
**Independent Test**: open proofs in each consent state (granted / awaiting / revoked); the panel shows the
honest state + date + version for each; "Make a clip" appears only for granted and offers no real action;
no asset path for awaiting/revoked (quickstart §2,3).

- [X] T009 [US2] Create `src/components/app/proof-detail/proof-detail-consent.tsx` (Server): the **consent
  panel** — the effective state + date + version, labelled by `consentState`: "Consent granted · {consentAt}
  · v{consentVersion}" / "Consent revoked · {consentAt} · v{consentVersion}" / "Awaiting consent ·
  v{consentVersion}" (date optional for awaiting). **Read-only** — no grant/revoke/edit control and no
  multi-version "Record" history (deferred). Values from `ProofDetailView` (owned data, never fabricated).
  → FR-005, FR-018 (P-VII)
- [X] T010 [US2] Create `src/components/app/proof-detail/proof-detail-actions.tsx` (Server): render the
  **"Make a clip"** action **only** — a persimmon primary `<button type="button">` that is
  **present-but-inert** (no handler, never errors; wired to the studio at T2.4) and **consent-gated**
  (rendered only when `consentState === "granted"`). **Do NOT render** "Carousel", "Embed", or "Ask this
  customer for more" (deferred whole to T4 / T5 / outreach — A-11). For non-granted proof, no action
  renders. → FR-006, FR-007, FR-016c (A-11, P-VII)

**Checkpoint**: consent is shown honestly (state + date + version) and the only action is the inert,
consent-gated "Make a clip"; non-granted proof offers no asset path.

---

## Phase 5: User Story 3 — A proof that isn't yours (or doesn't exist) is not revealed (Priority: P1)

**Goal**: a missing OR cross-workspace id renders one honest not-found state — no leak, no existence
oracle, distinct from the error state.
**Independent Test**: request `/app/proof/[id]` for a non-existent id and for an id in a different
workspace; both render the **same** not-found state (back-to-inbox, no proof content, no raw error), and it
is distinct from the error state (quickstart "tenant isolation" §).

- [X] T011 [US3] Create `src/app/app/proof/[id]/not-found.tsx` (Server): the route-segment not-found
  boundary that Next's `notFound()` (called in `proof-detail-data.tsx`, T005) routes to; renders
  `<ProofDetailNotFound/>` inside the persisting AppChrome. → FR-011, FR-012
- [X] T012 [US3] Create `src/components/app/proof-detail/proof-detail-not-found.tsx` (Server): an honest
  "proof not found" panel (on-token) with a **back-to-inbox** `<Link href="/app/proof">`. Renders **zero**
  proof content (no name/words/source/consent/metadata) and no raw error text — identical output whether
  the id is missing or in another workspace (no existence oracle). → FR-011 (SC-005)

**Checkpoint**: both not-found causes render one identical, content-free not-found state; tenant isolation
holds; not-found ≠ error.

---

## Phase 6: User Story 4 — The detail is reliable and handles its states (Priority: P2)

**Goal**: explicit loading, transparent cold-start retry, and a shared retryable error — distinct from
not-found — reusing the T2.1/T2.2 building blocks.
**Independent Test**: a transient cold start recovers behind the skeleton with no error; a persistent
failure shows the shared `<ErrorState>` with retry (no raw error), distinct from the not-found state
(quickstart "states" §).

- [X] T013 [US4] [P] Create `src/app/app/proof/[id]/loading.tsx` (Server): the route-segment loading
  fallback rendering `<ProofDetailSkeleton/>` (complements the page-level Suspense for client navigations
  into `/app/proof/[id]`). → FR-014
- [X] T014 [US4] [P] Create `src/app/app/proof/[id]/error.tsx` (`"use client"`, page-segment boundary —
  the **only** client file in this slice): renders the shared `src/components/app/error-state.tsx` as
  `<ErrorState onRetry={reset}/>` inside the persisting AppChrome when the detail read throws past the
  retry budget; no raw `error.message`/`digest`. `reset()` re-runs the **detail** read. Reuses T2.1's
  `<ErrorState>` unchanged; the root `src/app/error.tsx` (layout read) and the T2.2 inbox
  `src/app/app/proof/error.tsx` are unchanged. → FR-013, FR-014

**Checkpoint**: loading, transparent retry, and the shared error behave per spec, and are distinct from
the not-found state; `<ErrorState>` / `with-retry` reused unchanged.

---

## Phase 7: Polish & Definition of Done

- [X] T015 [P] Port-fidelity + token audit: the detail's content column / side panel / consent panel match
  `/design-reference` screen 03 (no reinvented layout/restyle); only on-token colour/type/radii/spacing/
  motion; **persimmon ONLY** on the "Make a clip" action and the verified mark — consent, metadata,
  back link are ink. → P-IV, P-V
- [X] T016 [P] "Customer is the headline" check: the customer's verbatim words (transcript/quote) are the
  largest, warmest element; with no media file no placeholder competes; metadata/consent/source/action
  stay quiet chrome. → P-II
- [X] T017 [P] States verified: loading (Suspense skeleton + `loading.tsx`); **not-found** for BOTH a
  non-existent id and a cross-workspace id renders the **same** content-free state (no existence oracle,
  SC-005); error (page-segment boundary → shared `<ErrorState>` with retry, no raw error); **not-found ≠
  error** confirmed. → FR-011, FR-012, FR-014 (SC-005, SC-006)
- [X] T018 [P] **A-11 hidden-vs-inert audit**: "Make a clip" is present-but-inert + consent-gated;
  **"Carousel" / "Embed" / "Ask this customer for more" are NOT rendered**; **no tab chrome** ("Suggested
  formats" / "Generated assets" / "Activity" not rendered, no fabricated "· N" count); "Use this as the
  hook" not rendered. → FR-007, FR-016a, FR-016b, FR-016c (A-11)
- [X] T019 [P] **FR-019 honesty audit**: no warmth/sentiment panel ("Glowing · NN/100"), no product/variant
  line, no reach/views/engagement anywhere; the consent date + version shown are **real** (from the
  `consent` table), not fabricated. → FR-008, FR-017, FR-019 (SC-007)
- [X] T020 [P] Consent gate: no asset action ("Make a clip") is offered for any proof whose effective
  consent state is not "granted" (seed includes a revoked: Leo M.); the panel still shows the honest
  awaiting/revoked state + date + version. → FR-006, SC-004 (P-VII)
- [X] T021 [P] **Byte-stable + no-new-dep gate**: `git diff --quiet HEAD -- src/components/proof-card.tsx`
  (byte-identical); in `src/lib/proof.ts` the `ProofView`/`ProofCardProps` block is unchanged (only
  `ProofDetailView` added); in `src/db/queries.ts` `getProofs`, `proofColumns`, `toView`, and
  `latestConsentState` are unchanged (only `getProof` + the new detail projection changed);
  `src/components/app/error-state.tsx`, `src/db/with-retry.ts`, `src/app/error.tsx`,
  `src/app/app/proof/error.tsx`, `src/lib/session.ts`, `src/db/schema.ts`, `src/db/seed.ts` unchanged; **no
  dependency** added to `package.json`/`package-lock.json`. → FR-023, SC-008
- [X] T022 [P] Responsive (480 / 1024 / 1280 + 1240px max — the two-column layout reflows to one column,
  no horizontal scroll/overlap) + keyboard (the "← Proof" back link, the "Make a clip" action where shown,
  reachable with visible focus). → FR-020, FR-021 (SC-008)
- [X] T023 [P] Microcopy: matches screen 03's wording where specified (the consent labels, "Make a clip",
  "← Proof"); honest about absent data; no "amazing"/"awesome", no emoji; `<ErrorState>` and the not-found
  panel expose no raw error text. → FR-022 (P-XI)
- [X] T024 Run `npm run typecheck`, `npm run lint`, `npm run build` — all green (incl. **without
  `DATABASE_URL`** — CI parity); run `quickstart.md` validation (incl. the tenant-isolation not-found
  checks); confirm the `CLAUDE.md` SPECKIT pointer targets this plan. Then **STOP and report**; do not run
  `/speckit.implement` or advance to T2.4 until the human says to proceed (P-IX). → SC-002, SC-005, DoD

**Checkpoint**: Definition of Done met — renders on real (fixture) data; not-found (tenant isolation) /
loading / error handled; responsive; on-token; keyboard-accessible; ProofView/getProofs/ProofCard
byte-stable; builds green.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → first. T001 (`ProofDetailView` type) before T002 (`getProof` projection uses it).
- **Foundational (T003–T005)** → depends on Setup. T003 (page) references T004 (skeleton) + T005 (data);
  T005 calls `getProof` (T002) and branches `null → notFound()` (US3) / `<ProofDetail/>` (US1).
- **US1 (T006–T008)** → depends on Foundational. T006 (layout) composes T007 (meta) + T008 (media) + the
  US2 consent/actions slots; T007/T008 are different files [P after T006's frame].
- **US2 (T009–T010)** → depends on US1's layout (slots into T006). T009 (consent) + T010 (actions) are
  different files [P].
- **US3 (T011–T012)** → T011 (`not-found.tsx`) routes to T012 (the panel); the `notFound()` call is in
  T005 (Foundational).
- **US4 (T013–T014)** → T013 (`loading.tsx`) uses the skeleton (T004); T014 (`error.tsx`) reuses the shared
  `<ErrorState>` (T2.1). Different files [P].
- **Polish (T015–T024)** → after the stories; T024 last.

## Parallel Opportunities

- Setup: T001 is [P] relative to the UI; T002 follows T001 (same data layer).
- Foundational: T004 (skeleton) is [P]; T003/T005 sequence around it.
- US1: T007 (meta) and T008 (media) — different files, after T006's frame.
- US2: T009 (consent) and T010 (actions) — different files.
- US4: T013 (loading) and T014 (error) — different files.
- Polish: T015–T023 are independent checks (different concerns); T024 last.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 — the detail renders one proof (words + metadata + conditional
  media) from the workspace-scoped read.
- Then US2 (consent + inert Make a clip) → US3 (tenant-isolation not-found) → US4 (loading/error) →
  Polish/DoD.
- Commit after each task (one commit each). Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-005, A-12 (P-VI) |
| T002 | FR-002, FR-005, FR-013 (P-VI, P-VII) |
| T003 | FR-001, FR-014 |
| T004 | FR-014 |
| T005 | FR-002, FR-011 |
| T006 | FR-003, FR-010, FR-015, FR-016a (P-II, P-V) |
| T007 | FR-004, FR-017 (P-II) |
| T008 | FR-009, FR-019 (P-V) |
| T009 | FR-005, FR-018 (P-VII) |
| T010 | FR-006, FR-007, FR-016c (A-11, P-VII) |
| T011 | FR-011, FR-012 |
| T012 | FR-011 (SC-005) |
| T013 | FR-014 |
| T014 | FR-013, FR-014 |
| T015 | P-IV, P-V |
| T016 | P-II |
| T017 | FR-011, FR-012, FR-014 (SC-005, SC-006) |
| T018 | FR-007, FR-016a, FR-016b, FR-016c (A-11) |
| T019 | FR-008, FR-017, FR-019 (SC-007) |
| T020 | FR-006, SC-004 (P-VII) |
| T021 | FR-023, SC-008 |
| T022 | FR-020, FR-021 (SC-008) |
| T023 | FR-022 (P-XI) |
| T024 | SC-002, SC-005, DoD |

## Notes

- 24 atomic tasks; 0 test tasks (no runner; verification via typecheck/lint/build + CI + quickstart).
- **The one real data change** is the `ProofDetailView` projection: `getProof` returns `ProofView` + the
  effective consent's date + version (T001–T002), workspace-scoped + retry-wrapped. **Projection-only** —
  `ProofView`, `ProofCardProps`, `getProofs`, `proofColumns`, `toView`, and the canonical ProofCard stay
  **byte-stable** (T021 gates this). No schema/seed/seam change.
- **Tenant isolation** is the US3 guarantee: scoped `getProof` returns `null` for a missing OR
  cross-workspace id (T002), the integrator maps `null → notFound()` (T005), and one identical,
  content-free not-found state renders (T011–T012) — **no existence oracle, no leak** (T017 audits it),
  **distinct** from the error boundary (T014).
- **Q1 conditional media** (T008): the media region renders only when the proof has media; absent for every
  fixture → renders nothing (no placeholder). **Q3 no tab chrome** (T006): transcript shown as content.
- **A-11**: "Make a clip" present-but-inert + consent-gated (T010); Carousel/Embed/Ask-for-more, the tab
  strip, and "Use this as the hook" **not rendered** (T010/T006, audited T018). **FR-019**: no
  warmth/sentiment, product/variant, or reach/views (T019).
- **Server-first**: every detail component is a Server Component; the **only** `"use client"` file is
  `[id]/error.tsx` (T014) — the framework-required boundary.
- **Reused unchanged from T2.1/T2.2**: `withDbRetry`, the shared `<ErrorState>`, the Suspense +
  `loading.tsx` + page `error.tsx` pattern, and the root `app/error.tsx`.
- Out of scope (do NOT build): the clip studio (T2.4), the carousel/embed format makers, the request/ask
  flow, real consent management; any schema/seam/seed change; any new dependency.
