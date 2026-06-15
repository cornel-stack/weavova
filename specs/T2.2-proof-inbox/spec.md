# Feature Specification: Proof Inbox (the spine continues)

**Feature Branch**: `T2.2-proof-inbox`

**Created**: 2026-06-15

**Status**: Draft

**Tier**: T2 — The spine (T2.2, second slice)

**Input**: User description: "T2.2 — Proof inbox (the spine continues). Author the spec for the workspace Proof inbox, the list view of all proof, opened from the dashboard's 'View all in the inbox →'. Derive it from CLAUDE.md, the constitution, and design-reference/ screen 02. Port, don't redesign."

**Ported from**: `/design-reference/Weavova/The spine/02 _ Proof inbox  _app_proof.(html|png)` (screen 02).

---

## Overview

The Proof inbox is the second surface of the spine (Dashboard → **Proof inbox** → Proof detail → Clip
studio). It is the workspace's full list of captured proof — the destination of the dashboard's "View
all in the inbox →" link — rendered inside the existing T1 AppChrome. It replaces the current
`/app/proof` placeholder. Where the dashboard shows a small recent slice, the inbox shows **all** of a
workspace's proof as a masonry "Wall" of the byte-unchanged canonical ProofCard, with affordances to
filter (by status and type), search, and sort, so an owner can find the proof they want to act on.
From a piece of proof the owner navigates toward its detail (T2.3); the studio opens from there.

This slice ports screen 02 faithfully. It does not redesign it and it does not build the surfaces it
links to (proof detail, clip studio, upload, batch "Make clips", the request-proof flow) — those are
later slices/tiers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See all proof in the workspace (Priority: P1)

A workspace owner opens the inbox (from the dashboard's "View all in the inbox →" or the rail's
"Proof") and sees every piece of proof their workspace has captured, laid out as a Wall of cards, each
showing the customer's words/media, the source, the consent state, the verified mark, and the
unreviewed stamp.

**Why this priority**: This is the reason the inbox exists and the entry point to acting on proof. It
is the MVP of the slice — a real, complete, proof-forward list rendered from workspace-scoped data.

**Independent Test**: Open `/app/proof`; confirm the Wall renders every proof in the seeded workspace
via the workspace-scoped query layer, each as the canonical ProofCard, with no hardcoded content and a
"{shown} of {total} pieces of proof" count that matches the data.

**Acceptance Scenarios**:

1. **Given** a workspace with seeded proof, **When** the owner opens `/app/proof`, **Then** the page
   renders inside the existing AppChrome with the screen-02 sub-header (title, view toggle, actions),
   the filter/sort row, and a Wall of every proof in that workspace.
2. **Given** seeded proof, **When** the Wall renders, **Then** every card is the canonical ProofCard
   (byte-unchanged) driven by `ProofView` data, and the customer's quote/transcript or media is the
   largest, warmest element on each card (Principle II).
3. **Given** the data, **When** the inbox renders, **Then** the "pieces of proof" count is computed
   from the workspace's proof (no fabricated number), and the per-card states (verified mark,
   unreviewed stamp, consent dot) reflect each proof's real data.
4. **Given** a proof whose effective consent state is not "granted", **When** it appears in the Wall,
   **Then** no "Make" action is offered for it (consent gate inherited from the unchanged ProofCard).

---

### User Story 2 - Filter and search to find specific proof (Priority: P1)

The owner narrows the Wall using screen 02's status chips (All / New / Reviewed / Awaiting consent),
type chips (All types / Video / Text / Photo / Audio), and the "Search proof" field, and the list and
its count update to show only matching proof.

**Why this priority**: Finding the right proof is the inbox's core utility beyond the dashboard's
recent slice. It ships with Story 1 as the inbox's reason to exist.

**Independent Test**: Apply each status chip, each type chip, and a search term; confirm the Wall and
the count show exactly the matching proof, computed from data, and combining filters narrows correctly.

**Acceptance Scenarios**:

