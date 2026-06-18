# Contract — `getClip` (the clip-detail read)

The one new read this slice adds to `src/db/queries.ts` (ADD only). Existing reads are byte-unchanged.

## Signature

```text
getClip(workspaceId: string, clipId: string): Promise<ClipDetailView | null>
```

`ClipDetailView` (added to `src/lib/clip.ts`, alongside the byte-unchanged `ClipView`/`LibraryClipView`) —
see `data-model.md` §1.

## Behaviour

- `withDbRetry`-wrapped (a read).
- `select` from `derived_asset`:
  - **innerJoin** `proof` on `derived_asset.proofId = proof.id` (customer, proof type, verified, link target).
  - **innerJoin** `source` on `proof.sourceId = source.id` (capture source label).
  - **innerJoin** `consent` (the **made-under** row) on `consent.id = derived_asset.consentId` (its `version`
    + `grantedAt` → the provenance line).
  - the proof's **current effective** consent via the **existing** `effectiveConsentState` /
    `latestConsentVersion` / `latestConsentEffectiveAt` subqueries (reused, **unchanged**).
- `where`:
  - `eq(derived_asset.id, clipId)`,
  - `eq(proof.workspaceId, workspaceId)` — tenant scope,
  - `effectiveConsentGranted(derived_asset.proofId)` — the **shared** withdrawal gate.
- `limit 1`; return the mapped `ClipDetailView`, or **`null`** when no row.

## The three-into-one null (no oracle)

A **missing** clip id, a clip id in **another workspace** (fails the workspace predicate), and a **withdrawn**
clip (fails `effectiveConsentGranted`) **all** produce no row → `null`. The caller (`clip-detail-data.tsx`)
calls `notFound()` on null → **one** content-free not-found. The viewer cannot distinguish the cases (no
existence oracle, no cross-tenant leak, no confirmation a withheld clip exists) — the exact T2.3 pattern,
extended to withdrawal (P-VII).

## Assertions

- **P-VII**: a withdrawn clip is **unreachable** (not-found), its `derived_asset` row **retained** (audit).
  Visibility is identical to the Library/dashboard/detail (same shared `effectiveConsentGranted`).
- **Two consent roles, both owned**: made-under (provenance, shown) vs current effective (the gate). Shown
  distinctly; never conflated.
- **No schema change**: reads the existing `derived_asset` (+ `proof`/`source`/`consent`); no migration.
- **Byte-stability**: `getProofs`/`getProof`/`getProofClips`/`getLibraryClips`/the `getDashboardSummary` clip
  reads/`effectiveConsentState`/`effectiveConsentGranted`/`getGrantedConsentId`/`insertDerivedAsset` and the
  reused `latestConsentVersion`/`latestConsentEffectiveAt` subqueries are **unchanged**; only `getClip` +
  `ClipDetailView` are added. `ClipView`/`LibraryClipView` byte-unchanged.
- **Owned only** (FR-019): no view/reach/engagement/performance, no render status. **Drizzle only**; no new
  dependency.
