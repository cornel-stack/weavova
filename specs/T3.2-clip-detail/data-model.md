# Phase 1 — Data Model: T3.2 Clip detail

**No schema change.** A new **reader** of the existing `derived_asset` (+ `proof`, `source`, `consent`). The
data model here is (a) the new `ClipDetailView` and (b) the `getClip` projection + the no-oracle/withdrawal
derivation.

---

## 1. `ClipDetailView` (new — `src/lib/clip.ts`; `ClipView`/`LibraryClipView` unchanged)

Owned fields only (FR-019). Three groups: the clip, its source-proof provenance, and its consent (two roles).

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `string` | `derived_asset.id` | the clip |
| `kind` | `DerivedAssetKind` | `derived_asset.kind` | `'clip'` |
| `format` | `ClipFormat` | `derived_asset.format` | the chosen format (drives the sample-still aspect) |
| `hook` | `string \| null` | `derived_asset.hook` | brand-authored; shown when set (render spec §7.4) |
| `assetUrl` | `string` | `derived_asset.assetUrl` | the stubbed sample reference → the "Sample preview" still |
| `createdAt` | `string` (ISO) | `derived_asset.createdAt` | created date |
| `proofId` | `string` | `derived_asset.proofId` | source-proof link target + re-make studio target |
| `customerName` | `string` | `proof.customerName` | the headline (P-II) |
| `proofType` | `ProofType` | `proof.proofType` | source proof type (owned) |
| `verified` | `boolean` | `proof.verified` | the verified mark |
| `source` | `string` | `source.label` | capture source label |
| `madeUnderVersion` | `number` | `consent.version` (via `derived_asset.consentId`) | **provenance**: the version the clip was made under |
| `madeUnderAt` | `string \| null` (ISO) | `consent.grantedAt` (that row) | the made-under consent's date |
| `consentState` | `ConsentState` | effective (latest) consent | the proof's **current** consent (always `granted` when viewable) |
| `consentVersion` | `number \| null` | latest version | current effective consent version |
| `consentAt` | `string \| null` (ISO) | latest effective date | current effective consent date |

- `ClipView` (proof detail) and `LibraryClipView` (Library) are **byte-unchanged**; `ClipDetailView` is
  additive.

---

## 2. The read — `getClip(workspaceId, clipId): Promise<ClipDetailView | null>`

| Aspect | Definition |
|---|---|
| Joins | `derived_asset` ⋈ `proof` (customer/type/verified/link) ⋈ `source` (label) ⋈ `consent` **made-under** (`consent.id = derived_asset.consentId` → version + grantedAt). |
| Current consent | The proof's **current effective** consent via the **existing** `effectiveConsentState` / `latestConsentVersion` / `latestConsentEffectiveAt` subqueries (reused, unchanged). |
| Scope + gate | `where derived_asset.id = clipId AND proof.workspaceId = workspaceId AND effectiveConsentGranted(derived_asset.proofId)`. |
| **Three-into-one null** | **missing** id, **cross-workspace** id, **withdrawn** clip → no row → `null` → one content-free `notFound()` (no oracle; T2.3 + P-VII). |
| Reliability | `withDbRetry`-wrapped. |
| Order/limit | `limit 1` (by id). |

**Audit**: a withdrawn clip's `derived_asset` row is **retained**; the gate makes it unreachable, it is not
deleted ("pull, don't destroy").

---

## 3. Existing entities (unchanged — referenced only)

- **Derived asset / clip** (T2.4a): the row the detail focuses; `consentId` → the made-under consent. Read-only.
- **Proof** (T0.3): source customer/type/verified/source + the link/re-make target; its current effective
  consent gates visibility.
- **Consent** (T0.3): two roles — **made-under** (provenance, via `consentId`) and **current effective**
  (the gate). Never modified.
- **Source** (T0.3): the capture source label (owned).

No new tables, columns, enums, or indexes. No migration. One added read; one added view type.
