# Quickstart — Validating T5-Consent (manual, on fixtures)

Prerequisites: `npm run dev` (localhost:3000), the stub session / fixtures (includes the seeded Leo M.
*granted v1 → withdrawn v2* retained timeline + made-under clip versions). No migration, no env changes.

## 1. The ledger + retained history (US1, FR-001/002, P-V port)

1. Open `/app/consent` — the ported screen-13 **ledger** lists every proof: customer, consent purpose +
   current version (e.g. "Marketing use · v2"), captured date, and **current effective state**.
2. Use the status chips (All / Granted / Awaiting / Withdrawn) — confirm they filter the list.
3. Open **Leo M.** — confirm the **full retained timeline** shows *v1 granted → v2 withdrawn* (the
   superseded granted version is **shown, never erased**).
4. Confirm every value is real owned consent data (state, version, dates) — no fabricated field.

## 2. Made-under provenance (US3, Q2/FR-011)

1. Open a granted proof that has clips — confirm each clip shows the **consent version it was made
   under** (e.g. "made under v1"), distinct from the proof's current effective version.

## 3. Record a withdrawal with the cascade preview (US2, Q1/FR-003/004/005)

1. Open a **granted** proof with clips; activate **"Record withdrawal"**.
2. Expect the **cascade-preview confirm**: "Recording {customer}'s withdrawal will withhold their proof
   and **N** clip(s) from Library, showcase, and export — retained, not deleted" — where **N matches the
   proof's clip count** (the shared provenance read).
3. Confirm — expect the ledger to now show the proof **withdrawn**, with the new version appended to its
   timeline (prior versions retained).
4. Confirm the copy throughout reads as **recording the customer's withdrawal**, never a brand "revoke";
   confirm there is **no re-grant / un-withdraw** control anywhere.

## 4. The free cascade (US2 scenario 3, FR-008 — byte-stable)

After the withdrawal in step 3, with **no other action**:
- `/app/library` — the proof's clip(s) are **gone** (withheld).
- `/app/showcase` — withheld; `/app/clip/[id]` of one of them → `notFound`.
- `/app` (dashboard) — the clip count adjusts down.
- `/app/proof` — the proof shows **withdrawn**; sort **Warmest** → it ranks **cold**.
- Export (Library bulk / single) — the withdrawn proof's clip is **skipped**.
All of this with **zero changes** to those surfaces — the existing read-time consent gate.

## 5. Honest edge cases (FR-003/007, edge cases)

- An **already-withdrawn** proof: no "Record withdrawal" offered; timeline shown; no re-grant.
- An **awaiting** proof: no withdrawal offered (nothing granted to withdraw).
- A granted proof with **zero clips**: the preview honestly says "0 clips"; the action still works.
- Withdraw the same proof twice (stale): the second is an **honest no-op** (already withdrawn) — no
  duplicate/fabricated version.
- **Empty workspace**: honest empty ledger; no error.

## 6. Byte-stability & build (FR-010)

- Diff confirms **no** change to `effectiveConsentState` / `latestConsentState` / `getGrantedConsentId`,
  `getProofs` / `ProofView` / `getProof` / `getLibraryClips` / `getProofClips` / `getShowcase` /
  `getClip*`, `ProofCard`, the inbox/Library/dashboard/export/warmth/showcase/clip-detail/proof-detail
  surfaces, `generateClip` / `generateBatch`, and the **nav rail** (`src/lib/nav.ts`); **no migration**,
  no `src/db/schema.ts` change.
- `npm run build` + `npm run lint` green (without `DATABASE_URL`); `git diff package.json
  package-lock.json` shows **no new dependency**.
