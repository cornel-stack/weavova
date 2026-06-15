# Feature Specification: Workspace Dashboard (the spine begins)

**Feature Branch**: `T2.1-dashboard`

**Created**: 2026-06-15

**Status**: Draft

**Tier**: T2 — The spine (T2.1, first slice)

**Input**: User description: "T2.1 — Dashboard (the spine begins). Author the spec for the workspace Dashboard, the home screen of the app shell. Derive it from CLAUDE.md, the constitution, and design-reference/ screen 01 (the dashboard). Port, don't redesign."

**Ported from**: `/design-reference/Weavova/The spine/01 _ Dashboard  _app.(html|png)` (screen 01).

---

## Overview

The Dashboard is the home screen of the authenticated app shell — the surface a workspace owner
lands on inside the existing AppChrome (rail, top bar, workspace switcher, ⌘K palette) built in T1.
It replaces the current `/app` placeholder. It is the **first surface of "the spine"** (Dashboard →
Proof inbox → Proof detail → Clip studio): it orients the user with a warm greeting, a small strip
of computed at-a-glance numbers, the single most recent piece of proof shown large (the hero), and a
grid of recent proof rendered with the canonical ProofCard. From here the user can see what just
arrived and reach the primary action — requesting more proof.

This slice ports screen 01 faithfully. It does not redesign it and it does not build the surfaces it
links to (proof inbox, proof detail, clip studio, the request-proof flow) — those are later slices.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Land on the dashboard and see what just arrived (Priority: P1)

A workspace owner opens the app and lands on the Dashboard. They immediately see a personal greeting,
the most recent piece of customer proof shown large with the customer's words leading, and a grid of
other recent proof. Within seconds they understand "what came in" without navigating anywhere.

**Why this priority**: This is the reason the Dashboard exists and the entry point to the entire
spine. Without it the app shell from T1 has no home content. It is independently the MVP of this
slice — a real, proof-forward home screen rendered from real workspace data.

**Independent Test**: Seed the demo workspace, open `/app`, and confirm the greeting, the latest-proof
hero (the most recently captured proof, with its quote/transcript as the largest element), and the
recent-proof grid all render from the seeded fixtures via the workspace-scoped query layer — with no
hardcoded proof content.

**Acceptance Scenarios**:

1. **Given** a workspace with seeded proof, **When** the owner opens `/app`, **Then** the page renders
   inside the existing AppChrome shell with a masthead greeting, a KPI strip, a latest-proof hero, and
   a recent-proof grid — all populated from that workspace's proof/consent data.
2. **Given** seeded proof, **When** the dashboard renders, **Then** the hero is the single
   most-recently-captured proof in the workspace, and its customer quote/transcript (or media) is the
   largest, warmest element on the screen (Principle II).
3. **Given** seeded proof, **When** the recent-proof grid renders, **Then** every card is the canonical
   ProofCard (byte-unchanged) driven by `ProofView` data, ordered most-recent-first, and the hero proof
   is not duplicated in the grid.
4. **Given** a proof whose latest consent state is not "granted", **When** it appears as the hero or in
   the grid, **Then** no "Make / Make a clip" action is offered for it (consent gate, Principle VII).

---

### User Story 2 - Read at-a-glance numbers computed from real data (Priority: P1)

The owner glances at the KPI strip in the masthead and sees how much proof arrived recently and how
many pieces still need their attention — numbers that reflect the workspace's actual data, never
placeholder figures.

**Why this priority**: The "computed, not hardcoded" KPI strip is the explicit data-integrity promise
of this slice and the visible proof that the fixtures-first query layer drives the UI. It ships with
Story 1 as part of the masthead.

**Independent Test**: Change the seeded fixtures (add/remove a proof, toggle a `reviewed` flag) and
confirm the KPI numbers and the greeting's review count change accordingly, with no edit to the page.

**Acceptance Scenarios**:

1. **Given** the seeded workspace, **When** the dashboard renders, **Then** the "proof collected" KPI
   equals the count of proof captured within the current week window, computed from the data.
2. **Given** the seeded workspace, **When** the dashboard renders, **Then** the "needs review" / "awaiting
   you" KPI equals the count of proof that is not yet reviewed, computed from the data.
3. **Given** the greeting line, **When** it renders, **Then** it shows a time-of-day greeting, the
   signed-in user's first name, and the count of proof awaiting review — all derived, none hardcoded.
4. **Given** any KPI value, **When** the underlying fixtures change, **Then** the displayed number
   changes to match, proving the value is computed and not a literal.
5. **Given** the demo has produced no clips yet, **When** the dashboard renders, **Then** the "clips made
   this month" KPI reads 0 (from the computed dashboard-summary contract) and the latest-clip slot shows
   its honest empty treatment — neither is hardcoded and neither shows any external view/engagement
   figure.

---

### User Story 3 - Reach the primary action: request more proof (Priority: P2)

From the dashboard the owner can see and click the "Request proof" primary action — the one persimmon
affordance that says "go get more real proof."

**Why this priority**: It is the screen's primary call to action and part of a faithful port, but its
destination (the request-proof flow) is a later tier, so it cannot be fully exercised in this slice.

**Independent Test**: Confirm the "Request proof" primary action is present, styled as the single
persimmon primary action per the design tokens, and keyboard-reachable — without requiring the
request-proof flow to exist.

**Acceptance Scenarios**:

1. **Given** the dashboard, **When** it renders, **Then** a "Request proof" primary action is present in
   the masthead, rendered in persimmon as the primary action (Principle IV persimmon-scarcity rule).
2. **Given** the "Request proof" action, **When** the user activates it via keyboard or pointer, **Then**
   it behaves as a present-but-not-yet-wired affordance (its destination is a later tier) and does not
   error or require the request flow to be built.

---

### User Story 4 - The page survives a cold database and degrades gracefully (Priority: P2)

A first visit after the workspace has been idle may hit a slow or briefly-unavailable database (Neon
free-tier cold start). The owner sees a loading state, the page transparently retries a transient
failure, and only sees an error — with a way to retry — if the database genuinely cannot be reached.

**Why this priority**: This is the cold-start hardening deferred into T2.1. It is essential for the
dashboard to feel reliable as the app's home screen, but it is secondary to the screen rendering at
all.

**Independent Test**: Simulate a slow / transiently-failing first query and confirm the page shows a
loading state, recovers and renders normally once the database wakes, and shows a clear retryable error
only when the failure persists past the retry policy.

**Acceptance Scenarios**:

1. **Given** the data has not yet loaded, **When** the dashboard is rendering, **Then** a loading state
   is shown that preserves the page layout (masthead / KPI / hero / grid placeholders) using the
   Pressroom tokens.
2. **Given** a transient database failure (cold start), **When** the dashboard loads, **Then** the read
   is retried transparently within a bounded policy and the page renders normally on recovery, with no
   error surfaced to the user.
3. **Given** a database failure that persists past the retry policy, **When** the dashboard loads,
   **Then** a clear, on-token error state is shown with a retry affordance and no raw error text or
   stack trace.
4. **Given** the workspace has proof but the query genuinely fails, **When** the error state shows,
   **Then** the user can retry and, on success, see the populated dashboard.

---

### User Story 5 - A new workspace with no proof yet (Priority: P3)

An owner whose workspace has not captured any proof yet lands on the dashboard and sees an honest empty
state that orients them toward requesting their first proof, rather than a broken or blank screen.

**Why this priority**: It is a required state for completeness and a good first-run experience, but the
demo workspace is seeded with proof, so it is the least-exercised path in this slice.

**Independent Test**: Point the dashboard at a workspace with zero proof and confirm the greeting still
renders, the KPI numbers all read zero, there is no hero, and an empty-state panel invites the user to
request proof.