1. **Given** the status chips, **When** "New" / "Reviewed" / "Awaiting consent" is selected, **Then**
   the Wall shows only unreviewed / reviewed / awaiting-consent proof respectively; "All" clears the
   status filter.
2. **Given** the type chips, **When** a type (Video / Text / Photo / Audio) is selected, **Then** the
   Wall shows only proof of that type; "All types" clears the type filter.
3. **Given** the "Search proof" field, **When** the owner types a term, **Then** the Wall shows only
   proof matching the term (across customer name and the proof's words), computed from data.
4. **Given** a status filter, a type filter, and a search term, **When** all are active, **Then** they
   combine (AND), and the count reflects the matching subset.
5. **Given** an active filter/search that matches nothing, **When** the Wall would be empty, **Then** a
   filtered-empty state is shown (distinct from the no-proof-at-all empty state) with a way to clear.

---

### User Story 3 - Sort the proof (Priority: P2)

The owner orders the Wall using the sort control. "Newest" orders by capture time (most recent first).

**Why this priority**: Ordering is a useful refinement but secondary to seeing and filtering proof. It
also surfaces the "Warmest" data-honesty question (see Clarifications Q1).

**Independent Test**: Toggle the sort to "Newest" and confirm the Wall orders by capture date,
most-recent-first, computed from data.

**Acceptance Scenarios**:

1. **Given** the sort control, **When** "Newest" is selected, **Then** the Wall orders proof by
   `capturedAt` descending, computed from data (the default order).
2. **Given** the sort control, **When** the owner sees the "Warmest" option, **Then** it is visible but
   disabled with an accessible "coming soon" affordance, is not selectable, and never reorders the Wall
   by a fabricated ranking (resolved Q1; real warmth ranking is T4/B3 — A-10).

---

### User Story 4 - Open a proof toward its detail (Priority: P2)

From any proof in the Wall, the owner navigates toward that proof's detail (where, in T2.3, they will
review it and open the studio).

**Why this priority**: It connects the inbox to the rest of the spine, but the detail itself is T2.3,
so this slice only needs the navigation to land somewhere valid.

**Independent Test**: Activate a proof; confirm it navigates to that proof's detail route
(`/app/proof/[id]`), which renders a minimal placeholder in this slice — without modifying the
canonical ProofCard.

**Acceptance Scenarios**:

1. **Given** a proof in the Wall, **When** the owner activates it (pointer or keyboard), **Then** the
   app navigates to `/app/proof/[id]` for that proof.
2. **Given** `/app/proof/[id]`, **When** it renders in this slice, **Then** it is a minimal placeholder
   (the real detail is T2.3) and does not error.
3. **Given** the navigation affordance, **When** it is added, **Then** the canonical ProofCard is not
   modified and no invalid nested-interactive control is introduced (the card's own "Make" action still
   works where consent allows).

---

### User Story 5 - The inbox is reliable and handles its states (Priority: P2)

The inbox surfaces an explicit loading state, recovers transparently from a Neon cold start, shows a
clear retryable error only on genuine failure, and shows an honest empty state when the workspace has
no proof — reusing the T2.1 reliability patterns.

**Why this priority**: Essential for the inbox to feel reliable as the list owners live in, but
secondary to the list rendering at all. Reuses proven T2.1 building blocks (`withDbRetry`, the shared
`<ErrorState>`).

**Independent Test**: Simulate a slow/transient first read and a persistent failure; confirm the
loading skeleton, transparent recovery, and the shared error state with retry; point at a zero-proof
workspace and confirm the empty state.

**Acceptance Scenarios**:

1. **Given** the data has not loaded, **When** the inbox is rendering, **Then** a loading state is
   shown that preserves the layout (sub-header / filter row / Wall placeholders) using Pressroom tokens.
2. **Given** a transient cold-start failure, **When** the inbox loads, **Then** the read is retried
   transparently (`withDbRetry`) and the Wall renders on recovery, with no error surfaced.
