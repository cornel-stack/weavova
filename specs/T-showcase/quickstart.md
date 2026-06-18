# Quickstart — T-Showcase (validation guide)

How to validate the slice end-to-end and check the Definition of Done. No implementation code here — see
`plan.md`, `data-model.md`, `contracts/`. Prerequisite: the spine + T3 shipped (proof, `derived_asset`, the
shared consent gate; the seed carries consented proof+clips + a born-then-withdrawn item).

## Setup

```bash
npm install                 # no new dependency expected vs the lockfile
npm run db:seed             # re-runnable; consented proof+clips + Leo M.'s withdrawn proof/clip
npm run dev                 # http://localhost:3000
```

## Walkthrough

1. **Preview the wall** — open `/app/showcase` (or the rail's "Showcase"). Confirm the placeholder is gone
   and a **public-style wall** (distinct from the inbox masonry / Library grid) shows the workspace's
   **consented proof + clips**, newest-first, each with owned data (customer + words, or clip sample-preview
   + format/hook) and the **verified mark** where verified; an **honest count**. (US1, SC-001)
2. **Owned-only** — confirm **no** views/reach/likes/social-proof/"published-since", no LIVE/published badge,
   no fabricated value; clips read as honest **sample/preview** stills (FR-019). (SC-003)
3. **Withdrawal parity (P-VII)** — confirm the wall shows the **same** consent set as the dashboard/Library:
   **Leo M.'s** withdrawn proof **and** its clip are **absent** (his consent is revoked), consented items
   present; the count excludes the withheld. (US2, SC-002, SC-008)
4. **No distribution/curation controls (A-11)** — confirm **none** of: LIVE/"public set" badges, "Add from
   library", the Single highlight / Carousel / Wall of Love preset switchers, the embed `<script>` / "Copy
   embed", publish / "go live" / public URL / share. (US4, SC-004)
5. **Item links** — click/keyboard-activate a wall item → it opens its detail: a proof → `/app/proof/[id]`, a
   clip → `/app/clip/[id]` (both exist). (US1)
6. **Empty (honest)** — reseed a variant with no eligible items (none consented, or all withheld) → an
   **honest empty state** (no fabricated rows/counts) orienting toward capturing proof (links to `/app/proof`).
   (US3, SC-005)
7. **Loading / error** — throttle/offline to force a cold start → transparent `withDbRetry` recovery behind
   the skeleton; force a persistent failure → the shared `<ErrorState>` with retry (no raw text). (US3, SC-006)
8. **Responsive + keyboard** — at ≤480 / 1024 / 1280 (+1240 max) the wall reflows with no horizontal
   scroll/overlap; items are reachable/operable with visible focus. (SC-007)

## Definition of Done — gates

- [ ] **Populated wall (FR-001/003/004/005)**: `/app/showcase` replaces the placeholder; a public-style wall
      of consented proof+clips with owned data + verified mark + honest count, inside AppChrome.
- [ ] **Withdrawal parity (P-VII / FR-006 / SC-002)**: the wall withholds exactly what the dashboard/Library
      withhold (shared `effectiveConsentGranted`); Leo M.'s proof + clip absent; rows retained.
- [ ] **Owned-only + honest empty (FR-005/008 / SC-003/005)**: no metrics/LIVE/published; honest empty on
      zero-eligible or all-withheld with no fabricated rows/counts.
- [ ] **A-11 deferral (FR-007/009/010 / SC-004)**: no LIVE/"Add from library"/presets/embed/publish/share —
      the curate+publish/embed cluster deferred to T9 (hidden, not dead).
- [ ] **States (FR-011/012 / SC-006)**: loading skeleton; transparent cold-start recovery; shared
      `<ErrorState>` on persistent failure.
- [ ] **Byte-stable (FR-016)**: ProofCard (wall uses its own item), `ProofView`/`getProofs`/`getProof`/
      `ProofDetailView`, `ClipView`/`LibraryClipView`/`ClipDetailView`, and all existing reads unchanged
      (`git diff` shows only additions — `getShowcase`, `ShowcaseItem`, the showcase route/components).
      **No schema change.**
- [ ] **No new dependency**: `package.json` unchanged.
- [ ] **Build green without `DATABASE_URL`**: `npm run typecheck` + `lint` + `build` pass with `.env.local`
      moved aside (CI parity; lazy db client).

## Hand-off

Implementation will **leave every change uncommitted** — Cornel reviews and commits manually on the
`T-showcase` branch (no auto-commit/push/merge), mirroring the prior slices.