**Acceptance Scenarios**:

1. **Given** a workspace with no proof, **When** the dashboard renders, **Then** the masthead greeting
   renders, all proof-derived KPI numbers read zero, and no latest-proof hero is shown.
2. **Given** a workspace with no proof, **When** the dashboard renders, **Then** an empty-state panel is
   shown that points the user to the "Request proof" action, with no broken/blank regions.

---

### Edge Cases

- **Single proof only**: the one proof becomes the hero; the recent-proof grid is empty (the grid /
  "Recent proof" section either hides or shows its own empty treatment, never a broken region).
- **Latest proof is non-consented or revoked**: it still appears as the hero (it is genuinely the most
  recent), but offers no clip action; its consent state is shown honestly (awaiting / revoked).
- **All proof already reviewed**: the "needs review" KPI and the greeting's review count read zero; the
  greeting still reads naturally.
- **Proof captured in the future or outside the current window**: counts toward all-time presence but
  not the windowed "this week" KPI; ordering remains by capture time.
- **Workspace resolves but the proof query fails** (partial cold start): treated as a transient failure
  for retry; if it persists, the error state is shown rather than a half-rendered page.
- **Greeting at boundary hours**: time-of-day greeting selects morning / afternoon / evening from the
  current local time without an empty or undefined label.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Dashboard MUST replace the current `/app` placeholder and render inside the existing
  T1 AppChrome shell, without modifying the chrome, the rail, the top bar, the workspace switcher, or
  the command palette.
- **FR-002**: All dashboard content MUST be read from the current workspace's proof/consent data via the
  T0.3 query layer, scoped to the workspace resolved by the T1 session seam (`getCurrentWorkspace`). No
  proof content, customer name, quote, source, consent state, or count may be hardcoded in the page.
- **FR-003**: The masthead MUST show a greeting line composed of a time-of-day greeting, the signed-in
  user's first name (from the session seam), and the count of proof awaiting review — all derived from
  data/state, matching screen 01's "Good afternoon, Maya — N to review…" pattern.
- **FR-004**: The masthead MUST show a KPI strip whose numeric values are COMPUTED from the workspace
  data, never hardcoded. The proof-derived KPIs are: (a) **proof collected** within the current week
  window, and (b) **needs review / awaiting you** = count of unreviewed proof. Time windows MUST be
  computed against the **real current date** using conventional rolling boundaries — "this week" = the
  trailing 7 days ending now, "this month" = the current calendar month — applied to each proof's actual
  `capturedAt`. The windowing logic MUST NOT anchor to the newest proof's date or otherwise shift the
  window to flatter the data; counts honestly reflect how recent the workspace's proof is (A-02). If the
  seeded fixtures are stale relative to today the windowed counts may read low or zero; that is a **data**
  condition fixed by the seed amendment in A-10, not by altering this logic.
- **FR-005**: The KPI strip MUST present screen 01's **"clips made this month"** metric as a computed
  value sourced from internal data only — the count of derived clip assets created this month, scoped to
  the workspace. The T0.3 schema models no derived-asset/clip entity yet (clips are produced by the clip
  studio, T2.4) and this slice adds no schema; therefore in T2.1 this value is honestly **0**, exposed
  through a computed dashboard-summary contract (e.g. `dashboardSummary.clipsThisMonth`) that returns 0
  now and reads the real `derived_asset` count at T2.4 with no UI rework. It is never hardcoded.
- **FR-005a (latest-clip slot, reframed from "top clip · N views")**: Screen 01's fourth masthead cell
  shows a "top clip" with a **view count** ("Maria's · top this week · 4.1k views"). The view/engagement
  figure is **external platform analytics that Weavova has no source for in v1** (no social-platform API
  integration; not planned soon). Per the data-ownership rule (FR-019) the dashboard MUST NOT build a
  cell around an un-owned metric. This slot is therefore reframed to an **owned** metric: the **latest
  clip** (a clip the merchant could feature later), shown with **no view count** — internal descriptors
  only (its source proof / customer, the verified mark where applicable, the date). It uses the same
  computed dashboard-summary contract, is honestly **empty** until clips exist (T2.4), and is never
  backed by external analytics.
