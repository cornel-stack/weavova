# Phase 1 — Data Model: T3.1 Library

**No schema change.** The Library is a new **reader** of the existing `derived_asset` (T2.4a). The "data
model" here is (a) the new `LibraryClipView` the surface consumes and (b) the read's projection + the
read-time withdrawal derivation.

---

## 1. `LibraryClipView` (new — `src/lib/clip.ts`; `ClipView` unchanged)

The owned, flattened shape one Library card consumes. `ClipView`'s fields **plus** the source-proof context
the card needs.

| Field | Type | Source | Notes |
|---|---|---|---|
| `id` | `string` | `derived_asset.id` | key |
| `proofId` | `string` | `derived_asset.proofId` / `proof.id` | the **source-proof link** target (`/app/proof/[proofId]`) |
| `customerName` | `string` | `proof.customerName` | the headline (P-II) |
| `verified` | `boolean` | `proof.verified` | the "verified real customer" mark (owned) |
| `kind` | `DerivedAssetKind` | `derived_asset.kind` | `'clip'` for now |
| `format` | `ClipFormat` | `derived_asset.format` | shown via the studio's display-label map |
| `hook` | `string \| null` | `derived_asset.hook` | brand-authored; shown when set (render spec §7.4) |
| `assetUrl` | `string` | `derived_asset.assetUrl` | the stubbed sample reference → the **sample/preview** label |
| `createdAt` | `string` (ISO) | `derived_asset.createdAt` | the created date; **newest-first** ordering |

- **Owned only (FR-019)**: no view/reach/engagement/performance, no render status.
- `ClipView` (the proof-detail shape) is **byte-unchanged**; `LibraryClipView` is additive.

---

## 2. The read — `getLibraryClips(workspaceId): Promise<LibraryClipView[]>`

| Aspect | Definition |
|---|---|
| Scope | Workspace-scoped: `where derived_asset.workspaceId = $ws`. Tenant-isolated — no other workspace's clip is read. |
| Join | `innerJoin proof on derived_asset.proofId = proof.id` (for `customerName`, `verified`, the link). |
| **Withdrawal (P-VII)** | `AND effectiveConsentGranted(derived_asset.proofId)` — the **shared** gate (→ `effectiveConsentState`), identical to the dashboard/detail clip reads. A clip whose source proof's effective consent is `revoked`/`awaiting` is **excluded** from the rows (and the count). |
| Order | `order by derived_asset.createdAt desc` (newest first). |
| Reliability | `withDbRetry`-wrapped (transient cold start retried transparently). |
| Audit | Withheld clips' `derived_asset` rows are **retained** — the read filters, never deletes ("pull, don't destroy"). |

**Count**: the Library's honest count = `clips.length` of the returned (already-filtered) array — equals the
number of consent-visible clips (FR-007). Never a total that includes withheld clips.

---

## 3. Existing entities (unchanged — referenced only)

- **Derived asset / clip** (T2.4a): the rows the Library lists. No column/enum/index change; not written here.
- **Proof** (T0.3): supplies `customerName` + `verified` + the link target. Read-only.
- **Consent** (T0.3): its **effective** state governs visibility via the shared helper. Never changed here.

No new tables, columns, enums, or indexes. No migration. One added read; one added view type.
