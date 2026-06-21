# Contract — Brand-kit lib, reads & write

## `src/lib/brand-kit.ts` (NEW, client-safe — type-only enum imports, the clip.ts/brand-asset.ts idiom)

```text
// curated, renderable fonts (Q2:A — no upload)
type FontKey = "fraunces" | "hanken" | "jetbrains"   // + any embed-licensed additions
FONT_OPTIONS: { value: FontKey; label: string; cssVar: string }[]   // cssVar = the next/font CSS var already loaded
DEFAULT_FONTS: BrandKitFonts = { display: "fraunces", body: "hanken" }

BrandKitFonts { display: FontKey; body: FontKey }
BrandKitView { id; name: string|null; logoAssetUrl: string|null; brandColor: string; fonts: BrandKitFonts }

// colour
DEFAULT_BRAND_COLOR: string          // an on-token starting hex
isHexColor(s: unknown): s is string  // #RGB / #RRGGBB
contrastOn(hex: string): string      // pure: relative luminance → readable on-colour (the DERIVED auto-contrast)

// logo image validation — mirrors B2's brand-asset.ts pattern
ALLOWED_LOGO_TYPES = ["image/png","image/jpeg","image/svg+xml","image/webp"] as const
MAX_LOGO_BYTES = 5 * 1024 * 1024
isAllowedLogoType(s: unknown): boolean
isValidFontKey(s: unknown): s is FontKey

// result types (discriminated unions the client switches on)
LogoPresignResult = { status:"ok"; uploadUrl:string; key:string } | { status:"invalid"; reason:string }
SaveBrandKitResult = { status:"saved"; kit: BrandKitView } | { status:"invalid"; reason:string } | { status:"error" }
```

`contrastOn` is pure + deterministic (testable); no DB code in this module (client-safe).

## Reads / write (`src/db/queries.ts`, additive)

### `getBrandKit(workspaceId): Promise<BrandKitView | null>`
- The workspace's single kit (`select … from brand_kit where workspaceId = $ws limit 1`), mapped to
  `BrandKitView` (fonts parsed from jsonb). `null` if none. `withDbRetry`.

### `upsertBrandKit(workspaceId, input: { name: string|null; logoAssetUrl: string|null; brandColor: string; fonts: BrandKitFonts }): Promise<BrandKitView>`
- Read-then-write upsert: if a row exists for `workspaceId`, `update` it (+ `updatedAt = now()`); else
  `insert`. Returns the resulting `BrandKitView`. Single-attempt (no blind retry on a write).
- **No `onConflict`/unique key** — deliberately, to keep multi-kit a later additive UI.

## Notes

- `getProofs`/`getProof`/`getLibraryClips`/`getShowcase`/`getClip`, the consent reads, and the
  brand-asset reads/writes are **byte-unchanged** — these are new siblings.
- No consent call anywhere in these (owned brand data).
