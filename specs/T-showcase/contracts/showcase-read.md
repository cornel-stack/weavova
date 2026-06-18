# Contract — `getShowcase` (the wall read)

The one new read this slice adds to `src/db/queries.ts` (ADD only). Existing reads are byte-unchanged.

## Signature

```text
getShowcase(workspaceId: string): Promise<ShowcaseItem[]>
```

`ShowcaseItem = { kind:'proof'; proof: ProofView } | { kind:'clip'; clip: LibraryClipView }` (added to
`src/lib/showcase.ts`, reusing the byte-unchanged `ProofView`/`LibraryClipView`). See `data-model.md`.

## Behaviour

- `withDbRetry`-wrapped — one block, two queries:
  1. **Consented proof**: `select proofColumns from proof innerJoin source where
     eq(proof.workspaceId, workspaceId) AND effectiveConsentGranted(proof.id)` → `toView` → `ProofView[]`.
     Reuses the existing `proofColumns`/`toView` (read-only, unchanged).
  2. **Consented clips**: the `getLibraryClips` shape — `select … from derived_asset innerJoin proof where
     eq(derived_asset.workspaceId, workspaceId) AND effectiveConsentGranted(derived_asset.proofId)` →
     `LibraryClipView[]`.
- **Merge + order**: wrap each row into its `ShowcaseItem` discriminant; **sort newest-first** by item date
  (`capturedAt` / `createdAt`). Return the one mixed list.
- Owned only (FR-019): no view/reach/likes/social/published metric; verified carried as a **mark**, not a
  filter (Q3 — all-consented, not verified-only).

## Assertions

- **P-VII**: both halves gated by the **shared** `effectiveConsentGranted` (→ `effectiveConsentState`) — a
  withdrawn proof (and its clips) is **absent**; visibility identical to the dashboard/Library; rows retained.
- **Distinct from `getProofs`**: `getProofs` is intentionally **unfiltered** (the inbox shows all consent
  states); the Showcase shows **only granted** — so `getShowcase` is its own query, **not** a change to
  `getProofs`.
- **No schema change**: reads existing `proof`/`derived_asset` (+ `consent` via the gate); no migration.
- **Byte-stability**: `getProofs`/`getProof`/`getProofClips`/`getLibraryClips`/`getClip`/the
  `getDashboardSummary` clip reads/`effectiveConsentState`/`effectiveConsentGranted`/`getGrantedConsentId`/
  `insertDerivedAsset` **and** `proofColumns`/`toView` (reused as-is) are **unchanged**; only `getShowcase` +
  `ShowcaseItem` are added. `ProofView`/`LibraryClipView`/`ClipView`/`ClipDetailView` byte-unchanged.
- **Drizzle only**; no new dependency.
