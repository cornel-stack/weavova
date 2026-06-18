# Contract — `generateBatch` Server Action

The app's first **bulk mutation** (`src/app/app/proof/actions.ts`, `"use server"`). It reuses the T2.4b
single-clip building blocks per proof — it does **not** fork the generate logic, change any read, or alter
`generateClip`.

## Signature

```text
generateBatch(input: { proofIds: string[]; format: ClipFormat }): Promise<BatchResult>

BatchItemResult = { proofId: string; status: 'made' | 'skipped' | 'error'; reason?: 'needs_consent' }
BatchResult     = { made: number; skipped: number; failed: number; items: BatchItemResult[] }
```

`BatchItemResult`/`BatchResult` are added to `src/lib/studio.ts` (additive; `GenerateResult` etc. unchanged).

## Steps

1. **Resolve identity** — `workspaceId` from `getCurrentWorkspace()`; **never** from the client.
2. **Per proof** (each independent — D4):
   - `validateGenerateInput({ proofId, format, hook: "" })` (the existing hand-rolled guard) — invalid →
     `{ proofId, status: 'error' }`.
   - `getGrantedConsentId(workspaceId, proofId)` (existing, `withDbRetry`) — `null` → `{ proofId, status:
     'skipped', reason: 'needs_consent' }`, **no write** (P-VII; covers revoked-after-select).
   - `insertDerivedAsset({ workspaceId, proofId, consentId, kind:'clip', format, assetUrl: SAMPLE_CLIP_URL,
     hook: null })` (existing) — **single attempt**, NOT `withDbRetry`-wrapped (D4); throw →
     `{ proofId, status: 'error' }`; else `{ proofId, status: 'made' }`.
3. **Revalidate once** — `revalidatePath('/app/library')`, `revalidatePath('/app')`,
   `revalidatePath('/app/showcase')`, and the made proofs' `revalidatePath('/app/proof/[id]')` — so the
   **existing reads** surface the new clips.
4. **Return** the tallied `BatchResult`. The action **never throws** for a per-proof failure (those are in
   `items`); only a genuine global failure (e.g. no workspace) propagates.

## Assertions

- **P-VII**: a clip is written **only** for a proof whose current effective consent is `granted`, re-checked
  **at generate** (not cached from selection); non-granted → skipped, no row.
- **Reuse, not fork**: uses the same `validateGenerateInput` / `getGrantedConsentId` / `insertDerivedAsset` /
  `SAMPLE_CLIP_URL` as `generateClip`; **`generateClip` is unchanged**. Not N× `generateClip` (revalidates
  once; returns a per-proof result).
- **Single-attempt inserts (D4)**: non-idempotent; not retry-wrapped; a failure is reported `error`, not
  retried or rolled back; the rest of the batch proceeds.
- **Honest result (FR-019)**: `made`/`skipped`/`failed` match reality exactly; no all-or-nothing; made clips
  persist; skipped/failed are not faked.
- **No read change / no schema change**: reuses existing reads + `insertDerivedAsset`; the made clips light up
  the Library/dashboard/showcase via the existing reads after revalidation. No `queries.ts` change, no
  migration.
- **No new dependency**; Drizzle only; no `any`/`@ts-ignore`; honest microcopy (P-XI).