- **FR-019 (data-ownership, governing rule for the dashboard)**: The dashboard MUST only ever display
  data Weavova owns end-to-end (proof, consent, sources, and internally-produced derived clips). It MUST
  NOT display any metric sourced from an integration Weavova does not have — explicitly including
  social-platform view counts, reach, or engagement. Such metrics are out of scope until their source
  integration exists (see A-09).
- **FR-006**: The dashboard MUST show a **latest-proof hero**: the single most-recently-captured proof
  in the workspace, presented larger than a grid card, with the customer's quote/transcript (or media)
  as the largest, warmest element (Principle II), the verified mark where applicable, the source, the
  consent state, and a capture date — ported from screen 01's hero treatment.
- **FR-007**: The hero MUST offer a "Make a clip" primary action ONLY when the proof's effective consent
  state is "granted" (Principle VII). The action's destination is the clip studio (T2.4) and MUST be
  present-but-not-yet-wired in this slice — it must not require the studio to exist.
- **FR-008**: The dashboard MUST show a **recent-proof grid** built from the canonical ProofCard
  (`src/components/proof-card.tsx`), which MUST remain byte-unchanged. Cards are driven by `ProofView`
  data, ordered most-recent-first, and the hero proof MUST NOT be duplicated in the grid.
- **FR-009**: The grid MUST show a bounded set of recent proof (see Assumptions for the default count)
  and MUST include a "View all in the inbox →" link as in screen 01. That link's destination is the
  proof inbox (T2.2) and MUST be present-but-not-yet-wired in this slice.
- **FR-010**: A "Request proof" primary action MUST be present in the masthead, rendered in persimmon as
  the single primary action (Principle IV persimmon-scarcity rule). Its destination (the request-proof
  flow) is a later tier; the affordance MUST be present and keyboard-reachable without requiring that
  flow to be built, and MUST NOT error when activated.
- **FR-011**: The dashboard MUST present an explicit **loading state** that preserves the page layout
  (masthead / KPI / hero / grid placeholders) using the Pressroom tokens while data is being fetched.
- **FR-012**: The dashboard MUST present an explicit **empty state** when the workspace has no proof: the
  greeting renders, all proof-derived KPI numbers read zero, no hero is shown, and an empty-state panel
  directs the user to "Request proof".
- **FR-013**: The dashboard MUST tolerate Neon free-tier cold starts: a transient database failure on
  first load MUST be retried transparently within a bounded retry policy, and the loading state MUST be
  shown meanwhile. The page MUST render normally on recovery.
- **FR-014**: The dashboard MUST present an explicit **error state** ONLY when a database failure
  persists past the retry policy. The error state MUST be on-token, MUST offer a retry affordance, and
  MUST NOT expose raw error text, connection strings, or stack traces.
- **FR-015**: The dashboard MUST be responsive across the Pressroom breakpoints (480 / 1024 / 1280): the
  KPI strip, hero, and grid reflow without horizontal scroll or overlap, and all primary actions remain
  reachable on small screens.
- **FR-016**: The dashboard MUST be keyboard-accessible: the "Request proof" action, the hero action
  (when present), the "View all in the inbox" link, and each ProofCard's controls are reachable and
  operable by keyboard with a visible focus indicator.
- **FR-017**: All product microcopy on the dashboard MUST avoid "amazing"/"awesome" and emoji
  (Principle XI), and MUST match screen 01's wording where screen 01 specifies it (section labels
  "Latest proof", "Recent proof", "View all in the inbox →").
