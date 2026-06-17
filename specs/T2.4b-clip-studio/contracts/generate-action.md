# Contract — `generateClip` Server Action & the DB read/write

The app's first **mutation**. Lives at `src/app/app/proof/[id]/studio/actions.ts` (`"use server"`),
orchestrating a consent re-check (read) and a single insert (write), both via Drizzle in `src/db/queries.ts`.

## Signature

```text
generateClip(input: GenerateInput): Promise<GenerateResult>

GenerateInput   = { proofId: string; format: ClipFormat; hook: string }
GenerateResult  = { status: 'generated'; clip: { format: ClipFormat; hook: string | null; assetUrl: string; createdAt: string } }
                | { status: 'consent_required' }
                | { status: 'error' }
```

## Steps

1. **Resolve identity server-side** — `workspaceId` from `getCurrentWorkspace()` (the seam); **never** from
   the client.
2. **Validate input (hand-rolled — D8, no Zod)** — `format ∈ ClipFormat`; `hook` trimmed + length-capped
   (`'' → null`); `proofId` non-empty. On failure → `{ status: 'error' }` (no write).
3. **Re-check consent (P-VII)** — `const granted = await getGrantedConsentId(workspaceId, proofId)`.
   `granted === null` → `{ status: 'consent_required' }` (**no write**, FR-008 / SC-004).
4. **Write (granted only)** — `const row = await insertDerivedAsset({ workspaceId, proofId, consentId:
   granted.consentId, kind: 'clip', format, assetUrl: SAMPLE_CLIP_URL, hook })`. **Single attempt** (not
   `withDbRetry`-wrapped — D4). On a thrown failure → `{ status: 'error' }`.
5. **Revalidate** — `revalidatePath(\`/app/proof/${proofId}\`)` and `revalidatePath('/app')` so T2.4a's
   reads surface the new row on the detail + dashboard (SC-008).
6. **Return** `{ status: 'generated', clip: { format, hook: <trimmed-or-null>, assetUrl: SAMPLE_CLIP_URL,
   createdAt: row.createdAt.toISOString() } }`.

## DB functions added to `src/db/queries.ts` (ADD only — existing reads byte-unchanged)

### `getGrantedConsentId(workspaceId, proofId): Promise<{ consentId: string } | null>`

- `withDbRetry`-wrapped. Workspace-scoped via a `proof` join (a cross-workspace or missing `proofId` →
  `null`; no leak).
- Returns the **latest** consent version's `id` **iff** the proof's **effective** consent is `granted`,
  **reusing T2.4a's shared `effectiveConsentState`** so the generate gate provably matches the withdrawal
  gate and the proof-read consent logic (one source of truth — P-VII). Otherwise `null`.
- Owned data only — returns just the consent row id; no view/metric.

### `insertDerivedAsset(values): Promise<{ createdAt: Date }>`

- A single Drizzle `insert(derivedAsset).values({...}).returning({ createdAt })`. **Not** retry-wrapped
  (non-idempotent — D4). Drizzle only (no raw SQL).
- `values` = `{ workspaceId, proofId, consentId, kind: 'clip', format, assetUrl, hook }`; `id`/`createdAt`
  are DB defaults (see `data-model.md` §3).

## Shared constant (D5)

`SAMPLE_CLIP_URL` (`= 'r2://weavova-samples/press-run-sample.mp4'`) is **extracted to `src/lib/clip.ts`**;
the Server Action imports it, and the seed imports it in place of its local literal (behaviour-identical;
the seed edit is optional/flagged). The stub returns the **same** sample regardless of config (FR-007).

## Assertions

- **P-VII**: no row is ever written for a proof whose effective consent is not `granted` at generate time
  (step 3 blocks). The written `consentId` ties the clip to its governing consent, so T2.4a's read-time
  withdrawal removes it everywhere the instant consent is revoked; the row is retained for audit. Even the
  re-check→insert window is safe (read-time withdrawal — research D4).
- **No schema change**: writes into T2.4a's existing `derived_asset`; no migration.
- **Byte-stability**: `effectiveConsentState`/`effectiveConsentGranted`, `getProofClips`, the
  `getDashboardSummary` clip reads, and all proof reads are **unchanged** — only `getGrantedConsentId` +
  `insertDerivedAsset` are added.
- **No new dependency**; no `any`/`@ts-ignore`; no `localStorage`; Tailwind classes only; honest microcopy
  (no "amazing"/"awesome"/emoji — P-XI).
