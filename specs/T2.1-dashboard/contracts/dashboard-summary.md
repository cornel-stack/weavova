# Contract — `getDashboardSummary` (the dashboard read)

**Location**: `src/db/queries.ts` (T0.3 query layer). The single workspace-scoped read the dashboard
calls. Wrapped internally by `withDbRetry` (see `db-retry.md`).

## Signature (intended)

```ts
export type LatestClipDescriptor = {
  customerName: string;
  verified: boolean;
  createdAt: string; // ISO
};

export type DashboardSummary = {
  proofThisWeek: number;   // capturedAt within trailing 7 days (real now())
  needsReview: number;     // reviewed === false  (also the greeting count)
  totalProof: number;      // all workspace proof (empty-state discriminator)
  clipsThisMonth: number;  // T2.1: 0  (T2.4: count of derived_asset this month)
  latestClip: LatestClipDescriptor | null; // T2.1: null (T2.4: most recent owned clip)
  heroProof: ProofView | null;  // most-recent proof, or null when none
  recentProof: ProofView[];     // next most-recent (cap 6), hero excluded
};

export async function getDashboardSummary(
  workspaceId: string,
): Promise<DashboardSummary>;
```

## Behaviour contract

- **Scope**: every query filters `proof.workspaceId = workspaceId`. No cross-workspace data.
- **Counts**: `proofThisWeek`, `needsReview`, `totalProof` are SQL aggregates over all workspace proof
  (not derived from the limited fetch). Windows use the real current date; never anchored to the newest
  proof (FR-004/A-02).
- **Hero/recent**: one `order by capturedAt desc limit 7` fetch using the existing `proofColumns` +
  `latestConsentState` + `toView`. `heroProof` = first row (or `null`); `recentProof` = the following
  rows, max 6, hero excluded.
- **Clip fields**: `clipsThisMonth` returns `0` and `latestClip` returns `null`, each marked with a
  `// T2.4` swap comment. They are **never hardcoded in the UI** — they come through this contract.
- **No un-owned metrics**: the return type has no views/reach/engagement field (FR-019/A-09).
- **Reliability**: the whole read runs inside one `withDbRetry` boundary; transient cold-start failures
  retry transparently, genuine failures rethrow (→ page `error.tsx`).
- **Empty**: zero workspace proof ⇒ counts `0`, `heroProof: null`, `recentProof: []`.

## Consumers

- `DashboardBody` (Server) calls it with the id from `getCurrentWorkspace()` and branches data vs empty.
- `DashboardKpis` reads `proofThisWeek`, `needsReview`, `clipsThisMonth`, `latestClip`.
- `DashboardHero` reads `heroProof`. The grid maps `recentProof` → `ProofCard`.