- **FR-018**: The slice MUST NOT introduce any new dependency, MUST NOT alter the auth/session seam, the
  database schema, the seed/fixtures shape, or the canonical ProofCard, and MUST NOT build the proof
  inbox, proof detail, clip studio, or request-proof flow.

### Key Entities *(include if feature involves data)*

- **Workspace**: the tenant the dashboard is scoped to; resolved via the session seam
  (`getCurrentWorkspace`). The dashboard reads only this workspace's proof. (Existing, T0.3.)
- **Proof**: a captured piece of customer proof (text / video / photo / audio) with a customer name,
  quote or transcript, source label, capture date, and `reviewed` / `verified` flags. Drives the hero,
  the grid, and the proof-derived KPIs. (Existing, T0.3.)
- **Consent**: the versioned, revocable consent attached to a proof; its effective (latest-version)
  state gates whether a clip action is offered. (Existing, T0.3.)
- **Source**: the origin of a proof (Shopify, Stripe, Instagram, Calendly, Square); contributes the
  source label shown on the hero and cards. (Existing, T0.3.)
- **Clip / Derived asset (NOT modeled in this slice)**: an internally-produced clip derived from a piece
  of proof. It backs the "clips made this month" KPI (a count) and the latest-clip masthead slot. It does
  not exist in the T0.3 schema and is not introduced here; both surfaces read 0 / empty via the computed
  dashboard-summary contract until the entity lands at T2.4. Its **view/engagement counts are NOT a
  property Weavova owns** and are explicitly excluded (FR-019, A-09). (Future entity, ~T2.4; engagement
  analytics gated on distribution, T9+.)
- **Dashboard summary (computed contract, not stored)**: the derived set of at-a-glance values the
  masthead reads — e.g. `proofThisWeek`, `needsReview`, `clipsThisMonth`, and the `latestClip`
  descriptor. In T2.1 the proof-derived values compute from proof/consent data and the clip-derived
  values return 0 / empty; at T2.4 the clip-derived values read the real `derived_asset` data through the
  same contract, with no UI rework.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a seeded workspace, the owner can identify the most recent piece of proof and how many
  pieces await their review within 5 seconds of the dashboard finishing load, without navigating away.
- **SC-002**: 100% of proof content and every numeric KPI on the dashboard is derived from workspace
  data — verifiable by changing a fixture (add/remove a proof, toggle `reviewed`) and observing the
  hero, grid, greeting count, and KPI numbers change with no code edit.
- **SC-003**: The dashboard renders correctly and without horizontal scroll, overlap, or unreachable
  actions at each breakpoint (≤480, 1024, 1280, and the 1240px content max).
- **SC-004**: No clip / "Make" action is ever offered for a proof whose effective consent state is not
  "granted" — verifiable across the seeded granted / awaiting / revoked fixtures (0 violations).
- **SC-005**: On a transient cold-start failure, the dashboard recovers and renders the populated
  screen without the user seeing an error; an error state appears only when the failure persists past
  the retry policy, and a retry from that state succeeds once the database is reachable.
- **SC-006**: A workspace with zero proof shows the empty state (zeroed KPIs, no hero, request-proof
  prompt) with no blank or broken regions.
- **SC-007**: The canonical ProofCard file is unchanged (byte-identical) after this slice, and no new
  dependency is added to the project.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: The latest-proof hero and every recent-proof ProofCard lead with
  the customer's verbatim quote/transcript (Fraunces) or honest media as the largest, warmest element;
  the greeting, KPI numbers, labels, and chrome are quiet UI that recedes. The single hero is the
  largest customer voice on the screen.
