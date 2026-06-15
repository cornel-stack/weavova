# Implementation Plan: T2.1 — Workspace Dashboard (the spine begins)

**Branch**: `main` (no feature branch created by the hook) | **Date**: 2026-06-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T2.1-dashboard/spec.md`

**Guardrail**: This is a PLAN only. Do **not** run `/speckit.tasks` or implement. Stop and report after Phase 2 planning.

## Summary

Replace the `/app` placeholder with a faithful port of `/design-reference` screen 01 (Dashboard),
rendered inside the existing T1 AppChrome. A **Server Component** page resolves the current workspace
through the unchanged T1 session seam (`getCurrentWorkspace`) and reads **one workspace-scoped
dashboard summary** through the T0.3 query layer. The summary assembles the FR-004 real-date KPI
windows (proof-this-week, needs-review), the constant `clipsThisMonth: 0` and `latestClip: null`
(no derived-asset entity until T2.4), and the hero + recent-proof selection. The data read is wrapped
in a **reusable transient-failure retry helper** (`withDbRetry`) so Neon free-tier cold starts recover
transparently behind a loading skeleton, surfacing an on-token error (with retry) only on genuine
failure. The recent-proof grid reuses the **byte-unchanged** canonical `ProofCard`; the hero is a new
larger presentation of the same `ProofView`. No schema change, no auth change, no seed change
(A-10 is a separate task), no new dependency. The Client islands are limited to the two Next.js error
boundaries (error boundaries must be Client) — a page-segment `app/app/error.tsx` and a **root**
`app/error.tsx` that catches the `/app` layout's own (retry-hardened) workspace-read failure — both
rendering **one shared `<ErrorState>`**; everything else is Server.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing only — `next`, `react`, `drizzle-orm`, `@neondatabase/serverless`,
`lucide-react`, `next-themes`, `cmdk`. **No new dependency** (FR-018, SC-007).

**Storage**: Neon Postgres via the lazy `getDb()` client (`src/db/client.ts`) + Drizzle. Read-only for
this slice. Schema unchanged (`src/db/schema.ts`).

**Testing**: No unit-test runner in the repo (consistent with T1). Verification = `npm run typecheck`,
`npm run lint`, `npm run build`, CI (typecheck+lint+build, green without `DATABASE_URL`), the rendered
`/app` screen, and the explicit DoD checks in `quickstart.md` (ProofCard byte-unchanged, no off-stack
dep, both themes, breakpoints, keyboard).

**Target Platform**: Vercel (Fluid Compute / Node runtime); modern browsers. `/app/*` is
`force-dynamic` (request-time render) per T1.

**Project Type**: Web application — Next.js App Router single project (`src/`).

**Performance Goals**: Dashboard interactive within a few seconds of load even on a Neon cold start
(SC-001); retry budget bounded so a genuine failure surfaces promptly rather than hanging.

**Constraints**: Server Components by default, Client only where interaction requires it (P-X);
Tailwind token utilities only, no inline styles; no `localStorage`/`sessionStorage`; Drizzle only
(no raw SQL outside migrations); `prefers-reduced-motion` honoured by the existing global rule.

**Scale/Scope**: One screen (screen 01); ~15 seeded proofs in one demo workspace; grid capped at 6
(A-04). Read model only.

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS.*

- [x] **Customer is the headline (P-II)**: The hero renders the customer's verbatim quote/transcript
      (Fraunces, `--text-quote`/Display) or honest media as the largest, warmest element; KPI numbers,
      greeting, labels, and chrome stay quiet. Grid cards are the unchanged proof-forward ProofCard.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 tokens, Neon + Drizzle.
      No new dependency. No render on Vercel (none in this slice). Auth seam untouched.
- [x] **Pressroom tokens (P-IV)**: Only token utilities (`bg-card`, `text-ink`, `rounded-clip`,
      `shadow-clip`, `font-display`, `text-quote`, `ease-pressroom`, etc.). Persimmon appears ONLY on
      the primary actions ("Request proof", hero "Make a clip") and the verified mark (inside
      ProofCard) — nowhere else (greeting/KPIs/labels are ink).
- [x] **Port, don't redesign (P-V)**: Ported from `/design-reference/Weavova/The spine/01 _ Dashboard
      _app.(html|png)`. Loading/empty/error are realized as minimal on-token states (their canonical
      ports are screens 15–17 at T3). The "top clip · N views" cell is reframed to the owned "latest
      clip" per FR-005a/FR-019 (un-owned analytics not invented).
- [x] **Fixtures-first (P-VI)**: All data flows through the T0.3 query layer over the seeded fixtures;
      the `DashboardSummary` read model is shaped so the T2.4 clip swap (`clipsThisMonth`/`latestClip`)
      and T6 multi-tenant swap are mechanical, not a redesign.
- [x] **Consent enforcement (P-VII)**: The hero "Make a clip" is offered ONLY when effective consent is
      `granted`; the grid inherits ProofCard's existing consent gate. No clip path from non-consented
      proof. (Cascade itself is schema-modeled, not exercised by this read-only surface.)
- [x] **No editor (P-VIII)**: N/A — the dashboard shows proof and links toward the studio; it builds no
      timeline/track/scrubber and does not build the studio.
- [x] **SDD scope (P-IX, P-XI)**: One vertical slice (T2.1) within tier T2. Inbox/detail/studio/request
      flow are NOT built; their affordances are present-but-inert. No speculative work. The seed
      amendment (A-10) is explicitly out of this slice.
- [x] **Ambiguity handling (P-XII)**: The two open questions were resolved with the human (Q1/Q2) and
      are reflected in the requirements/assumptions; no remaining guesses.

**Definition of done (P-Governance)**: renders on real (fixture) data; handles empty/loading/error;
responsive at 480/1024/1280 and the 1240px content max; on-token; keyboard-accessible; passes its
acceptance criteria; builds green. Tracked in `quickstart.md`.

## Architecture & Data Flow

### Runtime path (request → screen)

```text
GET /app
  └─ app/app/layout.tsx (Server, force-dynamic)        [T1, unchanged]
       getSession()            → stub user (no DB)
       getCurrentWorkspace()   → getDefaultWorkspace()  ── wrapped by withDbRetry (cold-start hardened)
       renders <AppChrome> (Client island) with workspace name/slug
         └─ app/app/page.tsx (Server)                   [REPLACES placeholder]
              renders masthead scaffold (greeting + Request proof + KPI frame)
              <Suspense fallback={<DashboardSkeleton/>}>
                <DashboardBody workspaceId=…/>   (async Server)
                   getDashboardSummary(workspaceId)  ── wrapped by withDbRetry
                      → counts aggregate + hero/recent fetch (scoped to workspaceId)
                   renders KPI values, hero, recent grid (ProofCard), OR empty state
              </Suspense>
  page read retry-exhausted throw    → app/app/error.tsx (Client) → <ErrorState onRetry={reset}/>  (chrome stays)
  layout workspace retry-exhausted   → app/error.tsx     (Client) → <ErrorState onRetry={reset}/>  (full-page; chrome can't mount)
```

- **Loading**: `DashboardBody` suspends while `getDashboardSummary` runs (including retries);
  `DashboardSkeleton` streams immediately behind the chrome. (`loading.tsx` is also added as the
  route-segment fallback for client navigations into `/app`; both render the same skeleton component.)
- **Cold start**: the retry helper absorbs transient Neon failures inside the suspended read — the user
  keeps seeing the skeleton, then the resolved content streams in. No error is shown unless retries
  are exhausted.
- **Error**: a genuine failure (after retries) throws. A failure in the **page read** is caught by
  `app/app/error.tsx`, which renders `<ErrorState>` inside the persisting chrome. A failure in the
  **layout's workspace read** is caught by the **root** `app/error.tsx` (a segment's own `error.tsx`
  cannot catch its own layout — Next.js rule), which renders the same `<ErrorState>` full-page (the
  chrome cannot mount because the workspace it needs is unavailable). Both pass `reset()` as the retry
  and never expose raw error text (FR-014). See "Cold-start boundary" below.
- **Empty**: `getDashboardSummary` returns zeroed counts + `heroProof: null` + empty `recentProof`;
  `DashboardBody` renders the empty-state panel pointing at "Request proof".

### Server / Client split (P-X)

- **Server (default)**: `page.tsx`, `loading.tsx`, `DashboardBody`, `DashboardMasthead`,
  `DashboardKpis`, `DashboardHero`, `DashboardEmpty`, `DashboardSkeleton`. None need client JS — the
  inert affordances are plain `<button type="button">` / `<a>` elements, and the greeting is computed
  at render time.
- **Client (only where required)**: the two error boundaries — `app/app/error.tsx` (page segment) and
  `app/error.tsx` (root, catches the `/app` layout) — both `"use client"` because Next.js error
  boundaries must be Client. Each renders the shared, presentational `<ErrorState onRetry={reset}/>`
  (`src/components/app/error-state.tsx`) — **one error UI, no duplication**. No other client island is
  added; the existing `AppChrome` remains the chrome island.

### The single workspace-scoped read — `getDashboardSummary`

Lives in the T0.3 query layer (`src/db/queries.ts`), beside `getProofs`/`getProof`. It is the one
entry point the dashboard calls and the one place wrapped by `withDbRetry`. It performs a minimal,
bounded set of **workspace-scoped** queries inside that single retry boundary:

1. **Counts aggregate** (one query, `where proof.workspaceId = $ws`): `proofThisWeek`
   (`capturedAt >= now() - 7 days`), `needsReview` (`reviewed = false`), `totalProof`. Computed in SQL
   via Drizzle aggregates so counts cover ALL workspace proof, not just the fetched page.
2. **Hero + recent fetch** (one query): the existing `proofColumns` projection + `latestConsentState`
   subquery, `where workspaceId = $ws`, `order by capturedAt desc`, `limit N+1` (N = grid cap 6, +1 for
   the hero). Mapped to `ProofView[]` via the existing `toView`. Element 0 → `heroProof`; elements
   1..N → `recentProof`.
3. **Clip-derived fields**: `clipsThisMonth: 0` and `latestClip: null` are returned as constants today,
   each tagged with a `// T2.4:` comment marking the exact swap to the real `derived_asset` read. They
   are part of the contract now so the masthead and the T2.4 wiring do not change shape (P-VI).

Window math uses the real current date (FR-004/A-02); never anchored to the newest proof. The "this
week" boundary is expressed in the SQL predicate (DB `now()`), keeping it server-authoritative.

Workspace scoping: `getDashboardSummary` filters on `proof.workspaceId`. The pre-existing
`getProofs`/`getProof` (used only by the internal `/styleguide/data` page) are left unchanged to avoid
scope creep; their workspace scoping is noted for T2.2 when the inbox needs it (A-08).

### Cold-start retry helper — `withDbRetry`

New reusable module `src/db/with-retry.ts`, usable by every spine read (T2.2+):

- **Signature** (see `contracts/db-retry.md`): `withDbRetry<T>(operation: () => Promise<T>, opts?:
  { attempts?: number; baseDelayMs?: number }): Promise<T>`.
- **Transient classifier**: retries ONLY on transient connectivity/cold-start signals from the Neon
  HTTP driver (e.g. fetch/network failures, connection-terminated, timeouts, HTTP 5xx). It does **not**
  retry deterministic errors (SQL/syntax/constraint, or the explicit "DATABASE_URL is not set" from
  `getDb()`), which rethrow immediately. Classifier is conservative and centralized so the policy is
  one place.
- **Policy**: bounded attempts (default 3) with short fixed backoff steps (e.g. ~250ms, ~750ms) — no
  unbounded waiting; total budget small enough that a genuine failure surfaces an error promptly
  (SC-005). Uses fixed steps (no randomness/jitter needed for a demo).
- **On exhaustion**: rethrows the last transient error so the page's `error.tsx` renders the on-token
  error. Never logs secrets/connection strings.
- **Applied at**: `getDashboardSummary` (the page read) and `getDefaultWorkspace` (the layout's
  workspace read) — wrapping at the query-function level so callers/seam are untouched.

### Cold-start boundary (resolved)

`app/app/error.tsx` catches throws from the page segment and below, but **not** a throw inside
`app/app/layout.tsx` itself (Next.js rule). Because T2.1 already hardens the layout's workspace read
(`withDbRetry` on `getDefaultWorkspace`), it owns theming that read's failure too — so a root
`app/error.tsx` (Client) is added to catch the `/app` layout's retries-exhausted failure and render the
shared `<ErrorState>` rather than Next.js's default page (no raw-error leakage, FR-014). This is the
minimal parent boundary that can catch the layout; it reuses the same `<ErrorState>` component as the
dashboard boundary (no duplicated UI). **Scope guard**: no `global-error.tsx` is added (the root layout
does no risky read), and no other chrome change is made. Both reads (layout + page) are thus covered for
transient cold starts (retry → recover) and genuine failure (themed `<ErrorState>` + retry).

## Project Structure

### Documentation (this feature)

```text
specs/T2.1-dashboard/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (retry classifier, loading mechanism, greeting time)
├── data-model.md        # Phase 1 — read model (DashboardSummary) + field derivations
├── contracts/
│   ├── dashboard-summary.md   # getDashboardSummary signature + DashboardSummary shape
│   └── db-retry.md            # withDbRetry signature + transient classifier contract
├── quickstart.md        # Phase 1 — validation/run guide + DoD checks
└── checklists/requirements.md  # (from /speckit.specify)
```

### Source Code (repository root) — files this slice adds / changes

```text
src/
├── app/
│   ├── error.tsx                # ADD: "use client" ROOT boundary — catches /app layout (workspace-read) failure → <ErrorState/>
│   └── app/
│       ├── page.tsx             # CHANGE: placeholder → Server dashboard page (masthead + Suspense(DashboardBody))
│       ├── loading.tsx          # ADD: route-segment loading fallback → <DashboardSkeleton/>
│       └── error.tsx            # ADD: "use client" page-segment boundary → <ErrorState/> (chrome stays)
├── components/app/
│   └── error-state.tsx          # ADD: shared presentational <ErrorState onRetry> — one themed error UI (no raw error text)
├── components/app/dashboard/
│   ├── dashboard-body.tsx       # ADD: async Server — calls getDashboardSummary, branches data/empty
│   ├── dashboard-masthead.tsx   # ADD: greeting + Request proof (inert) + KPI strip frame
│   ├── dashboard-kpis.tsx       # ADD: the 3 KPI cells + the latest-clip slot (FR-004/005/005a)
│   ├── dashboard-hero.tsx       # ADD: latest-proof hero (larger ProofView treatment, consent-gated CTA)
│   ├── dashboard-empty.tsx      # ADD: zero-proof empty state → Request proof
│   └── dashboard-skeleton.tsx   # ADD: token skeleton (masthead/KPI/hero/grid placeholders)
└── db/
    ├── queries.ts               # CHANGE: add getDashboardSummary(); wrap getDefaultWorkspace in withDbRetry
    └── with-retry.ts            # ADD: reusable withDbRetry + transient-error classifier

# UNCHANGED (asserted in quickstart DoD checks):
#   src/components/proof-card.tsx        (byte-identical — FR-008/SC-007)
#   src/lib/session.ts                   (seam untouched — FR-018/A-07)
#   src/db/schema.ts, src/db/seed.ts     (no schema/seed change — FR-018/A-10)
#   src/lib/proof.ts (ProofView)         (reused as-is; hero reuses the same type)
```

**Structure Decision**: Single Next.js App Router project (`src/`). Dashboard UI is grouped under
`src/components/app/dashboard/` mirroring the existing `src/components/app/` chrome grouping. The read
model and retry helper live in the existing `src/db/` layer so the data path stays in one place and is
reusable across the spine.

## Phase 0 — Outline & Research

All Technical Context items are known (locked stack). Research resolved the design choices that the
spec left to the plan; full write-up in `research.md`:

- **R1 — Loading mechanism**: explicit `<Suspense>` around an async `DashboardBody` (skeleton streams
  behind the resolved-fast chrome) **plus** a `loading.tsx` for client navigations. Chosen over a
  single top-level `await` in the page (which would block the whole page on the DB with no skeleton).
- **R2 — Retry classifier**: centralized transient-vs-genuine classification by inspecting the Neon
  driver's error (name/message/cause/status); retry only transient connectivity/cold-start signals.
- **R3 — Retry policy**: 3 attempts, short fixed backoff, small total budget; rethrow on exhaustion.
- **R4 — Greeting time-of-day**: computed at render from server time (A-05). True client-local time is
  a deferred nicety (would need a tiny client island; not interaction → not worth a client component
  now). Noted as an accepted minor approximation.
- **R5 — Inert affordances**: "Request proof" and hero "Make a clip" are `<button type="button">` no-op
  elements (look primary, do nothing, never error — FR-010/FR-007). "View all in the inbox →" is an
  `<a>` to the existing `/app/proof` placeholder (already present from T1; non-erroring).
- **R6 — One read**: `getDashboardSummary` issues a counts aggregate + a single limited hero/recent
  fetch within one `withDbRetry` boundary. Rejected a single window-function mega-query as less
  readable for no real gain at this scale.

**Output**: `research.md` (no NEEDS CLARIFICATION remain).

## Phase 1 — Design & Contracts

- **`data-model.md`**: documents the read model — `DashboardSummary` and `LatestClipDescriptor` shapes,
  the per-field derivation (windows, counts, hero/grid selection, consent gate), the constants
  (`clipsThisMonth: 0`, `latestClip: null`) and their T2.4 swap points. Reaffirms: no DB schema change;
  reuses existing `proof`/`consent`/`source`/`workspace` tables and the `ProofView` projection.
- **`contracts/dashboard-summary.md`**: the `getDashboardSummary(workspaceId)` signature and the exact
  `DashboardSummary` field contract the masthead/hero/grid consume.
- **`contracts/db-retry.md`**: the `withDbRetry` signature, the transient classifier contract, the
  bounded policy, and the rethrow-on-exhaustion behaviour.
- **`contracts/error-state.md`**: the shared `<ErrorState>` component contract (props, no-raw-error
  rule) reused by both error boundaries.
- **`quickstart.md`**: runnable validation — seed (noting A-10), `npm run dev`, open `/app`, verify
  masthead/KPI/hero/grid render from data; flip a `reviewed` flag / add-remove a proof to prove KPIs
  recompute (SC-002); cold-start simulation (SC-005); empty workspace (SC-006); both themes;
  breakpoints; keyboard; and the DoD assertions (ProofCard byte-unchanged via `git diff --quiet`, no
  off-stack dep, typecheck/lint/build green).
- **Agent context**: update the `<!-- SPECKIT START/END -->` pointer in `CLAUDE.md` to this plan and
  mark T2.1 the active slice.

**Re-check Constitution after Phase 1**: still all PASS — the read model and retry helper introduce no
new dependency, no schema change, no off-token styling, and keep ProofCard/seam/schema untouched.

## Phase 2 — Task planning approach (NOT executed here)

`/speckit.tasks` will derive atomic, dependency-ordered tasks from this plan, expected to cover:
the retry helper; `getDashboardSummary` + `getDefaultWorkspace` wrapping; the page + Suspense; the
masthead/KPIs/hero/empty/skeleton components; the shared `<ErrorState>` + both boundaries
(`app/app/error.tsx` page-segment and root `app/error.tsx` for the layout) + `loading.tsx`; responsive +
keyboard + both themes; and the DoD checks (ProofCard byte-unchanged, no new dep, build green). User stories map P1
(US1, US2) → core render + KPIs; P2 (US3 request action, US4 cold-start/error); P3 (US5 empty).
**No test tasks** (no runner in repo; verification via the checks above), consistent with T1.

## Complexity Tracking

No constitution violations to justify — the table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
