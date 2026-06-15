# Phase 0 — Research: T2.2 Proof Inbox

Technical Context is fixed by the locked stack; the three product ambiguities (Warmest / Wall-List /
bulk actions) were resolved with the human in the spec (Q1–Q3, A-11/A-12). This file records the
plan-level design decisions. No `NEEDS CLARIFICATION` remain.

## D1 — Whole-card navigation without modifying the ProofCard

- **Decision**: Render each ProofCard inside a `relative` wrapper with a **sibling stretched-link
  overlay** — an absolutely-positioned `<Link href="/app/proof/[id]" className="absolute inset-0"
  aria-label="Open {customerName}'s proof">`. The ProofCard's own "Make" button is given a higher
  stacking context so it remains independently clickable above the overlay.
- **Rationale**: Gives the screen-02 behaviour (the whole card opens the proof) while keeping the
  canonical ProofCard **byte-unchanged** and avoiding an invalid `<button>`-inside-`<a>` nesting. The
  card is already `position: relative` (its hover "Make" is absolutely positioned), so the overlay
  composes cleanly.
- **Alternatives rejected**: wrapping the card in a `<Link>` (nests the Make button in an anchor —
  invalid HTML / broken a11y); modifying the ProofCard to add an internal link (forbidden — must stay
  byte-unchanged); a JS onClick on the wrapper (loses real-link semantics: no middle-click/open-in-new-
  tab, worse a11y).
- **A11y note**: the overlay link carries an accessible name; both the link and the Make button are
  separately focusable and operable by keyboard.

## D2 — Where filtering / sorting / searching runs

- **Decision**: **Client-side, in memory, over the fetched workspace set.** The Server reads the full
  workspace `ProofView[]` once; `InboxClient` holds the filter/sort/search state and derives the visible
  list + counts with `useMemo`.
- **Rationale**: At demo scale (the seed is ~15; realistically tens–low-hundreds) one read + in-memory
  transforms give instant interaction with no round-trips and no URL coupling. The spec left URL
  persistence optional (A-05), so the simplest correct approach wins now.
- **Scale implication (flagged, not built)**: "fetch all + filter in memory" degrades at thousands of
  proof (payload size, client work). The migration path: move filtering/sorting to the server via query
  params (or a server action), paginate/virtualualise the Wall, and make the count a server aggregate.
  This is a later-tier concern; the `getProofs(workspaceId)` contract already returns the workspace set
  so the swap is localized.
- **Alternatives rejected**: query-param + re-query per interaction now (adds round-trips + URL state
  for no benefit at this scale); server actions per filter (same).

## D3 — Masonry "Wall" layout

- **Decision**: CSS **multi-column** masonry — `columns-1 sm:columns-2 lg:columns-3` with each item
  `break-inside-avoid` and a bottom margin; no JS masonry library.
- **Rationale**: Reproduces screen 02's Pinterest-style Wall (variable-height cards) with zero new
  dependency, pure tokens/utilities.
- **Caveat (documented)**: CSS columns flow **column-major** (top-to-bottom within a column, then the
  next column), so although the array is correctly ordered by the sort, the on-screen reading order is
  not strict left-to-right rows. This matches the pictured Wall and is acceptable. True row-major
  masonry would require JS measurement or a library — rejected (new dependency / P-III).
- **Alternatives rejected**: CSS Grid `masonry` (`grid-template-rows: masonry`) — not broadly supported
  yet; a flex/grid fixed-row grid — loses the variable-height Wall look the screen shows.

## D4 — "Warmest" sort, disabled

- **Decision**: "Newest" (orders by `capturedAt` desc) is the working default. "Warmest" is rendered as
  a **disabled** option in the same sort control with an accessible explanation (`aria-disabled` +
  title/tooltip "coming soon"); it is never settable and never reorders the Wall.
- **Rationale**: Honours A-11 (a working "coming soon" inside a working control) and FR-019 (no
  fabricated/proxy ranking). The control is shaped so T4/B3 only supplies the data source — no relayout.
- **Alternatives rejected**: an owned-data proxy relabelled "warmth" (FR-019 fabrication); omitting the
  option (diverges from the pictured control and re-adds work at T4).

## D5 — Reuse of the T2.1 reliability + state infrastructure

- **Decision**: Reuse, unchanged: `withDbRetry` (wrap the inbox read), the shared `<ErrorState>` (page
  error boundary), the Suspense + `loading.tsx` skeleton pattern, and the root `app/error.tsx` boundary.
- **Rationale**: These already encode the cold-start/error behaviour the inbox needs; rebuilding them
  would duplicate UI and diverge. Only inbox-specific UI (toolbar, Wall, two empty states, skeleton) is
  new.
- **Alternatives rejected**: a bespoke inbox error/loading surface (duplication; inconsistent with the
  dashboard).
