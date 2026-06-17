# Implementation Plan: T3.1 — Library (the home for generated clips)

**Branch**: `main` (a `T3.1-library` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T3.1-library/spec.md`

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Stop and report after Phase 2
planning. When implemented, the implementation will **leave every change uncommitted** — Cornel reviews and
commits manually (mirrors the T2.4a/T2.4b hand-off).

## Summary

The first T3 (derived-asset surfaces) slice: replace the `/app/library` **T1 placeholder** with a real
**Library** — the home for every clip a workspace has generated. It is the **read counterpart** to the clip
studio (T2.4b): the studio writes one `derived_asset` per Generate; the Library reads them all.

One new **workspace-scoped, withdrawal-filtered** read — **`getLibraryClips(workspaceId)`** — returns ALL
the workspace's clips, **newest first**, joined to their source proof for the customer + the source-proof
link, and **withheld** through the **same shared `effectiveConsentState`/`effectiveConsentGranted`** that
governs the dashboard and proof-detail clip reads (P-VII: a clip under a revoked/awaiting proof is excluded
from the collection AND the count; its `derived_asset` row is retained — "pull, don't destroy"). It reuses
the T2.4a clip-read pattern verbatim (`withDbRetry`, the shared gate); **the existing reads are not
touched**.

The page is **server-first**, inside the existing AppChrome: a **clip grid** whose cards show only owned
values — **format**, the **brand hook**, the **source customer**, the **created date**, and the honest
**sample/preview** label (clips are still stubbed renders pre-T8) — plus an **honest owned count**. The full
state set ships: populated, an **honest empty** state, a **loading** skeleton, and the shared
**`<ErrorState>`**.

**A-11 governs what renders.** Each card links to the **source proof** (`/app/proof/[id]` — the one
destination that exists today). It renders **no** per-clip-detail link (T3.2 is unbuilt), **no** inline
sample playback (there is no real render to play — FR-019), and **none** of screen-09's later-tier/un-owned
controls: Kind/Source/Consent **filters**, the **List/Grid toggle**, the **"Download clips" bulk action**
(export = T4), or the **Ready/Queued render-status** column (no owned pipeline pre-T8). They are **hidden,
not dead**.

**Byte-stable**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`, `ClipView`, and **all
existing clip reads** (`getProofClips`, the `getDashboardSummary` clip reads, `effectiveConsentState`/
`effectiveConsentGranted`) are unchanged — the Library only **adds** one read + one view type + new UI. **No
schema change** (reads the existing `derived_asset`). **No new dependency.**

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing only — `next`, `react`, `drizzle-orm`, `@neondatabase/serverless`,
`lucide-react`. **No new dependency.**

**Storage**: Neon Postgres via the lazy `getDb()` + Drizzle. **No schema change** — one new **read** of the
existing `derived_asset` (joined to `proof` + the shared effective-consent subquery). No migration, no write.

**Testing**: No unit-test runner (as throughout). Verification = `npm run typecheck`/`lint`/`build` (green
**without** `DATABASE_URL` — lazy client) + the `quickstart.md` manual checks (populated/empty/loading/error;
withdrawal parity with the dashboard/detail; the source-proof link; byte-stability; no new dep).

**Target Platform**: Vercel; modern browsers. `/app/*` is `force-dynamic` (inherited from the `/app` layout
that wraps AppChrome). The Library route renders inside that chrome automatically.

**Performance Goals**: Demo scale. One small read (a `derived_asset`⋈`proof` select with the correlated
effective-consent subquery — same shape as the existing clip reads). Newest-first ordering, full collection
rendered (volume cap is an explicit later concern — Assumptions A-08).

**Constraints**: Drizzle only; Server Components by default (no client interactivity needed); Tailwind
classes only; `withDbRetry` on the read; workspace-scoped + tenant-isolated; honest owned values only
(FR-019); A-11 (no dead/fabricated controls); ProofCard + shared proof/clip shapes + existing clip reads
byte-stable; no schema change; no new dependency.

**Scale/Scope**: One new query function, one new view type, one route replacement (+ its `loading`/`error`
segment files), and one new component folder (`library/`: data integrator, grid, card, empty, skeleton).

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS — no violations to justify.*

- [x] **Customer is the headline (P-II)**: Each clip card leads with the **source customer**; the brand hook
      is clearly the brand's framing, separate from the customer's words (render spec §7.4). The Library
      chrome stays quiet.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, R2
      reference for the sample. **No new dependency.** Clips stay sample-stubbed (real render is T8).
- [x] **Pressroom tokens (P-IV)**: On-token only; persimmon reserved for the primary action + the verified
      mark. The sample/preview chip and the grid are quiet chrome around the proof.
- [x] **Port, don't redesign (P-V)**: Ported from **screen 09**. The **A-11 port-completeness rule** governs:
      the clip collection renders; the unified-library / filter / toggle / bulk-download / render-status
      controls are **not** rendered (Q1 clips-only; the rest deferred/un-owned). The clips-only and
      card-boundary decisions were resolved as Q1–Q3 (P-XII), not guessed.
- [x] **Fixtures-first (P-VI)**: Reads the existing fixtures/seed via the query layer; the Library is the
      read counterpart to the studio's write; the existing seed already carries active + withheld clips.
- [x] **Consent enforcement (P-VII)**: The slice's defining law of **visibility** — read-time withdrawal via
      the **shared** effective-consent logic, so the Library shows a clip **iff** the dashboard/detail do; the
      withheld clip's row is retained (audit).
- [x] **No editor (P-VIII)**: N/A — the Library is read-only browsing; no editing, no timeline.
- [x] **SDD scope (P-IX, P-XI)**: One vertical slice — the read + the surface + states. Export (T4),
      publishing/showcase (later), the real engine (T8), and the per-clip detail (T3.2) are out of scope. No
      speculative additions.
- [x] **Ambiguity handling (P-XII)**: Q1 (clips-only vs unified), Q2 (card boundary), Q3 (per-clip actions)
      were surfaced against the named screen 09 and resolved with the human before this plan.

**Definition of done (P-Governance)**: renders on real (fixture) data (the clip grid); handles empty
(honest) / loading / error states; responsive across `480 / 1024 / 1280` (+1240 max); keyboard-accessible
(the grid + each source-proof link); matches Pressroom tokens; builds green without `DATABASE_URL`. Tracked
in `quickstart.md`.

## Architecture & Data Flow

### The read — `getLibraryClips(workspaceId)` (added to `src/db/queries.ts`; existing reads untouched)

- Signature: `getLibraryClips(workspaceId: string): Promise<LibraryClipView[]>`, `withDbRetry`-wrapped.
- Query: `select` from `derived_asset` **innerJoin** `proof` (for the source customer + the link target +
  the verified mark), `where workspaceId = $ws AND effectiveConsentGranted(derivedAsset.proofId)`,
  `order by createdAt desc`. This is the **same shape** as `getProofClips` / the `getDashboardSummary` clip
  reads — it **reuses the shared `effectiveConsentGranted`** (→ `effectiveConsentState`), so the Library's
  withdrawal is provably identical to the dashboard/detail (one source of truth — P-VII).
- Projection (owned only — FR-019): `id`, `proofId`, `customerName`, `verified`, `format`, `hook`,
  `assetUrl` (the stubbed sample reference), `createdAt`. **No** view/reach/engagement/performance, **no**
  render status.
- Withheld clips (source proof's effective consent ≠ granted) are **excluded** from the rows (and therefore
  the count); their `derived_asset` rows are **retained** (the read is a filter, not a delete).

### The view type — `LibraryClipView` (added to `src/lib/clip.ts`; `ClipView` unchanged)

- A new interface = the owned clip fields the Library card needs: the existing `ClipView` shape (`id`,
  `kind`, `format`, `assetUrl`, `hook`, `createdAt`) **plus** `proofId`, `customerName`, `verified`. Defined
  **alongside** `ClipView` (which stays byte-unchanged — `getProofClips` still returns `ClipView[]`).

### The page & components (server-first, inside AppChrome)

- `src/app/app/library/page.tsx` (**replaces the placeholder**): Server — resolves the workspace via the
  unchanged seam (`getCurrentWorkspace`), streams `<LibrarySkeleton/>` via `<Suspense>` → `<LibraryData>`;
  `metadata`. Inherits `/app` `force-dynamic` + AppChrome.
- `src/app/app/library/loading.tsx`: Server → `<LibrarySkeleton/>` (route-segment fallback, mirrors the
  inbox).
- `src/app/app/library/error.tsx`: `"use client"` boundary → `<ErrorState onRetry={reset}/>` (no raw text).
- `src/components/app/library/library-data.tsx` (async Server): `clips = await getLibraryClips(ws.id)`;
  `clips.length === 0` → `<LibraryEmpty/>`, else `<LibraryGrid clips={clips}/>`.
- `src/components/app/library/library-grid.tsx` (Server): the header (title + **honest count**, e.g.
  "{n} clips") + the **clip grid** (a responsive grid/masonry of `<LibraryClipCard>` — newest first).
- `src/components/app/library/library-clip-card.tsx` (Server): one clip — the **source customer** (the
  headline, P-II), the **brand hook** (when set, clearly the brand's words — render spec §7.4), the
  **format** (display label, reused from the studio's `FORMAT_OPTIONS` map), the **created date**, and the
  honest **"sample/preview"** chip. The **whole card is a `Link` to `/app/proof/[proofId]`** (the source
  proof — the one existing destination; keyboard-focusable, visible focus). **No** clip-detail link, **no**
  inline play, **no** re-make/export/share (A-11 / FR-011 / FR-012).
- `src/components/app/library/library-empty.tsx` (Server): the **honest empty** state (no fabricated
  rows/counts) — orients the merchant toward generating one (a quiet link to the proof inbox `/app/proof`,
  which exists, where "Make a clip" lives on a granted proof). Reached when there are zero clips **or** all
  are withheld.
- `src/components/app/library/library-skeleton.tsx` (Server): on-token loading skeleton mirroring the grid.

### A-11 — what is deliberately NOT rendered (hidden, not dead)

Kind/Source/Consent **filters** (clips-only — Q1; a Consent filter also contradicts read-time withdrawal);
the **List/Grid toggle** (single grid view — both not built); the **"Download clips (N)"** bulk action
(export = T4); the **Ready/Queued status** column (no owned render pipeline pre-T8 — FR-019); any per-clip
**detail link** (T3.2 unbuilt) or **inline play** (no real render — FR-019); any **view/engagement/
performance** metric (FR-012). The honest per-clip signal is the **sample/preview** chip.

### Byte-stability (asserted)

- **ProofCard** unchanged. `src/lib/proof.ts` (`ProofView`/`ProofCardProps`/`ProofDetailView`) unchanged.
  `src/lib/clip.ts` — `ClipView` byte-unchanged (`LibraryClipView` is a **new** addition). `src/db/queries.ts`
  — `getProofs`/`getProof`/`getProofClips`/the `getDashboardSummary` clip reads/`effectiveConsentState`/
  `effectiveConsentGranted`/`getGrantedConsentId`/`insertDerivedAsset` **unchanged**; only `getLibraryClips`
  is added. **No schema change.** The session seam, AppChrome, and the dashboard/detail/inbox surfaces are
  untouched.

## Project Structure

### Documentation (this feature)

```text
specs/T3.1-library/
├── plan.md              # This file
├── research.md          # Phase 0 — D1 reuse-the-clip-read-pattern, D2 LibraryClipView, D3 grid-not-table,
│                        #            D4 card=source-proof Link, D5 A-11 omissions, D6 honest count/empty
├── data-model.md        # Phase 1 — LibraryClipView shape + the read's projection & withdrawal derivation
├── contracts/
│   ├── library-read.md          # getLibraryClips signature, the join, the withdrawal filter, byte-stability
│   └── library-surface.md       # the route + page + grid/card/empty/skeleton, the source-proof link, A-11 omissions
├── quickstart.md        # Phase 1 — open the Library; populated/empty/loading/error; withdrawal parity; DoD
└── checklists/requirements.md   # (from /speckit.specify; Q1–Q3 resolved)
```

### Source Code — files this slice adds / changes

```text
src/
├── db/queries.ts                 # CHANGE (ADD only): getLibraryClips(workspaceId) — workspace-scoped,
│                                 #   withdrawal-filtered via the shared effectiveConsentGranted, proof join.
│                                 #   EXISTING reads byte-unchanged.
├── lib/clip.ts                   # CHANGE (ADD): LibraryClipView (ClipView + proofId/customerName/verified).
│                                 #   ClipView byte-unchanged.
├── app/app/library/
│   ├── page.tsx                  # REPLACE the placeholder: Server — workspace + Suspense → LibraryData; metadata
│   ├── loading.tsx               # ADD: Server → <LibrarySkeleton/>
│   └── error.tsx                 # ADD: "use client" boundary → <ErrorState onRetry={reset}/>
└── components/app/library/
    ├── library-data.tsx          # ADD: async Server — getLibraryClips; empty → <LibraryEmpty/> else <LibraryGrid/>
    ├── library-grid.tsx          # ADD: Server — header + honest count + the clip grid (newest first)
    ├── library-clip-card.tsx     # ADD: Server — one clip; whole card Links to /app/proof/[proofId]
    ├── library-empty.tsx         # ADD: Server — honest empty state (links to /app/proof)
    └── library-skeleton.tsx      # ADD: Server — on-token loading skeleton

# UNCHANGED (asserted in quickstart DoD checks):
#   src/components/proof-card.tsx                                   (byte-identical)
#   src/lib/proof.ts → ProofView/ProofCardProps/ProofDetailView    (unchanged)
#   src/lib/clip.ts → ClipView                                     (byte-unchanged; LibraryClipView is new)
#   src/db/queries.ts → getProofs/getProof/getProofClips/getDashboardSummary clip reads/
#                       effectiveConsentState/effectiveConsentGranted/getGrantedConsentId/insertDerivedAsset  (unchanged)
#   src/db/schema.ts                                               (NO schema change — reads existing derived_asset)
#   AppChrome / rail / top-bar / switcher / command palette        (chrome untouched)
#   src/components/app/section-placeholder.tsx                     (still used by other placeholder routes)
```

**Structure Decision**: Single Next.js App Router project. The read lives in the existing `src/db/` layer
(Drizzle only); the view type alongside `ClipView` in `src/lib/clip.ts`; the surface in a new
`src/components/app/library/` folder mirroring `proof-inbox/`. The route replaces the placeholder and gains
the `loading`/`error` segment files the spine uses.

## Phase 0 — Outline & Research

All Technical Context items are known; research records the design choices (full write-up in `research.md`):

- **D1 — Reuse the T2.4a clip-read pattern**: `getLibraryClips` is the same shape as `getProofClips` /
  the `getDashboardSummary` clip reads — `withDbRetry`, the shared `effectiveConsentGranted` gate, a `proof`
  join — differing only in scope (whole workspace, no `proofId` filter). Chosen so the withdrawal logic is
  provably identical (one source of truth) and no existing read changes.
- **D2 — `LibraryClipView` (new), `ClipView` unchanged**: the card needs the source customer + proof link +
  verified mark, which `ClipView` doesn't carry; a new interface adds them without touching `ClipView`
  (`getProofClips` stays byte-stable). Chosen over widening `ClipView` (would ripple into the detail read).
- **D3 — A grid of clip cards, not screen-09's table**: clips are visual (vertical video); a card grid is
  the faithful "clip collection" and matches the brief. The List/Grid toggle and the proof+clip table are
  not built (A-11). Chosen over porting the table literally (which carries un-owned columns + a toggle whose
  List half isn't built).
- **D4 — The whole card is a `Link` to the source proof**: the one existing destination (Q2→C). Built into
  the new card directly (no stretched-link overlay needed — unlike the inbox's byte-frozen ProofCard).
- **D5 — A-11 omissions**: filters, List/Grid toggle, bulk download, render status, clip-detail link, inline
  play, and any metric are **not rendered** (deferred to T4/T8/T3.2 or un-owned). Hidden, not dead.
- **D6 — Honest count + honest empty**: the count is the length of the withdrawal-filtered rows (owned); the
  empty state (zero clips OR all withheld) is an honest derived state orienting toward making one.

**Output**: `research.md` (no NEEDS CLARIFICATION remain — Q1–Q3 resolved in the spec; D1–D6 recorded).

## Phase 1 — Design & Contracts

- **`data-model.md`**: the `LibraryClipView` shape, the `getLibraryClips` projection, and the **read-time
  withdrawal** derivation (effective consent) — no entity/schema change (reads the existing `derived_asset`).
- **`contracts/library-read.md`**: `getLibraryClips` signature, the `derived_asset`⋈`proof` join, the shared
  `effectiveConsentGranted` withdrawal filter, the owned-only projection, and the byte-stability assertions.
- **`contracts/library-surface.md`**: the route (page/loading/error) + the grid/card/empty/skeleton
  components, the source-proof `Link`, the honest count, and the A-11 omissions (filters/toggle/bulk/status/
  detail-link/play) with the FR-019 + P-VII assertions.
- **`quickstart.md`**: open `/app/library`; confirm the populated grid (owned fields + sample label, newest
  first) and count; confirm the **same** clip set as the dashboard/detail (withdrawal parity — Leo M.'s clip
  absent); the empty state (reseed to zero / all-withheld); loading + error (cold start / persistent fail);
  the source-proof link navigates; the DoD gates (no filters/toggle/bulk/status/detail-link/play;
  byte-stability; no new dep; build green without `DATABASE_URL`; responsive + keyboard).
- **Agent context**: update the `<!-- SPECKIT START/END -->` pointer in `CLAUDE.md` to this plan and mark
  T3.1 the active slice (the only edit outside `specs/` during planning; left **uncommitted** for review).

**Re-check Constitution after Phase 1**: still all PASS — one additive read, no schema change, no new
dependency, P-VII withdrawal via the shared helper (audit-preserving), A-11 honest omissions, owned-only
values (FR-019), ProofCard/shared shapes/existing reads byte-stable, chrome untouched.

## Complexity Tracking

No constitution violations to justify — the table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