- **Port, don't redesign (P-V)**: Ported from `/design-reference/Weavova/The spine/01 _ Dashboard
  _app` (screen 01) — masthead/greeting, KPI strip, latest-proof hero, and recent-proof grid. The grid
  reuses the canonical ProofCard unchanged. The loading, empty, and error states required by this slice
  are not fully drawn for the dashboard in screen 01 (their canonical ports are the "Derived surfaces &
  states" screens 15–17 at T3); for T2.1 they are realized as minimal, on-token states consistent with
  the Pressroom tokens, and any layout ambiguity beyond that is raised as a clarification rather than
  invented (P-XII). Screen 01's "top clip · N views" cell is **not** ported verbatim: its view figure is
  un-owned external analytics (FR-019), so the slot is reframed to the owned "latest clip" metric rather
  than inventing a data source — a faithfulness-vs-data-honesty trade-off resolved in favour of showing
  only data Weavova owns.
- **Fixtures-first (P-VI)**: All data is read through the T0.3 query layer over the seeded fixtures,
  scoped via the session seam; the fixture shape is the schema contract and the UI must not need rework
  when real data lands. No schema or fixture-shape change in this slice.
- **Consent (P-VII)**: Each proof's effective (latest-version) consent state is shown honestly on the
  hero and cards, and the clip action is offered only when consent is "granted" — no clip path from
  non-consented proof. (Revocation cascade itself is modeled in the schema, not exercised by this
  read-only surface.)
- **No editor (P-VIII)**: N/A for the dashboard — it shows proof and links toward the studio; it
  contains no timeline/track/scrubber and does not build the studio.
- **Scope (P-IX, P-XI)**: A single vertical slice (T2.1) — the dashboard surface only. It does not build
  the inbox, proof detail, clip studio, or request-proof flow; affordances that point at those are
  present-but-not-yet-wired. No speculative additions.
- **Microcopy (P-XI)**: Product copy avoids "amazing"/"awesome" and emoji and follows screen 01's
  wording.

## Assumptions

- **A-01 (greeting review count = needs-review KPI)**: Screen 01's greeting "N to review this week" and
  the "awaiting you / needs review" KPI present the same underlying number — the count of unreviewed
  proof in the workspace. They are treated as one computed value. (Reasonable default; if the human
  wants the greeting windowed differently, raise it.)
- **A-02 (time windows — RESOLVED, real current date)**: "This week" (trailing 7 days ending now) and
  "this month" (current calendar month) are computed against the **real current date**, applied to each
  proof's `capturedAt`. The logic never anchors to the newest proof's date and never drops the window —
  it is honest and production-correct, consistent with FR-019. Counts reflect how recent the workspace's
  proof actually is. (Confirmed by the human, 2026-06-15; see resolved Q2.)
- **A-03 (hero selection)**: The hero is the single most-recently-captured proof in the workspace
  regardless of consent or review state; its clip action obeys the consent gate.
- **A-04 (grid count)**: The recent-proof grid shows up to 6 recent proof (matching screen 01's 2×3
  layout), excluding the hero; the remainder are reachable via "View all in the inbox →" (T2.2). The
  exact cap is a tunable presentation detail, not a data contract.
- **A-05 (time-of-day greeting)**: Morning / afternoon / evening is selected from the current local time
  with conventional boundaries.
- **A-06 (hero fields without backing data)**: Screen 01's hero shows a product/variant line ("Soy candle
  · Fig & Cedar") that has no field in the T0.3 `ProofView`. Per "don't invent" (P-XII), that line is
  omitted (or rendered only if a backing field exists); no schema field is added for it.
- **A-07 (session seam unchanged)**: The signed-in user and current workspace come from the existing T1
  stub seam (`getSession`, `getCurrentWorkspace`); this slice does not change auth/session.
- **A-08 (workspace-scoped reads)**: The query layer reads are scoped to the current workspace. Where the
  existing T0.3 query helpers are not yet workspace-filtered, scoping them to the current workspace is in
  scope for this slice (read path only; no schema change). With a single seeded workspace the result is
  equivalent today, but the contract is explicit for T6.
- **A-09 (view / engagement metrics are future scope, gated on distribution analytics)**: Social-platform
  view counts, reach, and engagement (the figures behind screen 01's "4.1k views") are **not data Weavova
  owns** in v1 and require a distribution/publishing analytics integration that does not exist and is not
  planned soon. They are explicitly out of scope here and recorded as future scope gated on distribution
  analytics (≈T9+). The dashboard's "owned-data-only" rule (FR-019) governs this and any future external
  metric.
- **A-10 (DEPENDENCY — sparse demo is a data problem, fixed by a relative-date seed amendment, NOT in
  this slice)**: Because the windows are date-real (A-02), the demo can look sparse whenever the fixtures'
  absolute capture dates have aged past the current windows. This is a **data** condition, not a logic
  defect — T2.1's windowing stays honest. The fix is a **separate small task: a T0.3 seed amendment**
  (out of this slice) that reseeds fixtures using **relative dates anchored to seed-time "now"** — the
  latest proof ≈ now, the rest spread back across the last week / month — so a reseed keeps the demo alive
  whenever it runs, instead of new absolute dates that immediately re-stale. T2.1 depends on that
  amendment for a lively demo but does not implement it and does not change the seed.

## Clarifications

> Both decisions are RESOLVED (Q1 and Q2). Per Principle XII they were surfaced for the human rather
> than guessed; the human's choices are recorded below and reflected in the requirements/assumptions.

### Question 1 — RESOLVED: the two clip-backed cells have different data sources and different fates

**Context**: Screen 01's masthead shows "6 clips made this month" and a fourth cell "Maria's · clip ·
top this week · 4.1k views". The T0.3 schema models proof / consent / source / workspace only; no
derived-asset/clip entity and no view data exist (clips are produced by the studio, T2.4). No schema
change and no hardcoded values are allowed in this slice.

**Resolution** (human decision, 2026-06-15): split the two cells by data source —

1. **"Clips made this month" KPI** → internal data (count of derived clip assets). Honest **0** in T2.1
   via the computed dashboard-summary contract (`dashboardSummary.clipsThisMonth`); reads the real
   `derived_asset` count at T2.4. (Captured in **FR-005**.)
2. **The "top clip · N views" slot** → the **views figure is external platform analytics Weavova has no
   source for in v1** (no social-platform API integration, not planned soon), so no cell is built around
   it. The slot is **reframed to an owned metric — the latest clip** (merchant-featurable later), shown
   with **no view count**, internal descriptors only (source proof / customer, verified mark, date), and
   honestly empty until clips exist (T2.4). (Captured in **FR-005a**.)

**Governing rule** (now **FR-019**): the dashboard only ever displays data Weavova owns end-to-end; it
never shows a metric sourced from an integration Weavova does not have. View / engagement metrics are
recorded as future scope gated on distribution analytics, ≈T9+ (**A-09**).

### Question 2 — RESOLVED: the date anchor for the "this week" / "this month" windows

**Context**: The proof-collected ("this week") KPI — and the "this month" window — must be computed.
The seeded fixtures' capture dates cluster in late May / early June 2026, while the current date is
later (2026-06-15), so the anchor choice determines whether the demo dashboard looks populated.

**Resolution** (human decision, 2026-06-15): **Option A — real current date, real rolling windows.**
"This week" = trailing 7 days ending now; "this month" = current calendar month; applied to each proof's
actual `capturedAt`. Honest and production-correct, consistent with FR-019. Explicitly rejected: anchoring
to the newest proof's date (B — mislabels the window and is throwaway) and dropping the windows (C —
discards a real feature and breaks screen 01's labels). Captured in **FR-004** and **A-02**.

The sparse-demo risk this creates is treated as a **data** problem, not a logic problem: it is fixed by a
separate, out-of-slice **T0.3 seed amendment** that reseeds fixtures with **relative dates anchored to
seed-time "now"** so the demo stays alive across reseeds. Recorded as dependency **A-10**; T2.1's
windowing logic stays honest and date-real.
