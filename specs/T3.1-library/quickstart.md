# Quickstart — T3.1 Library (validation guide)

How to validate the slice end-to-end and check the Definition of Done. No implementation code here — see
`plan.md`, `data-model.md`, `contracts/`. Prerequisite: T2.4a/T2.4b shipped (the `derived_asset` table
exists and the seed carries active + born-then-withdrawn clips).

## Setup

```bash
npm install                 # no new dependency expected vs the lockfile
npm run db:seed             # re-runnable; relative dates; active clips + Leo M.'s withdrawn clip
npm run dev                 # http://localhost:3000
```

## Walkthrough

1. **Populated** — open `/app/library` (or the rail's "Library"). Confirm the placeholder is gone and a
   **grid of clip cards** shows every consent-visible clip, **newest first**, each with: the **source
   customer**, the **brand hook** (when set), the **format**, the **created date**, and a **"Sample
   preview"** label. Confirm an **honest count** ("{n} clips") that matches the cards shown. (US1, SC-001)
2. **Owned-only** — confirm **no** views/reach/engagement/performance, **no** Ready/Queued status, **no**
   fabricated values anywhere on the cards (FR-019). (SC-003)
3. **Withdrawal parity (P-VII)** — confirm the Library shows the **same** clip set as the dashboard "clips
   this month"/latest and the proof detail's "Generated assets": **Leo M.'s** born-then-withdrawn clip is
   **absent** from the Library and its count, the active clips are **present**. (US2, SC-002, SC-008)
4. **Source-proof link (A-11 / Q2→C)** — click/keyboard-activate a card → it navigates to that clip's
   **source proof** (`/app/proof/[id]`). Confirm there is **no** clip-detail link, **no** inline play, and
   **no** filters / List-Grid toggle / "Download clips" / Ready-Queued status anywhere. (SC-004)
5. **Empty (honest)** — to see the empty state, reseed a variant where the workspace has no visible clips
   (no clips, or all source proofs revoked) → confirm an **honest empty state** (no fabricated rows/counts)
   that orients toward making one (links to `/app/proof`). (US3, SC-005)
6. **Loading / error** — throttle/offline to force a cold start on open → transparent `withDbRetry`
   recovery behind the skeleton; force a persistent failure → the shared `<ErrorState>` with retry (no raw
   text). (US3, SC-006)
7. **Responsive + keyboard** — at ≤480 / 1024 / 1280 (+1240 max) the grid reflows with no horizontal
   scroll/overlap; every card link is reachable/operable with visible focus. (SC-007)

## Definition of Done — gates

- [ ] **Populated grid (FR-001/002/005/006)**: `/app/library` replaces the placeholder and lists the
      workspace's clips (newest first) with owned fields + the sample/preview label, inside AppChrome.
- [ ] **Withdrawal parity (P-VII / FR-003 / SC-002)**: the Library withholds exactly the clips the
      dashboard/detail withhold (shared `effectiveConsentGranted`); Leo M.'s clip absent; rows retained.
- [ ] **Honest count + empty (FR-007/008 / SC-005/008)**: count = visible clips; empty state on
      zero-or-all-withheld with no fabricated rows/counts.
- [ ] **A-11 (FR-004/011/012 / SC-004)**: card links to the **source proof** only; no clip-detail link, no
      inline play, no filters / List-Grid toggle / bulk-download / Ready-Queued status.
- [ ] **States (FR-009/010 / SC-006)**: loading skeleton; transparent cold-start recovery; shared
      `<ErrorState>` on persistent failure (no raw text).
- [ ] **Byte-stable (FR-016)**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`, `ClipView`,
      and all existing clip reads unchanged (`git diff` shows only additions: `getLibraryClips`,
      `LibraryClipView`, the library route/components, the placeholder replacement). **No schema change.**
- [ ] **No new dependency**: `package.json` unchanged.
- [ ] **Build green without `DATABASE_URL`**: `npm run typecheck` + `lint` + `build` pass with `.env.local`
      moved aside (CI parity; lazy db client).

## Hand-off

Implementation will **leave every change uncommitted** — Cornel reviews and commits manually on the
`T3.1-library` branch (no auto-commit/push/merge), mirroring the T2.4a/T2.4b hand-off.
