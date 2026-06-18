# Phase 1 Data Model — T4-B2 Brand-asset store

**Additive only.** First schema change since `derived_asset` (T2.4a) → migration **`0002_<generated>.sql`**.
**No change** to existing tables, the consent model, `derived_asset`, or the proof / clip / showcase **read
shapes**.

---

## New enum — `brand_asset_kind` (Q3:A)

Mirrors the existing `derivedAssetKindEnum` / `clipFormatEnum` pattern in `src/db/schema.ts`. A closed,
stable domain; extensible later by migration.

```ts
// src/db/schema.ts (additive)
export const brandAssetKindEnum = pgEnum("brand_asset_kind", [
  "product", // a product video
  "broll",   // b-roll / supporting footage
]);
```

## New table — `brand_asset` (the reusable owned store)

Workspace-scoped; the brand's **own** footage. **Not** customer proof; **not** in the consent model; **never**
counted as proof (FR-019).

```ts
// src/db/schema.ts (additive)
export const brandAsset = pgTable(
  "brand_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    kind: brandAssetKindEnum("kind").notNull(),
    label: text("label").notNull(),       // free-text, owner-authored (Q3:A — alongside the enum)
    assetUrl: text("asset_url").notNull(), // the real R2 object URL (NOT the sample-clip literal)
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("brand_asset_ws_created_idx").on(t.workspaceId, t.createdAt.desc()),
  ],
);
```

Notes:
- `assetUrl` holds the **real** R2 object reference (constructed from `R2_PUBLIC_BASE_URL` + key). It is a
  different namespace from `SAMPLE_CLIP_URL` (the stubbed clip seam), which stays unchanged.
- Workspace `onDelete: cascade` mirrors `derived_asset` / `source` conventions.

## New join — `proof_brand_asset` (many-to-many attach)

One asset → many proofs; one proof → many assets. Workspace-scoped; **unique on `(proofId, brandAssetId)`** so
attaching the same asset to the same proof is idempotent (FR-005).

```ts
// src/db/schema.ts (additive)
export const proofBrandAsset = pgTable(
  "proof_brand_asset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspace.id, { onDelete: "cascade" }),
    proofId: uuid("proof_id")
      .notNull()
      .references(() => proof.id, { onDelete: "cascade" }),
    brandAssetId: uuid("brand_asset_id")
      .notNull()
      .references(() => brandAsset.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("proof_brand_asset_unique").on(t.proofId, t.brandAssetId),
    index("proof_brand_asset_proof_idx").on(t.proofId),
    index("proof_brand_asset_brand_asset_idx").on(t.brandAssetId),
  ],
);
```

Notes:
- **Detach (Q2:A)** = delete the join row for `(proofId, brandAssetId)`. The `brand_asset` and any other
  proof's row are unaffected.
- The join **never** carries or references consent — brand assets are outside the consent model (P-VII).
  Attaching to a withdrawn proof is allowed (it's owned footage), but the proof still can't generate a clip:
  the gate is `getGrantedConsentId`, untouched.
- `proof onDelete: cascade` / `brandAsset onDelete: cascade` keep the join clean if either side is hard-
  deleted later (delete-from-store is the deferred Q2:A follow-up; B2 does no asset deletes).
- New import needed in `schema.ts`: `uniqueIndex` (alongside the existing `index`).

## Migration

```bash
npx drizzle-kit generate   # emits drizzle/0002_<random_name>.sql (additive: 1 enum + 2 tables + indexes)
npx drizzle-kit migrate    # applies to Neon (needs DATABASE_URL in .env.local)
```

- Expect **only** `CREATE TYPE brand_asset_kind`, `CREATE TABLE brand_asset`, `CREATE TABLE
  proof_brand_asset`, and their indexes — **no `ALTER`/`DROP` on existing tables**. Review the generated SQL to
  confirm additivity before applying (SC-007).
- `drizzle/meta/` snapshot updates are part of the generated changeset.

## Owned view shapes (read projections) — `src/lib/brand-asset.ts` (NEW)

Type-only enum import (erased at build), mirroring `src/lib/clip.ts`. **Owned fields only — never a
view/reach/engagement metric, never a proof framing (FR-019).**

```ts
import type { brandAssetKindEnum } from "@/db/schema";
export type BrandAssetKind = (typeof brandAssetKindEnum)["enumValues"][number];

// The store-list + attach-picker card shape.
export interface BrandAssetView {
  id: string;
  kind: BrandAssetKind;   // owned "product" | "broll" chip
  label: string;          // owner-authored
  assetUrl: string;       // real R2 object
  createdAt: string;      // ISO
}

// The proof-detail "attached brand assets" row shape (the asset + the attachment).
export interface ProofBrandAssetView extends BrandAssetView {
  attachmentId: string;   // the proof_brand_asset row id (detach target)
  attachedAt: string;     // ISO (join.createdAt)
}
```

## Entities & relationships (summary)

- **`brand_asset` (NEW)** — owned footage in the reusable store. Workspace-scoped. Owned-only fields; never
  proof.
- **`proof_brand_asset` (NEW)** — many-to-many proof ↔ brand-asset; unique `(proofId, brandAssetId)`;
  detachable; consent-free.
- **`proof` (existing)** — gains an additive read relationship for the attached-assets section; its effective
  consent stays the **sole** generation gate, unchanged.
- **`consent` (existing)** — **untouched**; no new rows/versions; brand assets sit outside it.
- **`derived_asset` (existing)** — **unchanged**; still the honest sample stub; the brand-asset composite is
  T8.

## Explicit no-change list (SC-007)

- No `ALTER`/`DROP` on `workspace`, `source`, `proof`, `consent`, `derived_asset`.
- No change to `getProofs` / `getProof` / `getProofClips` / `getDashboardSummary` / `getLibraryClips` /
  `getClip` / `getShowcase` / `getGrantedConsentId` / `insertDerivedAsset`, or to `ProofView` / `ClipView` /
  `LibraryClipView` / `ClipDetailView` / `Showcase*` shapes.
- No change to `ProofCard`, `generateClip`, `generateBatch`, or `SAMPLE_CLIP_URL`.
- New reads/writes are **additive** functions in `queries.ts`; new view shapes live in the **new**
  `brand-asset.ts` (not in `clip.ts`).
