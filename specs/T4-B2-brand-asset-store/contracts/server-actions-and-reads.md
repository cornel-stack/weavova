# Phase 1 Contracts — T4-B2 Brand-asset store

Server actions + reads. **Consent posture is uniform: brand-asset operations NEVER touch the consent flow; the
proof's `getGrantedConsentId` gate on clip generation is UNCHANGED and remains the sole gate.** Identity is
always resolved server-side via `getCurrentWorkspace()` (no client-supplied workspace id — no cross-tenant
write). Reads are `withDbRetry`-wrapped; writes are single-attempt (D4).

> Function names/signatures below are the planned contract; the R2 mechanism details depend on research.md §1
> ratification (transport + dep). Nothing is implemented here.

---

## Reads (`src/db/queries.ts` — additive)

### `getBrandAssets(workspaceId): Promise<BrandAssetView[]>`
- The reusable store list, workspace-scoped, newest first (`brand_asset_ws_created_idx`).
- `withDbRetry`-wrapped. Owned fields only (FR-019). Empty array → the store empty state.

### `getProofBrandAssets(workspaceId, proofId): Promise<ProofBrandAssetView[]>`
- The assets attached to one proof (join ⨝ brand_asset), workspace-scoped, for the additive proof-detail
  section. `withDbRetry`-wrapped. Empty array → the section's empty state ("no brand assets attached").
- Separate read so `getProof` / `getProofClips` / their view shapes stay **byte-stable**.

---

## Writes / actions

### `presignBrandAssetUpload(input): Promise<PresignResult>`  — `"use server"`
- **Input** (validated server-side): `{ kind: BrandAssetKind; label: string; contentType: string; sizeBytes: number }`.
- **Validation (FR-003)**: `kind ∈ {product,broll}`; `label` non-empty, length-capped; `contentType ∈`
  ALLOWED_TYPES; `sizeBytes ≤ MAX_BYTES`. Invalid → `{ status: "invalid", reason }`, **no presign, no write**.
- **On valid**: returns a **short-lived presigned PUT URL** (signed for the exact key + content-type [+ size
  where supported]) + the object **key** the client will confirm with. Consent: **not involved.**
- **Result**: `{ status: "ok", uploadUrl, key } | { status: "invalid", reason } | { status: "error" }`.
- No DB row is written yet (the row is recorded only after the browser PUT succeeds — `createBrandAsset`).

### `createBrandAsset(input): Promise<CreateResult>`  — `"use server"`
- Called **after** the browser PUT to R2 succeeds. **Input**: `{ kind, label, key }` (and content-type/size if
  re-validated). Re-resolves workspace server-side; **re-validates** `kind`/`label`; constructs `assetUrl`
  from `R2_PUBLIC_BASE_URL` + `key`.
- **Write**: single-attempt insert into `brand_asset` (D4 — not retry-wrapped). On success →
  `revalidatePath("<store-route>")`.
- **Result**: `{ status: "created", asset: BrandAssetView } | { status: "invalid", reason } | { status: "error" }`.
  A `failed` PUT or a failed insert surfaces the honest `failed` state client-side; nothing is faked as stored.

### `attachBrandAsset(input): Promise<AttachResult>`  — `"use server"`
- **Input**: `{ proofId, brandAssetId }`. Server-resolved workspace; both ids verified to belong to the
  workspace (no cross-tenant attach). **Consent: not checked** — attaching owned footage never invokes the
  consent flow (P-VII); attaching to a withdrawn proof is allowed and still cannot generate a clip.
- **Write**: single-attempt insert into `proof_brand_asset`; **idempotent** on `(proofId, brandAssetId)` (the
  unique index → a duplicate attach is a no-op / "already attached", not a second row). On success →
  `revalidatePath("/app/proof/${proofId}")`.
- **Result**: `{ status: "attached" } | { status: "already_attached" } | { status: "error" }`.

### `detachBrandAsset(input): Promise<DetachResult>`  — `"use server"`  (Q2:A)
- **Input**: `{ proofId, brandAssetId }` (or `attachmentId`). Server-resolved workspace + ownership check.
- **Write**: single-attempt delete of the **join row only** — the `brand_asset` and any other proof's
  attachment are untouched. On success → `revalidatePath("/app/proof/${proofId}")`.
- **Result**: `{ status: "detached" } | { status: "error" }`.
- **Delete-from-store is NOT implemented (Q2:A conscious deferral)** — no action removes a `brand_asset` or its
  R2 object in B2. The follow-up (block-while-attached + R2 object cleanup) is named, not silently omitted.

---

## Byte-stability assertions (the negative contract)

- `generateClip` / `generateBatch`: **unchanged** — an attached asset does not alter the generated sample/
  preview; the composite is T8. No new branch reads `proof_brand_asset` during generation.
- `getProof` / `getProofClips` and all clip/showcase/dashboard reads + their view shapes: **unchanged**.
- `ProofCard`: **unchanged** — the attached-assets section lives in proof detail, not the card.
- `SAMPLE_CLIP_URL`: **unchanged** — B2's real R2 URLs are a separate namespace (`brand_asset.assetUrl`).

## Honesty / fences carried into the contracts

- **A-11**: presign+PUT, record-row, attach, and detach all genuinely persist; only the **composite** is the
  labeled deferred T8 seam — no dead controls, no fake combined preview.
- **FR-019**: every brand-asset surface labels it the brand's own footage; it appears in **0** proof counts /
  inbox / showcase proof set; reads project owned fields only.
- **P-VIII**: actions are upload / attach / detach only — no trim/sequence/composite parameters anywhere.
