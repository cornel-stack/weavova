# Phase 1 — Data Model: T2.4b Clip Studio

**No schema change.** This slice writes into T2.4a's existing `derived_asset` table and re-reads `consent`.
The "data model" here is therefore (a) the **transient** studio configuration, (b) the typed **Generate
result**, and (c) the **write mapping** onto the existing table.

---

## 1. Transient clip configuration (not persisted as an entity)

The merchant's in-studio choices — a **subset of the render contract's `RenderInput`** (render spec §4),
limited to the owned, merchant-facing aspects that need no T7/T8 pipeline.

| Field | Type | Notes |
|---|---|---|
| `format` | `ClipFormat` (`'9x16' \| '1x1' \| '4x5' \| '16x9'`) | From the existing enum (`src/db/schema.ts` → `clip.ts`). Default **`9x16`** (vertical). The owned `Format` aspect set. |
| `hook` | `string` | The **brand-authored** marketing line (render spec §7.4). Pre-filled with a non-fabricated brand default; editable; trimmed + length-capped; never an AI suggestion; never the customer's words. |

- Lives in the Client island's local component state only (no `localStorage` — Principle X). Carried into
  the Generate call. **Persisted as provenance** on the written row (`format`, `hook`), *not* reflected in
  the stub's sample pixels (FR-007 — the limitation is surfaced, not hidden).
- Supporting constants (`src/lib/studio.ts`): `DEFAULT_FORMAT = '9x16'`, `FORMAT_OPTIONS` (the four formats
  with display labels for the picker).

**Not modelled / not rendered** (A-11 / FR-011): cutaways/product-media, music tracks, multiple brand kits,
the scene/highlight timeline, AI hook/cutaway suggestions — no backing data; resolved by T7/T8.

---

## 2. `GenerateInput` + `GenerateResult` (the Server Action contract)

**Input** (validated server-side by a hand-rolled guard — D8):

| Field | Type | Validation |
|---|---|---|
| `proofId` | `string` | non-empty (further neutralized by the workspace-scoped re-check) |
| `format` | `ClipFormat` | must be one of the enum values |
| `hook` | `string` | trimmed; length-capped; may be empty → stored as `null` |

> `workspaceId` is **not** an input — it is resolved server-side from the session seam, never trusted from
> the client.

**Result** — a discriminated union the client switches on:

```text
GenerateResult =
  | { status: 'generated';        clip: { format: ClipFormat; hook: string | null; assetUrl: string; createdAt: string } }
  | { status: 'consent_required' }                 // re-check failed → blocked, NO write (FR-008)
  | { status: 'error' }                            // invalid input or a failed write → retryable, NO partial state
```

- `generated` → the client reveals the **labelled sample** (Q2→A / FR-007), using `assetUrl` =
  `SAMPLE_CLIP_URL` and echoing the chosen `format`/`hook` as *configured provenance* (not as rendered
  pixels).
- `consent_required` → the client shows the honest consent-required state; no clip.
- `error` → the client shows an inline retry; no clip, no fabricated metric.

---

## 3. Write mapping onto `derived_asset` (existing table — T2.4a)

On a consent-passed Generate, `insertDerivedAsset` sets exactly these columns; the rest are DB defaults:

| Column | Source | Notes |
|---|---|---|
| `id` | DB default (`gen_random_uuid()`) | — |
| `workspaceId` | session seam | server-resolved, never client |
| `proofId` | input (re-check-validated) | the source proof |
| `consentId` | **the re-check result** (`getGrantedConsentId`) | **provenance** — the granted consent version the clip was made under (P-VII). Never expresses revocation. |
| `kind` | constant `'clip'` | the only kind this slice produces |
| `format` | input | the chosen `ClipFormat` |
| `assetUrl` | `SAMPLE_CLIP_URL` | the shared stubbed R2 sample reference (D5) |
| `hook` | input (trimmed; `''` → `null`) | owned brand-authored provenance |
| `createdAt` | DB default (`now()`) | drives "clips this month" / latest-clip ordering |

**Read-back is via T2.4a's unchanged reads** (no new read shape for display): after `revalidatePath`, the
detail's `getProofClips` and the dashboard's `getDashboardSummary` clip reads surface the new row — and the
**read-time withdrawal** (effective consent ≠ granted) removes it everywhere the instant the proof's
consent is revoked, while the row is retained for audit. (SC-008.)

---

## 4. Existing entities (unchanged — referenced only)

- **Proof** (T0.3): read workspace-scoped via the unchanged `getProof` (tenant-isolated; `null → notFound`).
- **Consent** (T0.3): versioned, revocable; the **effective** (latest-version) state is re-checked at
  generate via `getGrantedConsentId`, reusing T2.4a's shared `effectiveConsentState`.
- **`derived_asset`** (T2.4a): the table written here. **No column/enum/index change.**

No new tables, columns, enums, or indexes. No migration.
