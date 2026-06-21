# Phase 1 — Data Model: T5-BrandKit

## Schema change: ADDITIVE — new `brand_kit` table (migration `0003`)

The first schema change since B2's `0002`. **No change** to `proof`, `consent`, `derived_asset`,
`brand_asset`, or any existing read shape. **No consent/proof linkage** (owned brand data).

```text
brand_kit (new)
  id           uuid pk default random
  workspaceId  uuid not null → workspace(id) on delete cascade        // workspace-scoped
  name         text                                                    // optional kit name (nullable)
  logoAssetUrl text                                                     // R2 public URL; NULL = no logo (honest no-logo state)
  brandColor   text not null                                           // one hex, e.g. "#9A6A3C" (auto-contrast DERIVED, not stored)
  fonts        jsonb not null                                          // the curated picks, e.g. { "display": "fraunces", "body": "hanken" }
  createdAt    timestamptz not null default now()
  updatedAt    timestamptz not null default now()
  // index: brand_kit_ws_idx on (workspaceId)
  // NO unique constraint on workspaceId — naturally multi-row so multi-kit later is additive UI, no migration
```

Migration `0003_*`: **CREATE TABLE brand_kit** + its index only — **zero ALTER/DROP** on existing tables.

## New read shape (additive — `src/lib/brand-kit.ts`, client-safe, type-only enum imports)

```text
BrandKitView {
  id: string
  name: string | null
  logoAssetUrl: string | null        // null → the honest "no logo yet" state (never a broken <img>)
  brandColor: string                 // hex
  fonts: BrandKitFonts               // { display: FontKey; body: FontKey }
  // NOTE: contrast is NOT a field — derived via contrastOn(brandColor) at render time
}

BrandKitFonts { display: FontKey; body: FontKey }   // FontKey ∈ the curated FONT_OPTIONS
```

Client-safe helpers/constants in `src/lib/brand-kit.ts`:
- `FONT_OPTIONS: { value: FontKey; label: string; cssVar: string }[]` — the curated, renderable families
  (Pressroom set: Fraunces / Hanken / JetBrains + embed-licensed additions). `DEFAULT_FONTS`.
- `DEFAULT_BRAND_COLOR` (an on-token starting hex), `isHexColor(s)` validator.
- `ALLOWED_LOGO_TYPES` (`image/png`, `image/jpeg`, `image/svg+xml`, `image/webp`), `MAX_LOGO_BYTES`
  (~5 MB), `isAllowedLogoType(s)` — mirrors B2's `brand-asset.ts` pattern.
- `contrastOn(hex): string` — pure relative-luminance → a readable on-colour (the derived auto-contrast).
- result types: `LogoPresignResult`, `SaveBrandKitResult`.

## New reads + write (additive — `src/db/queries.ts`)

- `getBrandKit(workspaceId): Promise<BrandKitView | null>` — the workspace's single kit (`limit 1`); null
  if none. `withDbRetry`.
- `upsertBrandKit(workspaceId, { name, logoAssetUrl, brandColor, fonts }): Promise<BrandKitView>` — if a
  row exists for the workspace, **update** it (+ `updatedAt`); else **insert**. (Read-then-write upsert —
  no unique key, to keep multi-kit open.) Single-attempt write.

**Byte-stable**: `getProofs`/`getProof`/`getLibraryClips`/`getShowcase`/`getClip`/`getConsentLedger`/
the brand-asset reads and the consent reads are **untouched**; these are new siblings.

## R2 (logo object) — reused, additive helper only

- `r2.ts` `presignPut` + `assetUrlForKey` — **reused unchanged**. ADD `brandKitLogoKey(workspaceId):
  string` (a key under a `brand-kit/` prefix). The logo object lives in the same B2 bucket.

## State / lifecycle

- A workspace has **0 or 1** kit in v1 (the table allows more; the UI manages one). First Save **creates**
  it; later Saves **update** it. The logo is **optional** at every point (null → honest no-logo state).
- No state machine, no consent, no versioning.

## Validation / honesty rules

- **Owned-only (FR-019)**: every stored/shown value is the brand's own identity; no consent, no proof,
  no fabricated metric.
- **Logo honesty (FR-005)**: `logoAssetUrl` null → render the "no logo yet — upload one" state, never a
  broken `<img>`. The seed seeds colours + fonts with `logoAssetUrl = null`.
- **Image validation (FR-003)**: server re-validates `contentType ∈ ALLOWED_LOGO_TYPES` and `sizeBytes ≤
  MAX_LOGO_BYTES` at presign (never trust the client).
- **Colour (FR-002)**: `brandColor` must pass `isHexColor`; contrast is derived, never stored.
- **Fonts (FR-002)**: each picked font must be in `FONT_OPTIONS` (a renderable family).
- **T8 seam (FR-006)**: no stored/derived "styled clip" — the application to a rendered clip is the
  labeled T8 seam, not data here.
