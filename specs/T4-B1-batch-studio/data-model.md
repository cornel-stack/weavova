# Phase 1 — Data Model: T4-B1 Batch studio

**No schema change, no new read.** The batch reuses the existing `derived_asset` write (`insertDerivedAsset`)
and consent re-check (`getGrantedConsentId`) per proof. The data model here is (a) the transient selection,
(b) the additive batch result types, and (c) the per-proof write mapping (reused).

---

## 1. Transient selection (client state, not persisted)

| Field | Type | Notes |
|---|---|---|
| `selecting` | `boolean` | inbox selection mode on/off (entered via "Make clips" in the toolbar) |
| `selected` | `Set<string>` | selected proof ids — **granted only** ("Select all ready" = granted; non-granted is un-selectable, Q2/FR-003) |
| `format` | `ClipFormat` | the **one** batch format (Q1), default `9x16`; reuses `FORMAT_OPTIONS`/`DEFAULT_FORMAT` |

Lives in the inbox client island (`inbox-client.tsx`). No `localStorage`. Carried into `generateBatch`.

---

## 2. Batch result types (additive — `src/lib/studio.ts`)

```text
type BatchSkipReason = 'needs_consent';
type BatchItemResult = { proofId: string; status: 'made' | 'skipped' | 'error'; reason?: BatchSkipReason };
type BatchResult     = { made: number; skipped: number; failed: number; items: BatchItemResult[] };
```

- `GenerateInput` / `GenerateResult` / `validateGenerateInput` / `FORMAT_OPTIONS` / `DEFAULT_FORMAT` /
  `HOOK_MAX_LENGTH` are **byte-unchanged**; the batch types are additive.

---

## 3. `generateBatch` per-proof flow (reuses T2.4b building blocks)

`generateBatch({ proofIds: string[]; format: ClipFormat }): Promise<BatchResult>` — workspace resolved
server-side. For each `proofId`:

| Step | Reuses | Outcome on failure |
|---|---|---|
| validate `{ proofId, format, hook: "" }` | `validateGenerateInput` (the D8 guard) | invalid → `{ status: 'error' }` |
| re-check consent (P-VII) | `getGrantedConsentId(workspaceId, proofId)` (`withDbRetry`) | `null` → `{ status: 'skipped', reason: 'needs_consent' }`, **no write** |
| write (granted only) | `insertDerivedAsset({ workspaceId, proofId, consentId, kind:'clip', format, assetUrl: SAMPLE_CLIP_URL, hook: null })` — **single attempt** (D4) | throw → `{ status: 'error' }` |

Then **revalidate once**: `/app/library`, `/app`, `/app/showcase`, and the made proofs' `/app/proof/[id]`
(and/or the inbox). Return the tallied `BatchResult`. **No transaction / no rollback** — each insert is
independent (D4); the action never throws on a per-proof failure (only a genuine global failure propagates).

**Write columns** are exactly the single-clip studio's (see T2.4b `data-model.md` §3): `kind:'clip'`, the
batch `format`, `assetUrl = SAMPLE_CLIP_URL`, `hook = null` (batch carries no hook — A-06), `consentId` from
the per-proof re-check. No fabricated values.

---

## 4. Existing entities (unchanged — referenced only)

- **Proof** (T0.3): the selected items; each one's current effective consent gates its clip at generate.
- **Consent** (T0.3): re-checked per proof via the shared gate; never modified.
- **Derived asset / clip** (T2.4a): one row per granted proof in the batch (single-attempt insert). No
  schema change; surfaced everywhere via the existing reads.
- **NOT modelled here**: any batch/job entity, warmth ranking, upload, export artifact, or success metric —
  later slices / not owned; not fabricated (FR-019, A-11).

No new tables, columns, enums, indexes, **or reads**. No migration. One added action; additive result types.
