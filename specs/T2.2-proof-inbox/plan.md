# Implementation Plan: T2.2 — Proof Inbox (the spine continues)

**Branch**: `main` (a `T2.2-proof-inbox` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T2.2-proof-inbox/spec.md`

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Stop and report after Phase 2 planning.

## Summary

Replace the `/app/proof` placeholder with a faithful port of `/design-reference` screen 02 (Proof
inbox) inside the existing T1 AppChrome. A **Server** page resolves the current workspace via the
unchanged T1 seam and performs **one workspace-scoped read** of all the workspace's proof through the
T0.3 query layer, wrapped in the T2.1 `withDbRetry`. The full `ProofView[]` is handed to a single
**Client** island that renders the masonry **Wall** of the **byte-unchanged** canonical ProofCard plus
the screen-02 toolbar (status chips, type chips, "Search proof", sort), and computes filtering /
sorting / searching / counts **in memory** over that workspace set. Each card gets a navigation
affordance to `/app/proof/[id]` via a **stretched-link overlay sibling** — the ProofCard is not
modified. The one real data change is scoping `getProofs`/`getProof` to a workspace (the T2.1
deferral). Per the **A-11 port-completeness rule**: Newest sort works / Warmest is disabled-in-dropdown;
"Request proof" + "Add proof" are inert; the Wall/List toggle and the batch/selection cluster are **not
rendered**. Loading / empty / error reuse the T2.1 skeleton, shared `<ErrorState>`, and boundaries. No
schema/seed/seam change, no new dependency.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing only — `next`, `react`, `drizzle-orm`, `@neondatabase/serverless`,
`lucide-react`, `next-themes`, `cmdk`. **No new dependency** (masonry via CSS columns, not a JS lib).

**Storage**: Neon Postgres via the lazy `getDb()` + Drizzle. Read-only; **schema unchanged**.

**Testing**: No unit-test runner (as in T1/T2.1). Verification = `npm run typecheck`/`lint`/`build`, CI,
the rendered `/app/proof`, and the `quickstart.md` DoD checks (ProofCard byte-unchanged, no new dep,
both themes, breakpoints, keyboard).

**Target Platform**: Vercel; modern browsers. `/app/*` is `force-dynamic` (from the T1 layout).

**Project Type**: Web application — Next.js App Router single project (`src/`).

**Performance Goals**: Inbox interactive within a few seconds even on a Neon cold start; filter/sort/
search feel instant (in-memory, no round-trips) at demo scale.

**Constraints**: Server Components by default, Client only where interaction requires it (P-X); Tailwind
token utilities only; no `localStorage`/`sessionStorage`; Drizzle only; `prefers-reduced-motion`
honoured by the existing global rule.

**Scale/Scope**: One screen (screen 02); ~15 seeded proofs in one workspace; the Wall, one toolbar, and
the workspace-scoping query change. (Scale note: in-memory filtering assumes tens–low-hundreds of
proof; see Decision D2 for the large-volume migration path.)

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS.*

- [x] **Customer is the headline (P-II)**: Every Wall card is the unchanged proof-forward ProofCard —
      the customer's words/media lead; the toolbar, chips, counts, and inert actions stay quiet chrome.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4, Neon + Drizzle. No new
      dependency (CSS-columns masonry). Auth seam untouched.
- [x] **Pressroom tokens (P-IV)**: Token utilities only. Persimmon appears ONLY on "Request proof"
      (inert primary), the ProofCard's "Make"/verified mark — chips, search, sort, "Add proof" (ink
      secondary), and counts are ink. No off-token values.
- [x] **Port, don't redesign (P-V)**: Ported from `/design-reference/Weavova/The spine/02 _ Proof inbox
      _app_proof`. The **A-11 port-completeness rule** governs which not-yet controls render (Warmest
      disabled-in-working-sort; Request/Add proof as inert entry-points) vs hide (Wall/List toggle;
      batch cluster). The masonry Wall is rendered with CSS columns (a faithful rendering, not a
      redesign). Undesigned List view deferred with a reference+tier dependency (A-12), not invented.
- [x] **Fixtures-first (P-VI)**: All data flows through the T0.3 query layer over the seeded fixtures,
      now workspace-scoped; the fixture/`ProofView` shape is unchanged; the T6 multi-tenant swap stays
      mechanical.
- [x] **Consent enforcement (P-VII)**: The per-card "Make" gate is inherited from the unchanged
      ProofCard (granted only); the "Awaiting consent" filter surfaces consent state. No clip path from
      non-consented proof.
- [x] **No editor (P-VIII)**: N/A — the inbox lists proof and links toward the detail; no
      timeline/track/scrubber, no studio.
- [x] **SDD scope (P-IX, P-XI)**: One vertical slice (T2.2). The detail (beyond a placeholder route),
      studio, upload, batch studio, and request flow are NOT built. No speculative work.
- [x] **Ambiguity handling (P-XII)**: The three screen-02 ambiguities were resolved with the human
      (Q1–Q3) and are reflected in the spec; the undesigned List view is deferred, not guessed.

**Definition of done (P-Governance)**: renders on real (fixture) data; handles empty (two kinds) /
loading / error; responsive at 480/1024/1280 + 1240 max; on-token; keyboard-accessible; passes its
acceptance criteria; builds green. Tracked in `quickstart.md`.

## Architecture & Data Flow

### Runtime path (request → screen)

```text
GET /app/proof
  └─ app/app/layout.tsx (Server, force-dynamic)         [T1, unchanged] — resolves workspace for chrome
       └─ app/app/proof/page.tsx (Server)               [REPLACES placeholder]
            const ws = await getCurrentWorkspace()       (seam, retry-hardened via getDefaultWorkspace)
            <Suspense fallback={<InboxSkeleton/>}>
              <InboxData workspaceId={ws.id}/>            (async Server)
                 proofs = await getProofs(ws.id)          ── withDbRetry, workspace-scoped
                 proofs.length === 0  → <InboxEmpty/>     (no-proof-at-all empty state)
                 else                 → <InboxClient proofs={proofs}/>   (Client island)
            </Suspense>
  page read fails past retries → app/app/proof/error.tsx (Client) → <ErrorState onRetry={reset}/>
  layout workspace read fails  → app/error.tsx (root, from T2.1)   → <ErrorState/>   (unchanged)
```

### The Client island (interaction)

`InboxClient` (`"use client"`) receives the full workspace `ProofView[]` and owns the toolbar state:

```text
InboxClient(proofs)
  state: status ('all'|'new'|'reviewed'|'awaiting'), type ('all'|video|text|photo|audio),
         search (string), sort ('newest')   // 'warmest' is disabled — never settable
  derived (useMemo): filtered = proofs |> status |> type |> search ; sorted = filtered by sort
  renders:
    <InboxToolbar status type search sort counts={shown: sorted.length, total: proofs.length}
                  …setters… />          // chips, Search proof, sort dropdown, count, inert actions
    sorted.length === 0 ? <filtered-empty + clear-filters>   // distinct from InboxEmpty
                        : <InboxWall proofs={sorted}/>
```

- **Filter/sort/search run client-side over the fetched workspace set** (Decision D2). The Server reads
  once; interactions are pure in-memory transforms — instant, no round-trips, no URL coupling.
- **Counts are computed, never fabricated**: `shown` = filtered/sorted length, `total` = workspace
  proof length (FR-008/FR-011).
- **Two empty states**: `InboxEmpty` (server, zero proof in workspace) vs the client filtered-empty
  (zero matches, with clear-filters) — never confused (FR-017).

### The Wall + navigation (ProofCard unchanged)

- `InboxWall` lays out a **CSS-columns masonry** (`columns-1 sm:columns-2 lg:columns-3`, `gap`, each
  item `break-inside-avoid` + bottom margin) — the screen-02 Wall without a JS masonry dependency.
- Each item is a **`relative` wrapper** containing the unchanged `<ProofCard {...proof}/>` **and a
  sibling stretched-link overlay**: an absolutely-positioned `<Link href={`/app/proof/${id}`}>` that
  covers the card (`absolute inset-0`, `aria-label="Open {customerName}'s proof"`). The ProofCard's own
  "Make" button sits at a higher stacking context so it stays independently clickable. This gives
  whole-card navigation **without modifying the ProofCard and without nesting a button inside a link**
  (FR-012, A-06).

### Server / Client split (P-X)

- **Server**: `app/app/proof/page.tsx`, `loading.tsx`, `app/app/proof/[id]/page.tsx`,
  `inbox-data.tsx`, `inbox-empty.tsx`, `inbox-skeleton.tsx`.
- **Client (only where interaction requires)**: `app/app/proof/error.tsx` (boundary), `inbox-client.tsx`
  (toolbar state + derivation), `inbox-toolbar.tsx`, `inbox-wall.tsx` (the stretched-link overlay is a
  client interaction surface). The ProofCard is a shared presentational component (no `"use client"`),
  usable inside the client tree unchanged.

### The workspace-scoping change (the one real data change)

- `getProofs()` → **`getProofs(workspaceId: string)`**: add `where proof.workspaceId = $ws` to the
  existing projection/order, wrap the body in `withDbRetry`.
- `getProof(id)` → **`getProof(workspaceId: string, id: string)`**: add the workspace predicate (a proof
  from another workspace resolves to `null`), wrap in `withDbRetry`. (No caller yet; T2.3 uses it — the
  signature is set now so T2.3 is mechanical.)
- **Caller fix**: `src/app/styleguide/data/page.tsx` (the only `getProofs()` caller) is updated to
  resolve a workspace (`getCurrentWorkspace`) and pass its id — an internal styleguide page; keeps the
  build green. No schema/seed/seam change.

### Cold-start boundary (reused from T2.1)

The page-segment `app/app/proof/error.tsx` catches a genuine failure of the inbox read and renders the
shared `<ErrorState>` inside the persisting chrome. The layout's workspace read remains covered by the
**root `app/error.tsx`** added in T2.1 — unchanged here. Both reads are retry-hardened (`withDbRetry`).

## Project Structure

### Documentation (this feature)

```text
specs/T2.2-proof-inbox/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (filter location, masonry, navigation, Warmest-disabled)
├── data-model.md        # Phase 1 — read model + the inbox derivation (filter/sort/search/count)
├── contracts/
│   ├── queries-workspace-scoped.md  # getProofs(workspaceId)/getProof(workspaceId,id) signatures
│   └── inbox-derivation.md          # client filter/sort/search/count contract (semantics)
├── quickstart.md        # Phase 1 — validation/run guide + DoD checks
└── checklists/requirements.md       # (from /speckit.specify)
```

### Source Code — files this slice adds / changes

```text
src/
├── app/app/proof/
│   ├── page.tsx                 # CHANGE: placeholder → Server inbox page (resolve ws + Suspense(InboxData))
│   ├── loading.tsx              # ADD: route-segment loading fallback → <InboxSkeleton/>
│   ├── error.tsx                # ADD: "use client" page boundary → <ErrorState onRetry={reset}/>
│   └── [id]/
│       └── page.tsx             # ADD: minimal Server placeholder for proof detail (real detail = T2.3)
├── components/app/proof-inbox/
│   ├── inbox-data.tsx           # ADD: async Server — getProofs(ws.id); branch empty vs InboxClient
│   ├── inbox-client.tsx         # ADD: "use client" — toolbar state, derivation, filtered-empty
│   ├── inbox-toolbar.tsx        # ADD: "use client" — chips, Search proof, sort, count, inert actions
│   ├── inbox-wall.tsx           # ADD: "use client" — CSS-columns masonry + stretched-link overlay
│   ├── inbox-empty.tsx          # ADD: Server — no-proof-at-all empty state
│   └── inbox-skeleton.tsx       # ADD: Server — toolbar + Wall skeleton (for loading.tsx)
├── db/queries.ts                # CHANGE: getProofs(workspaceId) + getProof(workspaceId,id), both retry-wrapped + scoped
└── app/styleguide/data/page.tsx # CHANGE: pass a workspace id to getProofs (only existing caller)

# UNCHANGED (asserted in quickstart DoD checks):
#   src/components/proof-card.tsx     (byte-identical — FR-003/SC-008)
#   src/components/app/error-state.tsx, src/db/with-retry.ts   (reused as-is from T2.1)
#   src/lib/session.ts, src/db/schema.ts, src/db/seed.ts       (seam/schema/seed untouched)
#   src/app/error.tsx                 (root boundary from T2.1, reused)
```

**Structure Decision**: Single Next.js App Router project. Inbox UI grouped under
`src/components/app/proof-inbox/` (mirroring `…/dashboard/` from T2.1). The read + scoping live in the
existing `src/db/` layer; reliability (`withDbRetry`) and the error surface (`<ErrorState>`) are reused
verbatim from T2.1.

## Phase 0 — Outline & Research

All Technical Context items are known; research resolved the design choices the spec left to the plan
(full write-up in `research.md`):

- **D1 — Navigation without touching ProofCard**: stretched-link overlay sibling inside a `relative`
  wrapper; Make button kept above via stacking. Chosen over wrapping the card in a link (would nest a
  button in an anchor — invalid) or modifying the card (forbidden).
- **D2 — Filter/sort/search location**: **client-side, in-memory over the fetched workspace set**.
  Rationale: demo scale (tens–low-hundreds), one server read, instant interactions, no URL/round-trip
  cost; the spec left URL persistence optional (A-05). **Scale implication**: at thousands of proof,
  "fetch all + filter in memory" degrades; the migration path is server-side filtering + pagination via
  query params, with the count becoming a server aggregate. Flagged for a later tier; not built now.
- **D3 — Masonry Wall**: CSS multi-column (`columns-*` + `break-inside-avoid`), no JS masonry lib (no
  new dependency). Caveat: CSS columns flow **column-major**, so "Newest" is strictly correct within the
  ordered array but reads top-to-bottom per column rather than left-to-right rows — acceptable and
  faithful to the pictured Wall. True row-major masonry would need JS/a lib (rejected: new dependency).
- **D4 — "Warmest" disabled**: a disabled item in the working sort control with an accessible name +
  `aria-disabled`/tooltip; never settable, never reorders (A-11/Q1, FR-019). No owned-data proxy.
- **D5 — Reuse vs rebuild**: `withDbRetry`, `<ErrorState>`, the Suspense+`loading.tsx`+`error.tsx`
  pattern, and the root boundary are reused unchanged from T2.1; only inbox-specific UI is new.

**Output**: `research.md` (no NEEDS CLARIFICATION remain — Q1–Q3 resolved in the spec).

## Phase 1 — Design & Contracts

- **`data-model.md`**: reuses `ProofView` unchanged; documents the workspace-scoping of
  `getProofs`/`getProof`; specifies the **inbox derivation** as a pure transform over `ProofView[]`
  (status/type/search predicates, the Newest comparator, the disabled Warmest, the `{shown, total}`
  count). No DB schema change; no new stored entity.
- **`contracts/queries-workspace-scoped.md`**: the new `getProofs(workspaceId)` /
  `getProof(workspaceId, id)` signatures, the workspace predicate, retry-wrapping, and the
  caller-update note.
- **`contracts/inbox-derivation.md`**: the exact client-side filter/sort/search/count semantics the
  toolbar and Wall agree on (so behaviour is testable against the data).
- **`quickstart.md`**: runnable validation — open `/app/proof`; verify the Wall renders the
  workspace-scoped proof; exercise each status/type chip, search, and the Newest sort against the
  fixtures; confirm Warmest is disabled; confirm the count is `{shown} of {total}`; both empty states;
  cold-start recovery + error; a card navigates to `/app/proof/[id]` (placeholder); DoD gates (ProofCard
  byte-unchanged, no new dep, typecheck/lint/build green, both themes, breakpoints, keyboard).
- **Agent context**: update the `<!-- SPECKIT START/END -->` pointer in `CLAUDE.md` to this plan and
  mark T2.2 the active slice.

**Re-check Constitution after Phase 1**: still all PASS — no new dependency, no schema change, no
off-token styling, ProofCard/seam/schema/seed untouched, A-11 honoured.

## Phase 2 — Task planning approach (NOT executed here)

`/speckit.tasks` will derive atomic, dependency-ordered tasks: the query-scoping change + caller fix;
the page + Suspense + `loading.tsx`/`error.tsx`; `[id]` placeholder; the InboxData/Empty/Skeleton
server pieces; the InboxClient/Toolbar/Wall client island (with the stretched-link overlay); the A-11
control decisions (Newest/Warmest, inert Request/Add proof, hidden toggle + batch cluster); responsive +
keyboard + both themes; and the DoD checks (ProofCard byte-unchanged, no new dep, build green). User
stories map P1 (US1 Wall, US2 filter/search) → core; P2 (US3 sort, US4 navigation, US5 reliability/
states). **No test tasks** (no runner; verification via the checks above), consistent with T1/T2.1.

## Complexity Tracking

No constitution violations to justify — the table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
