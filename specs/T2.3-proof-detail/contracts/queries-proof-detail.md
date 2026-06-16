# Contract — proof-detail read (`getProof` → `ProofDetailView`)

**Location**: `src/db/queries.ts` (read) + `src/lib/proof.ts` (type). Upgrades the T2.2 `getProof`
signature's **return type** to a detail-specific projection. Wrapped in `withDbRetry` (T2.1).

## Type (intended) — `src/lib/proof.ts`

```ts
// ProofView is UNCHANGED. ProofDetailView is a superset used only by the detail.
export interface ProofDetailView extends ProofView {
  /** effective (latest-version) consent version — "v{n}"; null only if no consent row exists */
  consentVersion: number | null;
  /** ISO date for the effective consent: granted→grantedAt, revoked→revokedAt, awaiting→createdAt */
  consentAt: string | null;
}
```

## Signature (intended) — `src/db/queries.ts`

```ts
// BEFORE (T2.2):  getProof(workspaceId, id): Promise<ProofView | null>
// AFTER  (T2.3):
export async function getProof(
  workspaceId: string,
  id: string,
): Promise<ProofDetailView | null>;
```

## Behaviour contract

- **Projection (detail-only)**: `detailColumns = { ...proofColumns, consentVersion, consentEffectiveAt }`,
  where `consentVersion` / `consentEffectiveAt` are correlated subqueries over `consent` selecting the
  **latest version** row (`order by version desc limit 1`): `version`, and
  `coalesce(revoked_at, granted_at, created_at)` respectively. A `toDetailView` mapper = `{ ...toView(row),
  consentVersion: row.consentVersion ?? null, consentAt: row.consentEffectiveAt?.toISOString() ?? null }`.
- **Workspace scoping / isolation**: filters on **both** `workspaceId` and `id` (`and(eq(workspaceId),
  eq(id))`), `limit(1)`. A proof in another workspace, or a non-existent id, resolves to **`null`** — the
  identical result, with no row of another tenant ever projected (the basis of the not-found / no-oracle
  behaviour in `detail-states.md`).
- **Reliability**: the whole body is wrapped in `withDbRetry` (transient cold starts retry; a genuine
  failure rethrows → the `[id]` page `error.tsx`).
- **Byte-stability (MUST)**: `ProofView`, `ProofCardProps`, `proofColumns`, `toView`, `latestConsentState`,
  and **`getProofs`** are **unchanged** — the inbox, the canonical ProofCard, and `styleguide/data` keep
  reading `ProofView`. Only `getProof` and the new `ProofDetailView` type change.
- **No schema/seed/seam change.** `consentVersion`/`consentAt` come from existing `consent` columns.

## Caller impact

- `src/components/app/proof-detail/proof-detail-data.tsx` (new): the **only** consumer — calls
  `getProof(ws.id, id)`, maps `null` → `notFound()`, else renders `<ProofDetail proof={…}/>`.
- No other caller exists (T2.2 fixed the signature with no consumer), so the return-type refinement
  (`ProofView` → `ProofDetailView`, a superset) breaks nothing.

## Scale note (unchanged)

Single-row read; three correlated consent subqueries on one row is negligible. If a future surface needs
many consent fields at once, swap the correlated subqueries for a single `LATERAL` join on the latest
consent row (localised to `getProof`).