3. **Given** a failure that persists past the retry policy, **When** the inbox loads, **Then** the
   shared `<ErrorState>` is shown with a retry affordance and no raw error text.
4. **Given** a workspace with no proof at all, **When** the inbox renders, **Then** an honest empty
   state is shown (distinct from the filtered-empty state) that orients the owner toward capturing
   proof, with the filter/sort chrome quiet or hidden as appropriate.

---

### Edge Cases

- **Workspace empty vs filtered-empty**: zero proof in the workspace shows the "no proof yet" empty
  state; a filter/search that matches nothing shows a distinct "no matches" state with a clear-filters
  affordance. The two must not be confused.
- **Single proof / very few**: the Wall renders without broken masonry columns or large gaps.
- **All proof unreviewed (or all reviewed)**: the "New"/"Reviewed" filters still behave; the count
  reflects the subset.
- **Consent states in the list**: awaiting/revoked proof appear (with their honest consent dot) but
  offer no "Make" action (P-VII), exactly as the unchanged ProofCard already enforces.
- **Search matching transcript vs quote**: media proofs match on transcript, text proofs on quote;
  matching is case-insensitive.
- **Cold start / persistent failure**: covered by US5.
- **Long transcripts / long customer names**: cards wrap without overflowing the masonry column.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The inbox MUST replace the current `/app/proof` placeholder and render inside the existing
  T1 AppChrome, without modifying the chrome, rail, top bar, switcher, or command palette.
- **FR-002**: All inbox content MUST be read from the **current workspace's** proof/consent data via the
  T0.3 query layer, scoped to the workspace resolved by the T1 session seam (`getCurrentWorkspace`).
  This slice MUST make `getProofs` (and `getProof`, used by the proof routes) **workspace-scoped** — the
  scoping deferred from T2.1 — without changing the database schema, seed, or the session seam. No proof
  content or count may be hardcoded.
- **FR-003**: The inbox MUST render the proof as a **Wall** (the masonry layout screen 02 pictures)
  built from the **byte-unchanged** canonical ProofCard (`src/components/proof-card.tsx`), one card per
  proof, driven by `ProofView` data.
- **FR-004**: Each card MUST reflect the proof's real per-proof state already carried by the ProofCard:
  the verified mark, the unreviewed corner stamp, and the effective (latest-version) consent state; and
  the "Make" action MUST appear ONLY when consent is "granted" (P-VII, inherited from the unchanged
  card).
- **FR-005**: The inbox MUST provide screen 02's **status filter** chips — All / New / Reviewed /
  Awaiting consent — as a single-select group, computed from data: New = not reviewed, Reviewed =
  reviewed, Awaiting consent = effective consent state "awaiting", All = no status filter.
- **FR-006**: The inbox MUST provide screen 02's **type filter** chips — All types / Video / Text /
  Photo / Audio — as a single-select group filtering by `proofType`; "All types" clears it.
- **FR-007**: The inbox MUST provide screen 02's **"Search proof"** field that filters the Wall to proof
  matching the term across the customer name and the proof's words (quote/transcript), case-insensitive.
- **FR-008**: The status filter, type filter, and search MUST **combine (AND)** and MUST update the Wall
  and the "pieces of proof" count together; all results are computed from real data (no fabricated
  counts — carry-over rule).
- **FR-009**: The inbox MUST provide a **sort** control with a **"Newest"** option that orders the Wall
  by `capturedAt` descending (the default), computed from data.
- **FR-010**: The inbox MUST present screen 02's **"Warmest"** sort option as **visible but disabled**
  with a clear, accessible "coming soon" affordance (disabled control + tooltip/`aria` explanation). It
  MUST NOT be selectable and MUST NOT order the Wall by any fabricated or proxy ranking (no
  verified-first / longest-quote relabelled as "warmth" — that is the FR-019 fabrication this forbids).
  "Newest" (FR-009) is the working default. The sort control MUST be shaped so the **real** warmth
  ranking slots in at T4/B3 with no relayout — the option exists now and only gains its data source
  later (A-10).
