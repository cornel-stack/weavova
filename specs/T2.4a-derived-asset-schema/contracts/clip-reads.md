# Contract — clip reads (effective-consent withdrawal) + marker swap

**Location**: `src/db/queries.ts` (reads + the shared effective-consent helper), `src/lib/clip.ts` (the
`ClipView` type). All reads are **workspace-scoped** and wrapped in `withDbRetry`, and **withdraw**
assets whose proof's effective consent is not `granted`.

## Shared effective-consent helper (mirror the proof logic)

```ts
// One source of truth for "the proof's effective (latest-version) consent state".
function effectiveConsentState(proofIdColumn): SQL<ConsentState | null>
  // (select c.state from consent c where c.proof_id = <proofIdColumn> order by c.version desc limit 1)

const latestConsentState = effectiveConsentState(proof.id);   // refactor — IDENTICAL generated SQL
// withdrawal filter for clips:
//   effectiveConsentState(derivedAsset.proofId) = 'granted'
```

- Refactoring `latestConsentState` to the helper is **behaviour-preserving**: `proofColumns`/`toView`/
  `getProofs`/`getProof` output and `ProofView`/`ProofDetailView` are **unchanged**.

## Dashboard swap — `getDashboardSummary` (queries-only)

Inside the existing `withDbRetry` block, replace the `// T2.4` markers:

- **`clipsThisMonth`** (was `0`): `count(*)::int` of `derived_asset` where `workspaceId = $ws` AND
  `createdAt >= date_trunc('month', now())` AND `effectiveConsentState(proofId) = 'granted'`.
- **`latestClip`** (was `null`): the most recent **non-withdrawn** `derived_asset` joined to `proof`,
  `order by createdAt desc limit 1`, projected to **`LatestClipDescriptor`** (`customerName`, `verified`,
  `createdAt`) — **owned fields only, no view/engagement metric** (FR-010/019). `null` when none.
- `dashboard-kpis.tsx` is **unchanged** — it already renders these fields and the honest-empty path
  (`0`/`null`).

## Detail read — `getProofClips`

```ts
export async function getProofClips(
  workspaceId: string,
  proofId: string,
): Promise<ClipView[]>;
// select derived_asset where workspaceId = $ws AND proofId = $proofId
//   AND effectiveConsentState(proofId) = 'granted'
// order by createdAt desc
```

- Returns the proof's **non-withdrawn** clips as `ClipView[]` (`id`, `kind`, `format`, `assetUrl`, `hook`,
  `createdAt` — owned). Withdrawn (Leo M.) → **empty** list.
- `ClipView` lives in `src/lib/clip.ts` (mirrors `src/lib/proof.ts`).

## Caller impact

- `getDashboardSummary` callers unchanged (same `DashboardSummary` shape; the values are now real).
- `proof-detail-data.tsx` additionally calls `getProofClips(ws.id, id)` (after the proof resolves) and
  passes the list into `<ProofDetail>`, which renders the **"Generated assets"** section only when
  non-empty (honest-empty/absent otherwise — no fabricated "· N").

## Honesty + isolation (carry-over)

- Every value is computed from **owned** `derived_asset` data (+ owned joins) — **0** fabricated or
  social/platform metrics (FR-019). Reads are **workspace-scoped** (no cross-workspace clip ever counted
  or shown). Withdrawn assets are excluded everywhere (P-VII) while their rows persist (audit).
