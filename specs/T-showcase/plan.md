# Implementation Plan: T-Showcase — Showcase (curate + preview the wall of proof)

**Branch**: `main` (a `T-showcase` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T-showcase/spec.md` (Status: clarifications RESOLVED — Q1→A curate+preview, Q2→A auto/no-schema, Q3→A both/all-consented/verified-marked)

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Stop and report after Phase 2
planning. When implemented, the implementation will **leave every change uncommitted** — Cornel reviews and
commits manually (mirrors the prior slices).

## Summary

The Showcase is a workspace's **wall of proof** — its consented testimonials and clips arranged as a
public-style display. The *real* (public/embed) form is the distribution tier (**T9**); this slice is its
honest **pre-distribution** half: an internal **curate + preview** surface that, today, **previews the
eligible wall read-only** (Q2→A — the curation + publish/embed cluster defers to T9 **as one coupled
feature**, since you curate *what goes live*).

**Screen 10 "Showcase manager" exists and is ported** (unlike the clip detail) — but only its **owned half**.
Screen 10's **distribution machinery** — the LIVE/"public set" badges, **"Add from library"** curation, the
**Single highlight / Carousel / Wall of Love** layout-and-embed presets, the embed **`<script>` + "Copy
embed"** — is **NOT rendered** (A-11: T9 has no backing, and curation is coupled to publishing). The separate
Public-site "Public showcase" export is the T9 public wall, out of scope.

One new **workspace-scoped, withdrawal-filtered** read — **`getShowcase(workspaceId)`** — returns **both
consented proof and clips** (Q3), newest-first, **withheld** via the **same shared `effectiveConsentGranted`**
that governs the dashboard/Library/detail (P-VII: a withdrawn item is absent; records retained), with the
**verified mark surfaced (not a gate)** and honest counts (FR-019). It **reuses** the existing `proofColumns`/
`toView` projection and the clip projection shape — **no existing read changes, no schema change**.

The page is **server-first**, inside AppChrome: a **public-style wall** (distinct from the inbox masonry and
the Library grid), each item showing only **owned** data (the customer + their words, or a clip's
sample/preview + format/hook, the verified mark, the date) — with the internal chrome the inbox/Library
carry (consent dot, "Unreviewed" stamp, "Make") **omitted** (a public wall doesn't show those). The full
state set ships: populated, honest empty, loading skeleton, shared `<ErrorState>`.

**Byte-stable**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`, `ClipView`/`LibraryClipView`/
`ClipDetailView`, and **every existing read** are unchanged — the slice **adds** one read + one item type +
new wall components. **No schema change. No new dependency.**

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing only — `next`, `react`, `drizzle-orm`, `@neondatabase/serverless`,
`lucide-react`. **No new dependency.**

**Storage**: Neon Postgres via the lazy `getDb()` + Drizzle. **No schema change** — one new **read**
combining a consented-proof query (reusing `proofColumns`/`toView`) and a consented-clip query (the
`getLibraryClips` shape), both gated by the shared effective-consent subquery. No migration, no write.

**Testing**: No unit-test runner. Verification = `npm run typecheck`/`lint`/`build` (green **without**
`DATABASE_URL`) + the `quickstart.md` manual checks (the wall; withdrawal parity; honest empty/loading/error;
no distribution/curation controls; byte-stability; no new dep).

**Target Platform**: Vercel; modern browsers. `/app/*` is `force-dynamic` (AppChrome layout). The Showcase
renders inside the chrome automatically.

**Performance Goals**: Demo scale. Two small reads (consented proof + consented clips), merged + sorted in
memory. Correlated effective-consent subquery (as elsewhere) — negligible.

**Constraints**: Drizzle only; Server Components by default (only `error.tsx` is client); Tailwind classes
only; `withDbRetry`; workspace-scoped; withdrawal-filtered; owned values only (FR-019); A-11 (no
distribution/curation controls, no fabricated LIVE/published state); ProofCard + shared shapes + existing
reads byte-stable; no schema change; no new dependency.

**Scale/Scope**: One new query function, one new item type, one route replacement (+ `loading`/`error`), one
new component folder (`showcase/`: data, wall, item, empty, skeleton).

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS — no violations to justify.*

- [x] **Customer is the headline (P-II)**: The wall is the strongest expression of the law — it *is* the wall
      of real customers' faces/words; chrome quiet. Each item leads with the customer.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, R2 for
      clip samples. **No new dependency.** Clips stay sample-stubbed (T8); distribution off until T9.
- [x] **Pressroom tokens (P-IV)**: On-token only; persimmon reserved for the primary action + the verified
      mark.
- [x] **Port, don't redesign (P-V)**: **Screen 10 is ported** — its owned curate/preview wall. Its T9
      distribution machinery (LIVE/"public set", "Add from library", layout/embed presets, embed snippet/
      "Copy embed") is **not** rendered (A-11). The separate Public-site export is the T9 public wall, not
      this slice. The scope/curation/contents questions were resolved as Q1–Q3 (P-XII), not guessed.
- [x] **Fixtures-first (P-VI)**: Reads the existing fixtures via the query layer; **no schema change** (Q2→A
      auto). The wall is the read counterpart that T9's publish/embed will sit behind.
- [x] **Consent enforcement (P-VII)**: Wall visibility uses the **shared** effective-consent gate — a
      withdrawn item is absent everywhere uniformly, including the surface closest to public; records
      retained (audit).
- [x] **No editor (P-VIII)**: N/A — read-only preview; no editor, no curation mutation (curation is T9).
- [x] **SDD scope (P-IX, P-XI)**: One vertical slice — the wall read + the preview surface + states.
      Publishing/embedding/sharing/curation/the public page (T9) and the real engine (T8) are out of scope.
      No speculative additions; no metric Weavova doesn't own.
- [x] **Ambiguity handling (P-XII)**: Q1 (pre-distribution scope), Q2 (curated vs auto / schema), Q3
      (contents) resolved against the named screen 10 before this plan; the design question resolved by
      inspection.

**Definition of done (P-Governance)**: renders on real (fixture) data (the wall of consented proof+clips);
handles empty (honest) / loading / error; responsive across `480 / 1024 / 1280` (+1240 max);
keyboard-accessible; matches Pressroom tokens; builds green without `DATABASE_URL`. Tracked in `quickstart.md`.

## Architecture & Data Flow

### The read — `getShowcase(workspaceId)` (added to `src/db/queries.ts`; existing reads untouched)

- Signature: `getShowcase(workspaceId: string): Promise<ShowcaseItem[]>`, `withDbRetry`-wrapped (one block,
  two queries).
- **Consented proof** query: `select proofColumns from proof ⋈ source where workspaceId = $ws AND
  effectiveConsentGranted(proof.id)` → `toView` → `ProofView[]`. **Reuses the existing `proofColumns`/`toView`**
  (read, not modified). NB: this differs from `getProofs` (which is **not** consent-filtered — the inbox shows
  all states); the Showcase shows **only granted** (the shared gate), so it is its own query, not a change to
  `getProofs`.
- **Consented clips** query: the **same shape as `getLibraryClips`** — `derived_asset ⋈ proof` where
  `workspaceId = $ws AND effectiveConsentGranted(derived_asset.proofId)`, projected to `LibraryClipView`.
  (Implementation may call `getLibraryClips(workspaceId)` directly for reuse, or inline the same select; both
  leave `getLibraryClips` unchanged.)
- **Merge + order**: wrap each into a `ShowcaseItem` discriminant and **sort newest-first** by the item's date
  (`ProofView.capturedAt` / `LibraryClipView.createdAt`). One mixed, withdrawal-filtered, newest-first list.
- Owned only (FR-019): no view/reach/likes/social/published metric. Verified is carried as a **mark**, not a
  filter.

### The item type — `ShowcaseItem` (added to `src/lib/showcase.ts`; reuses existing view shapes)

A discriminated union reusing the **existing** view shapes (so nothing they depend on changes):
```text
type ShowcaseItem =
  | { kind: 'proof'; proof: ProofView }
  | { kind: 'clip';  clip: LibraryClipView }
```
`ProofView` and `LibraryClipView` are **byte-unchanged**; `ShowcaseItem` is additive.

### The page & components (server-first, inside AppChrome)

- `src/app/app/showcase/page.tsx` (**replaces the placeholder**): Server — resolves the workspace via the
  unchanged seam, streams `<ShowcaseSkeleton/>` via `<Suspense>` → `<ShowcaseData>`; `metadata`.
- `src/app/app/showcase/loading.tsx`: Server → `<ShowcaseSkeleton/>`.
- `src/app/app/showcase/error.tsx`: `"use client"` → `<ErrorState onRetry={reset}/>` (no raw text) — the only
  client file.
- `src/components/app/showcase/showcase-data.tsx` (async Server): `items = await getShowcase(ws.id)`;
  `items.length === 0` → `<ShowcaseEmpty/>`, else `<ShowcaseWall items={items}/>`.
- `src/components/app/showcase/showcase-wall.tsx` (Server): the header (title "Showcase" + the **honest count**
  + a quiet, honest note that publishing/embedding arrives later) and the **public-style wall** — a "Wall of
  Love"-style responsive layout (distinct from the inbox masonry / Library grid), newest-first, of
  `<ShowcaseItem>`.
- `src/components/app/showcase/showcase-item.tsx` (Server): discriminates on `kind` — a **proof testimonial**
  card (the customer's verbatim words as the headline + customer + verified mark + date) or a **clip** card
  (the sample/preview still + format/hook + customer + verified mark + date). **Owned data only; the internal
  chrome is OMITTED** (no consent dot, no "Unreviewed" stamp, no "Make" button — a public wall doesn't show
  those). Each item links to its detail — proof → `/app/proof/[id]`, clip → `/app/clip/[id]` (both exist;
  A-11-clean internal affordance, keyboard-focusable).
- `src/components/app/showcase/showcase-empty.tsx` (Server): the honest empty state (no fabricated rows/
  counts) — orients toward capturing proof / making clips (links to `/app/proof`). Reached for zero eligible
  **or** all-withheld.
- `src/components/app/showcase/showcase-skeleton.tsx` (Server): on-token loading skeleton mirroring the wall.

> **ProofCard reuse note**: ProofCard carries inbox/Library chrome (consent dot, "Unreviewed", the "Make"
> link) inappropriate for a public-style wall, so the wall uses its **own** item presentation (`showcase-item`)
> rather than ProofCard — "the wall needs its own presentation, added without touching the shared contracts."
> ProofCard stays byte-unchanged. (Small display idioms — the verified mark, initials — may be re-expressed
> locally, as the dashboard hero already does, without importing/altering ProofCard.)

### A-11 — what is deliberately NOT rendered (hidden, not dead)

Screen 10's **LIVE / "public set"** badges; the **"Add from library"** curation control + the proof picker
(screen 18); the **Single highlight / Carousel / Wall of Love** layout/embed preset switchers; the embed
**`<script>` snippet + "Copy embed"**; any **publish / "go live" / public-URL / share** control; any
**view/reach/likes/social-proof/published-since** metric. The curation + publish/embed **cluster defers to T9
as one coupled feature**.

### Byte-stability (asserted)

ProofCard, `src/lib/proof.ts` (`ProofView`/`ProofCardProps`/`ProofDetailView`), `src/lib/clip.ts` (`ClipView`/
`LibraryClipView`/`ClipDetailView`), and **every existing read** (`getProofs`/`getProof`/`getProofClips`/
`getLibraryClips`/`getClip`/the `getDashboardSummary` clip reads/`effectiveConsentState`/
`effectiveConsentGranted`/`getGrantedConsentId`/`insertDerivedAsset` + `proofColumns`/`toView` reused as-is)
are **unchanged** — the slice only **adds** `getShowcase` + `ShowcaseItem` + the route/components. **No schema
change.** Chrome untouched.

## Project Structure

### Documentation (this feature)

```text
specs/T-showcase/
├── plan.md              # This file
├── research.md          # Phase 0 — D1 port-owned-half, D2 getShowcase (combined withdrawal-filtered read),
│                        #            D3 ShowcaseItem reuse, D4 own wall presentation (not ProofCard), D5 A-11 cluster defer
├── data-model.md        # Phase 1 — ShowcaseItem shape + getShowcase projection & withdrawal derivation
├── contracts/
│   ├── showcase-read.md         # getShowcase signature, the two consented queries, merge/order, byte-stability
│   └── showcase-surface.md      # the route + wall/item/empty/skeleton, item→detail links, A-11 omissions
├── quickstart.md        # Phase 1 — open the wall; withdrawal parity; empty/loading/error; no distribution controls; DoD
└── checklists/requirements.md   # (from /speckit.specify; Q1–Q3 resolved)
```

### Source Code — files this slice adds / changes

```text
src/
├── db/queries.ts                 # CHANGE (ADD only): getShowcase(workspaceId) — consented proof (reuse
│                                 #   proofColumns/toView) + consented clips (getLibraryClips shape), shared
│                                 #   gate, merged newest-first. EXISTING reads byte-unchanged.
├── lib/showcase.ts               # ADD: ShowcaseItem (discriminated union reusing ProofView + LibraryClipView)
├── app/app/showcase/
│   ├── page.tsx                  # REPLACE placeholder: Server — workspace + Suspense → ShowcaseData; metadata
│   ├── loading.tsx               # ADD: Server → <ShowcaseSkeleton/>
│   └── error.tsx                 # ADD: "use client" → <ErrorState onRetry={reset}/>
└── components/app/showcase/
    ├── showcase-data.tsx         # ADD: async Server — getShowcase; empty → <ShowcaseEmpty/> else <ShowcaseWall/>
    ├── showcase-wall.tsx         # ADD: Server — header + honest count + the public-style wall (newest-first)
    ├── showcase-item.tsx         # ADD: Server — proof testimonial OR clip card; owned data; links to detail
    ├── showcase-empty.tsx        # ADD: Server — honest empty state (links to /app/proof)
    └── showcase-skeleton.tsx     # ADD: Server — on-token loading skeleton

# UNCHANGED (asserted in quickstart DoD checks):
#   src/components/proof-card.tsx                                  (byte-identical — wall uses its own item)
#   src/lib/proof.ts → ProofView/ProofCardProps/ProofDetailView   (unchanged)
#   src/lib/clip.ts → ClipView/LibraryClipView/ClipDetailView     (unchanged)
#   src/db/queries.ts → getProofs/getProof/getProofClips/getLibraryClips/getClip/getDashboardSummary clip reads/
#                       effectiveConsentState/effectiveConsentGranted/getGrantedConsentId/insertDerivedAsset/
#                       proofColumns/toView  (all unchanged; proofColumns/toView reused as-is)
#   src/db/schema.ts                                              (NO schema change)
#   AppChrome / rail / top-bar / switcher / palette, the proof/Library/clip surfaces  (untouched)
```

**Structure Decision**: Single Next.js App Router project. The read lives in the existing `src/db/` layer
(reusing `proofColumns`/`toView` + the shared gate); the item type in a new `src/lib/showcase.ts` (reusing
`ProofView`/`LibraryClipView`); the surface in a new `src/components/app/showcase/` folder. The route replaces
the placeholder and gains the `loading`/`error` segment files.

## Phase 0 — Outline & Research

All Technical Context items are known; research records the design choices (full write-up in `research.md`):

- **D1 — Port screen 10's owned half**: a screen exists (10 "Showcase manager"); port the curate/preview wall;
  the T9 distribution machinery (LIVE/"Add from library"/presets/embed) is not rendered (A-11). The Public-site
  export is the T9 public wall, separate.
- **D2 — `getShowcase` = a combined withdrawal-filtered read**: consented proof (reuse `proofColumns`/`toView`
  + the shared gate — distinct from the unfiltered `getProofs`) + consented clips (the `getLibraryClips`
  shape), merged newest-first. Reuses the shared gate so withdrawal matches the rest of the app; no existing
  read changes.
- **D3 — `ShowcaseItem` reuses the existing view shapes**: a `{kind:'proof'|'clip'}` union over `ProofView` /
  `LibraryClipView` — additive, keeps those byte-stable. Chosen over a new flattened shape (would duplicate
  fields + risk drift).
- **D4 — The wall has its own item presentation, not ProofCard**: ProofCard's internal chrome (consent dot,
  "Unreviewed", "Make") is wrong for a public wall; a new `showcase-item` is added without touching ProofCard.
- **D5 — The curation + publish/embed cluster defers to T9 as one feature**: curation is coupled to publishing
  (you curate what goes live), so it makes no sense to build curation before distribution; the honest slice is
  a read-only preview (Q2→A). No schema change.

**Output**: `research.md` (no NEEDS CLARIFICATION remain — Q1–Q3 resolved in the spec; D1–D5 recorded).

## Phase 1 — Design & Contracts

- **`data-model.md`**: the `ShowcaseItem` union, the `getShowcase` two-query projection + merge/order, and the
  read-time withdrawal derivation — no entity/schema change.
- **`contracts/showcase-read.md`**: `getShowcase` signature, the consented-proof + consented-clip queries, the
  shared withdrawal gate, the merge/newest-first order, the owned-only projection, and the byte-stability
  assertions (incl. that it is **distinct from** the unfiltered `getProofs`).
- **`contracts/showcase-surface.md`**: the route (page/loading/error) + the wall/item/empty/skeleton
  components, the public-style layout (distinct from inbox/Library), the per-item detail links, and the A-11
  omissions (LIVE/curation/presets/embed/publish/share) with the FR-019 + P-VII assertions.
- **`quickstart.md`**: open `/app/showcase`; confirm the public-style wall of consented proof+clips (owned
  data + verified mark, newest-first) + honest count; confirm withdrawal parity (Leo M.'s proof + clip absent,
  matching the dashboard/Library); the empty state (reseed to zero / all-withheld); loading + error; **no**
  LIVE/"Add from library"/presets/embed/publish/share controls; item links open the proof/clip detail; the DoD
  gates (byte-stability; no schema change; no new dep; build green without `DATABASE_URL`; responsive +
  keyboard).
- **Agent context**: update the `<!-- SPECKIT START/END -->` pointer in `CLAUDE.md` to this plan and mark
  T-Showcase the active slice (the only edit outside `specs/` during planning; left **uncommitted**).

**Re-check Constitution after Phase 1**: still all PASS — one additive combined read + an additive item type +
new wall components, no schema change, no new dependency, P-VII via the shared gate (audit-preserving), A-11
deferral of the curate/publish/embed cluster, owned-only values (FR-019), ProofCard/shared shapes/existing
reads byte-stable, chrome untouched.

## Complexity Tracking

No constitution violations to justify — the table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