- **FR-011**: The inbox MUST display screen 02's **count** as "{shown} of {total} pieces of proof",
  where both numbers are computed from the workspace's proof ({shown} = current filtered/searched
  subset, {total} = all proof in the workspace).
- **FR-012**: From any proof, the owner MUST be able to navigate to that proof's **detail route**
  (`/app/proof/[id]`). This slice MUST add `/app/proof/[id]` as a **minimal placeholder** (the real
  detail is T2.3) and MUST add the navigation **without modifying the canonical ProofCard** and without
  introducing an invalid nested-interactive control.
- **FR-013**: The inbox MUST ship the **Wall as the single view** and MUST NOT render screen 02's
  **Wall / List view toggle**. Unlike a disabled option inside a working control (Warmest), a one-sided
  toggle is hollow: "List" has no reference screen and no committed tier, so it is **deferred, not
  shown** (A-11 meta-rule; A-12 dependency). It returns when a List view is actually designed.
- **FR-014**: Screen 02's secondary/bulk actions are handled per the port-completeness meta-rule (A-11) —
  visible only when they read as a working "coming soon" or a standalone entry-point with a committed
  home; hidden when dead standalone, undesigned, or coupled machinery that can't function alone:
  - **FR-014a**: **"Request proof"** MUST be **present-but-inert**, identical to the dashboard's
    affordance (persimmon primary, keyboard-reachable, no-op, never errors).
  - **FR-014b**: **"Add proof"** MUST be **present-but-inert** — a standalone upload entry-point with a
    committed home (upload, T4/B2); no-op and never errors in this slice.
  - **FR-014c**: **"Make clips"**, **"Select all ready"**, and **per-proof selection** MUST NOT be
    rendered in T2.2. They are coupled to a selection model that does not exist and are deferred **as a
    unit to T4 (Bulk & exports / batch studio)**; per-proof selection would require a selection control
    the **byte-unchanged ProofCard does not carry**, which this slice MUST NOT add (A-12).
- **FR-015**: The inbox MUST reuse the T2.1 reliability pattern: the workspace-scoped read is wrapped in
  `withDbRetry` so a transient Neon cold start is retried transparently behind a loading state.
- **FR-016**: The inbox MUST present an explicit **loading state** (preserving the sub-header / filter
  row / Wall layout, on-token) and a genuine-failure **error state** using the **shared `<ErrorState>`**
  (with retry, no raw error text) introduced in T2.1.
- **FR-017**: The inbox MUST present two distinct **empty states**: a **no-proof-at-all** empty state
  (workspace has zero proof) and a **filtered-empty** state (filters/search match nothing, with a
  clear-filters affordance).
- **FR-018**: The inbox MUST be **responsive** across the Pressroom breakpoints (480 / 1024 / 1280): the
  Wall reflows its columns, and the filter/sort/search controls remain usable, without horizontal scroll
  or overlap.
- **FR-019 (data-ownership, carry-over)**: The inbox MUST only display data Weavova owns end-to-end
  (proof, consent, sources). It MUST NOT display or sort by any metric sourced from an integration
  Weavova does not have (e.g. social-platform views/reach/engagement, or an un-owned "warmth" signal) —
  consistent with the T2.1 governing rule. (Directly informs Q1.)
- **FR-020**: The inbox MUST be **keyboard-accessible**: the filter chips, type chips, search field,
  sort control, and each proof's navigation affordance are reachable and operable by keyboard with a
  visible focus indicator.
- **FR-021**: All product **microcopy** MUST match screen 02's wording where it specifies it (the chip
  labels, "Search proof", "{n} of {n} pieces of proof", "Sort · Newest") and MUST avoid
  "amazing"/"awesome" and emoji (P-XI).
- **FR-022**: The slice MUST NOT introduce any new dependency, MUST NOT alter the database schema, seed,
  or the auth/session seam, MUST keep the canonical ProofCard byte-unchanged, and MUST NOT build the
  proof detail, clip studio, upload, batch studio, or request-proof flow.

