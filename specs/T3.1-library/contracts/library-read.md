# Contract — `getLibraryClips` (the Library read)

The one new read this slice adds to `src/db/queries.ts` (ADD only). The existing reads are byte-unchanged.

## Signature

```text
getLibraryClips(workspaceId: string): Promise<LibraryClipView[]>
```

`LibraryClipView` = `{ id, proofId, customerName, verified, kind, format, hook: string|null, assetUrl,
createdAt: string }` (see `data-model.md` §1). Added to `src/lib/clip.ts` alongside the byte-unchanged
`ClipView`.

## Behaviour

- `withDbRetry`-wrapped (a read — safe to retry a transient cold start).
- `select` from `derived_asset` **innerJoin** `proof` on `derived_asset.proofId = proof.id`.
- `where`:
  - `eq(derived_asset.workspaceId, workspaceId)` — workspace-scoped (tenant-isolated; no other workspace's
    clip is read).
  - `effectiveConsentGranted(derived_asset.proofId)` — the **shared** read-time withdrawal gate (→
    `effectiveConsentState`), **identical** to `getProofClips` and the `getDashboardSummary` clip reads. A
    clip whose source proof's effective consent is not `granted` is **withheld** (excluded from the rows).
- `orderBy(desc(derived_asset.createdAt))` — newest first.
- Projection (owned only — FR-019): `id`, `proofId`, `customerName` (from `proof`), `verified` (from
  `proof`), `kind`, `format`, `hook`, `assetUrl`, `createdAt` (→ ISO string). **No** view/reach/engagement/
  performance metric; **no** render status.

## Assertions

- **P-VII**: a withheld clip is absent from the result (and therefore the count); its `derived_asset` row is
  **retained** (the read is a filter, not a delete). The Library shows a clip **iff** the dashboard/detail
  do — same shared gate.
- **No schema change**: reads the existing `derived_asset`; no migration, no write.
- **Byte-stability**: `getProofs`, `getProof`, `getProofClips`, the `getDashboardSummary` clip reads,
  `effectiveConsentState`, `effectiveConsentGranted`, `getGrantedConsentId`, `insertDerivedAsset`, and
  `ClipView` are **unchanged** — only `getLibraryClips` + `LibraryClipView` are added.
- **Drizzle only** (no raw SQL outside the existing correlated-subquery helper); no new dependency.
