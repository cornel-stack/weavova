# Contract — workspace-scoped proof reads

**Location**: `src/db/queries.ts` (T0.3 query layer). The T2.1-deferred scoping, applied now. Both reads
are wrapped in `withDbRetry` (T2.1, `src/db/with-retry.ts`).

## Signatures (intended)

```ts
// BEFORE (T0.3):  getProofs(): Promise<ProofView[]>
// AFTER  (T2.2):
export async function getProofs(workspaceId: string): Promise<ProofView[]>;

// BEFORE (T0.3):  getProof(id: string): Promise<ProofView | null>
// AFTER  (T2.2):
export async function getProof(
  workspaceId: string,
  id: string,
): Promise<ProofView | null>;
```

## Behaviour contract

- **`getProofs(workspaceId)`**: returns all proof where `proof.workspaceId = workspaceId`, ordered
  `capturedAt` descending, using the existing `proofColumns` + `latestConsentState` + `toView`. Wrapped
  in `withDbRetry` (transient cold starts retry; genuine failures rethrow → page `error.tsx`).
- **`getProof(workspaceId, id)`**: returns the single proof matching **both** `id` and `workspaceId`, or
  `null` (a proof from another workspace is not found). Wrapped in `withDbRetry`. (No caller in T2.2
  beyond the optional placeholder; T2.3 consumes it — signature fixed now so T2.3 is mechanical.)
- Neither function changes the DB schema, the seed, the session seam, or `ProofView`.

## Caller impact

- `src/app/app/proof/page.tsx` (new): calls `getProofs(ws.id)` via `<InboxData>`.
- `src/app/styleguide/data/page.tsx` (existing, the only current `getProofs()` caller): updated to
  resolve a workspace (`getCurrentWorkspace`) and pass its id. Internal styleguide page; keeps the build
  green.

## Scale note (deferred)

Returns the full workspace set (fine at demo scale). At large volume the contract evolves to accept
filter/sort/pagination params and return a windowed result + a server-side total; that change is
localized to this function and the inbox page (see plan D2).