### Key Entities *(include if feature involves data)*

- **Workspace**: the tenant the inbox is scoped to; resolved via the session seam. The inbox reads only
  this workspace's proof. (Existing, T0.3.)
- **Proof**: a captured piece of proof (text / video / photo / audio) with customer name, quote or
  transcript, source label, capture date, `reviewed` / `verified` flags. Drives the Wall, the filters,
  the search, the sort, and the count. (Existing, T0.3.)
- **Consent**: versioned, revocable; effective (latest-version) state drives the "Awaiting consent"
  filter and the per-card consent gate. (Existing, T0.3.)
- **Source**: the origin label (Shopify, Stripe, …) shown on each card and matchable by search.
  (Existing, T0.3.)
- **Warmth / sentiment signal (NOT modeled)**: the data that would back a "Warmest" sort. It does not
  exist in the T0.3 schema and is not introduced here (Q1, FR-019). The build plan places a "Warmth
  sort" (B3) in the Bulk & exports tier (T4).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the inbox, an owner can locate a specific piece of proof (by type, status, or a
  search term) in under 10 seconds on the seeded workspace, without leaving the page.
- **SC-002**: 100% of the Wall's content, the per-card states, and the "pieces of proof" count are
  derived from workspace data — verifiable by changing a fixture (add/remove a proof, toggle `reviewed`,
  revoke consent) and observing the Wall, the relevant filter results, and the count change with no code
  edit.
- **SC-003**: Every filter, the search, and the sort return results that exactly match the underlying
  data (0 fabricated or mismatched entries), and combining them narrows correctly.
- **SC-004**: No "Make" action is offered for any proof whose effective consent state is not "granted"
  (0 violations across the seeded granted / awaiting / revoked fixtures).
- **SC-005**: On a transient cold-start failure the inbox recovers and renders without the user seeing
  an error; an error state appears only when the failure persists, and a retry from it succeeds.
- **SC-006**: Both empty states behave correctly: a zero-proof workspace shows the no-proof state, and a
  zero-match filter shows the filtered-empty state with a working clear-filters affordance.
- **SC-007**: The inbox renders without horizontal scroll, overlap, or unreachable controls at each
  breakpoint (≤480, 1024, 1280, and the 1240px content max).
- **SC-008**: The canonical ProofCard file is byte-unchanged after this slice, and no new dependency is
  added.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: Every card in the Wall is the unchanged proof-forward ProofCard —
  the customer's verbatim words/media lead; the filter/sort/search chrome and counts stay quiet.
