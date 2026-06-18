# Quickstart — T3.2 Clip detail (validation guide)

How to validate the slice end-to-end and check the Definition of Done. No implementation code here — see
`plan.md`, `data-model.md`, `contracts/`. Prerequisite: T2.4a/T2.4b + T3.1 shipped (the `derived_asset`
table + the Library exist; the seed carries active + a born-then-withdrawn clip).

## Setup

```bash
npm install                 # no new dependency expected vs the lockfile
npm run db:seed             # re-runnable; active clips + Leo M.'s withdrawn clip
npm run dev                 # http://localhost:3000
```

## Walkthrough

1. **Open from the Library** — `/app/library` → click a clip card. It now opens the **clip detail** at
   `/app/clip/[id]` (not the source proof), inside the AppChrome, with a back affordance to the Library.
   Confirm the card looked **identical** to T3.1 (only where it leads changed). (US1, US4, SC-008)
2. **The clip + owned metadata** — confirm a **non-playing "Sample preview" still** in the chosen format
   (no play control, no `<video>`), the brand **hook** (when set), the **format**, and the **created date** —
   and **no** views/reach/engagement/performance/status. (US1, SC-002, SC-004)
3. **Provenance** — confirm the **source customer**, a **source-proof link** (opens `/app/proof/[id]`), the
   **made-under** consent ("made under consent v{n} · {date}"), and the proof's **current** consent
   ("granted · {date} · v{m}") shown distinctly. (US1, US3)
4. **Re-make** — activate **re-make** → it opens the **consent-gated studio** for the source proof
   (`/app/proof/[id]/studio`); consent is re-checked there (P-VII). The clip detail itself never generates.
   Confirm **no** download/export/publish/share control anywhere. (US3, SC-004, SC-005)
5. **No-oracle not-found (the core gate)** — deep-link three ids and confirm the **identical** content-free
   not-found (no clip data, no case hint): (a) **Leo M.'s withdrawn** clip id (source proof revoked); (b) a
   **non-existent** clip id; (c) a clip id from **another workspace**. (US2, SC-003)
6. **States** — throttle/offline to force a cold start on open → transparent `withDbRetry` recovery behind
   the skeleton; force a persistent failure → the shared `<ErrorState>` with retry (no raw text), structurally
   distinct from the not-found. (US4, SC-006)
7. **Responsive + keyboard** — at ≤480 / 1024 / 1280 (+1240 max) the two columns reflow with no horizontal
   scroll/overlap; the clip frame, provenance links, and re-make are reachable/operable with visible focus.
   (SC-007)

## Definition of Done — gates

- [ ] **Populated detail (FR-001/004/005/006)**: `/app/clip/[id]` renders the sample-still + owned metadata
      + provenance (made-under vs current consent), inside AppChrome, reached from the Library card.
- [ ] **No-oracle not-found (FR-002/012 / P-VII / SC-003)**: withdrawn / missing / cross-workspace all →
      one content-free not-found; Leo M.'s clip unreachable; row retained.
- [ ] **Honest representation (Q1 / FR-019 / SC-002)**: a non-playing "Sample preview" still; no inline
      play, no finished-render claim, no fabricated customer media/captions.
- [ ] **A-11 actions (FR-007 / SC-004/005)**: source-proof link + re-make → consent-gated studio only; no
      download/export/publish/share; no metric/status.
- [ ] **Card re-wire (FR-009 / Q3 / SC-008)**: the Library card leads to the clip detail; appearance
      identical to T3.1; the source-proof link now lives in the detail.
- [ ] **States (FR-010/011 / SC-006)**: loading skeleton; transparent cold-start recovery; shared
      `<ErrorState>` on persistent failure; not-found distinct from error.
- [ ] **Byte-stable (FR-015)**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`,
      `ClipView`/`LibraryClipView`, and all existing reads unchanged (`git diff` shows only additions —
      `getClip`, `ClipDetailView`, the clip route/components — plus the one Library-card `href` edit). **No
      schema change.**
- [ ] **No new dependency**: `package.json` unchanged.
- [ ] **Build green without `DATABASE_URL`**: `npm run typecheck` + `lint` + `build` pass with `.env.local`
      moved aside (CI parity; lazy db client).

## Hand-off

Implementation will **leave every change uncommitted** — Cornel reviews and commits manually on the
`T3.2-clip-detail` branch (no auto-commit/push/merge), mirroring the prior slices.
