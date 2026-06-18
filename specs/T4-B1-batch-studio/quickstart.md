# Quickstart — T4-B1 Batch studio (validation guide)

How to validate the slice end-to-end and check the Definition of Done. No implementation code here — see
`plan.md`, `data-model.md`, `contracts/`. Prerequisite: the spine + T3 + Showcase shipped (proof inbox,
`derived_asset`, the T2.4b studio building blocks, the Library/dashboard/showcase reads); the seed carries
granted proofs + a withdrawn one (Leo M.).

## Setup

```bash
npm install                 # no new dependency expected vs the lockfile
npm run db:seed             # granted proofs + Leo M. (revoked)
npm run dev                 # http://localhost:3000
```

## Walkthrough

1. **Enter selection** — open `/app/proof` (inbox) → activate **"Make clips"** (the deferred cluster, now
   wired). Confirm per-card selection appears; granted proofs are selectable; **Leo M. shows "needs consent"**
   and is **not** selectable. (US1, US2)
2. **Select** — toggle a few granted proofs, or **"Select all ready"** (selects only granted). Confirm the
   selected count; confirm clicking a card **toggles selection** (does not navigate to the detail) while
   selecting. (US1)
3. **Configure + generate** — in the **selection-action bar**, pick a **format** (one for the batch) →
   **"Make clips"**. Confirm the button **disables while pending** (no double-submit); an in-progress state
   covers the wait. (US1, SC-006)
4. **Honest result** — confirm the per-proof summary: **N clips made**; if a non-granted proof was somehow in
   the set (e.g. revoked after selecting), **skipped · needs consent**; any **failed · try again**. No
   all-or-nothing, no fabricated success. (US2, US3, SC-002/003)
5. **Surfaces light up** — confirm the made clips appear on the **Library**, **dashboard** ("clips this
   month" / latest), and **showcase** via the **existing reads** (no read change). (SC-004)
6. **P-VII race** — revoke a proof's consent in the seed after selecting it (reseed variant) and run the
   batch → it is **skipped** (re-checked at generate), no clip written. (US2, SC-002)

## Definition of Done — gates

- [ ] **Selection wired (FR-001/002/003)**: per-proof selection + "Select all ready" (granted only) + "Make
      clips" in the inbox; selection is a **sibling overlay** (ProofCard byte-unchanged); nav suppressed while
      selecting; non-granted shown "needs consent", not selectable.
- [ ] **Batch generate reuses T2.4b (FR-005)**: one clip per granted proof via the existing
      `validateGenerateInput` / `getGrantedConsentId` / `insertDerivedAsset` / `SAMPLE_CLIP_URL`; single-attempt
      inserts (D4); `generateClip` unchanged.
- [ ] **P-VII per proof (FR-006 / SC-002)**: consent re-checked at generate; non-granted skipped, no row;
      covers revoked-after-select.
- [ ] **Honest partial result (FR-007 / SC-003)**: made/skipped/failed match reality; no all-or-nothing; made
      clips persist; skipped/failed not faked.
- [ ] **Surfaces via existing reads (FR-008 / SC-004)**: Library/dashboard/showcase reflect the new clips
      after one revalidate; **no read change, no `queries.ts` change**.
- [ ] **Byte-stable (FR-015 / SC-005)**: ProofCard byte-unchanged; `ProofView`/`getProofs`/`getProof`/
      `ProofDetailView`, `ClipView`/`LibraryClipView`/`ClipDetailView`, `ShowcaseItem`, every existing read,
      and `generateClip` unchanged; `studio.ts` only **adds** batch types. **No schema change.**
- [ ] **A-11 (SC-007)**: no warmth sort, no upload, no export, no List view rendered.
- [ ] **No new dependency**: `package.json` unchanged.
- [ ] **Build green without `DATABASE_URL`**: `npm run typecheck` + `lint` + `build` pass with `.env.local`
      moved aside (CI parity; lazy db client).

## Hand-off

Implementation will **leave every change uncommitted** — Cornel reviews and commits manually on the
`T4-B1-batch-studio` branch (no auto-commit/push/merge), mirroring the prior slices.