- **Port, don't redesign (P-V)**: Ported from `/design-reference/Weavova/The spine/02 _ Proof inbox
  _app_proof` (screen 02) — the Wall, the status/type chips, the search field, the sort control, the
  count, the sub-header. Faithful porting follows the **port-completeness meta-rule (A-11)**: pictured
  controls that cannot work yet are rendered only when they read as a working "coming soon" (disabled
  "Warmest" in the working sort) or a standalone entry-point with a committed home ("Request proof",
  "Add proof"); ones that are dead/undesigned/coupled are hidden (the Wall/List toggle; "Make clips" +
  selection) rather than shown greyed-out. The un-owned "Warmest" ranking is disabled, not fabricated
  (FR-019). Undesigned states (the List view) are deferred with a reference+tier dependency (A-12), not
  invented (P-XII).
- **Fixtures-first (P-VI)**: All data flows through the T0.3 query layer over the seeded fixtures, now
  workspace-scoped; the fixture shape is the schema contract; no schema/seed change.
- **Consent (P-VII)**: Each card shows its effective consent state honestly; "Make" is offered only for
  granted proof; the "Awaiting consent" filter surfaces consent state — no clip path from non-consented
  proof.
- **No editor (P-VIII)**: N/A — the inbox lists proof and navigates toward the detail; it builds no
  timeline/track/scrubber and no studio.
- **Scope (P-IX, P-XI)**: A single vertical slice (T2.2) within tier T2 — the inbox surface only. It
  does not build the detail, studio, upload, batch studio, or request flow; affordances that point at
  those are present-but-inert (pending Q3). No speculative additions.
- **Microcopy (P-XI)**: Product copy matches screen 02's wording and avoids "amazing"/"awesome" and
  emoji.

## Assumptions

- **A-01 (status chips are one group, single-select)**: All / New / Reviewed / Awaiting consent are a
  single-select status filter (one active at a time), as pictured; "New" = unreviewed, "Reviewed" =
  reviewed, "Awaiting consent" = effective consent "awaiting", "All" = no status filter.
- **A-02 (type chips single-select)**: All types / Video / Text / Photo / Audio are a single-select type
  filter; "All types" clears it.
- **A-03 (search scope)**: "Search proof" matches case-insensitively across the customer name and the
  proof's words (quote for text, transcript for media), and optionally the source label. Exact fields
  are a presentation detail; the contract is "matches the visible proof text".
- **A-04 (no pagination at this scale)**: With the seeded dataset the inbox shows all matching proof
  (no pagination/infinite-scroll); the count reads "{shown} of {total}". If real volume later needs
  paging, that is a separate slice.
- **A-05 (filter/search/sort reflect the view, not necessarily the URL)**: Whether filter/sort/search
  state is reflected in the URL (shareable/bookmarkable) is a plan-level decision; the product
  requirement is only that the view and count update to match.
- **A-06 (navigation without touching the card)**: Each proof opens its detail via a navigation
  affordance added around/with the card (e.g. a wrapping link or an explicit open control) that does
  NOT modify the ProofCard and does NOT nest the card's "Make" button inside a link; the exact mechanism
  is a plan decision (A-06 informs FR-012).
- **A-07 (sample data differs from fixtures)**: Screen 02's sample names/quotes (e.g. "Hannah S.",
  "Greg P.", "Ray O.", "Elena V.") are export sample content; the inbox renders OUR seeded workspace
  proof, so the specific cards differ — this is expected (computed, not hardcoded).
- **A-08 (reuse T2.1 building blocks)**: The read uses `withDbRetry`; the error state uses the shared
  `<ErrorState>`; the loading state mirrors the T2.1 skeleton approach. No new patterns are invented.
- **A-09 (detail placeholder)**: `/app/proof/[id]` is created as a minimal placeholder page in this
  slice; the real proof detail is T2.3.
- **A-10 (DEPENDENCY — real "Warmest" sort is T4/B3, gated on a warmth signal not in T0.3)**: The
  working warmth ranking depends on a warmth/sentiment signal the T0.3 schema does not carry; it is
  delivered at **T4 (B3 — Warmth sort)**, not here. In T2.2 the "Warmest" control is present-but-disabled
  (FR-010). FR-019 governs throughout: the inbox never sorts by a ranking it doesn't own. The control is
  shaped so T4 only adds the data source — no relayout. (Resolved Q1, human decision 2026-06-15.)
- **A-11 (PORT-COMPLETENESS meta-rule — faithful port ≠ render every pictured control)**: A faithful
  port does NOT render a pictured control that cannot work; the inbox must feel complete for **browsing
  proof**, not be a toolbar of greyed-out buttons. A not-yet control is kept visible ONLY when (a) it
  reads as a helpful "coming soon" **inside an otherwise-working control** (e.g. the disabled "Warmest"
  option in the working sort dropdown — FR-010), or (b) it is a **standalone entry-point with a committed
  future home** (the T2.1 inert pattern — e.g. "Request proof" FR-014a, "Add proof" FR-014b). Controls
  that are **dead standalone, undesigned, or coupled machinery that can't function alone are hidden**
  (the Wall/List toggle FR-013; "Make clips" + selection FR-014c). This rule governs every "pictured but
  not-yet-functional" decision in this slice. (Human decision, 2026-06-15.)
- **A-12 (DEPENDENCIES — what is deferred and to where)**: **List view** = deferred, **needs a reference
  screen and a committed tier** before it is built (none exists today; not invented here — P-V/P-XII).
  **Upload ("Add proof")** = T4 / B2. **Batch ("Make clips", "Select all ready", per-proof selection)** =
  T4 / B1 (Bulk & exports); it is coupled to a selection model and would require a ProofCard selection
  control that this slice will not add. (Resolved Q2 + Q3, human decision 2026-06-15.)

## Clarifications

> Three screen-02 ambiguities were surfaced (Principle XII + the carry-over data-honesty rule) rather
> than guessed. **All three are now RESOLVED** (human decisions, 2026-06-15), governed by the
> port-completeness meta-rule **A-11**. (These mirror how T2.1's clip-cells and date-window were handled.)

### Question 1 — RESOLVED: "Warmest" sort has no owned data signal

**Context**: Screen 02's sort control offers "Sort · Newest" and "Sort · Warmest". The T0.3 schema
models proof/consent/source/workspace only — there is no warmth/sentiment/quality field. Newest is
computable (`capturedAt`); "warmth" is not, and FR-019 forbids fabricating or sorting by an un-owned
signal. The build plan places a "Warmth sort" (B3) in the Bulk & exports tier (T4).

**Resolution** (human decision, 2026-06-15): **Option A** — same pattern as T2.1's clip cells. "Newest"
is the working, computed default sort; "Warmest" stays **visible but disabled** with a clear, accessible
"coming soon" affordance (disabled state + tooltip/`aria`), never selectable and never fabricating an
order. **No owned-data proxy** (verified-first / longest-quote relabelled "warmth") — that is the FR-019
fabrication we forbid (option C rejected). The sort control is shaped so the real warmth ranking slots
in at **T4/B3** with no relayout. Captured in **FR-010** and dependency **A-10**.

### Question 2 — RESOLVED: The Wall / List view toggle (List layout not pictured)

**Context**: Screen 02's sub-header has a "Wall" / "List" view toggle. The export pictures only the
**Wall** (masonry) view; there is no List-view screen in `/design-reference`. Porting faithfully means
not inventing a layout the design doesn't show (P-XII).

**Resolution** (human decision, 2026-06-15): **HIDE the List toggle; ship the Wall as the single view.**
Unlike "Warmest" (a disabled option inside a working sort, with a committed tier), "List" has no
reference screen and no committed tier, so a one-sided toggle is hollow — it is deferred, not shown, and
returns when a List view is actually designed. Captured in **FR-013**, governed by the port-completeness
meta-rule **A-11**; dependency in **A-12** (List = needs reference + tier).

### Question 3 — RESOLVED: Bulk / secondary actions ("Add proof", "Make clips", "Select all ready", "Request proof")

**Context**: Screen 02's sub-header and filter row include "Add proof" (upload — screen B2, T4), "Make
clips" (batch studio — B1, T4), "Select all ready" + per-proof selection (batch selection — T4), and
"Request proof" (request flow — later tier). The build plan puts Bulk & exports at **T4**, and the
canonical ProofCard (byte-unchanged) carries no selection checkbox.

**Resolution** (human decision, 2026-06-15): **split per the A-11 meta-rule** —
- **"Request proof"** → **present-but-inert**, identical to the dashboard's affordance (FR-014a).
- **"Add proof"** → **present-but-inert**, a standalone upload entry-point with a committed home
  (T4/B2) (FR-014b).
- **"Make clips" + "Select all ready" + per-proof selection** → **HIDDEN as a unit**, deferred whole to
  **T4 (B1, Bulk & exports)**. They are coupled to a selection model that doesn't exist, and per-proof
  selection would need a checkbox the byte-unchanged ProofCard does not carry — which this slice will not
  add (FR-014c, A-12).
- The sort stays: **Newest working, Warmest disabled-in-dropdown** (Q1).
