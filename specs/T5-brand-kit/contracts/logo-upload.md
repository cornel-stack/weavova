# Contract — Logo upload (reusing B2's R2 path) & save

Reuses B2's ratified presigned-PUT flow verbatim (`src/lib/r2.ts` + the `footage/actions.ts` pattern).
**No new dependency** (`aws4fetch` already present); the same R2 env + CORS provisioned for B2 cover it.
**Owned brand data — no consent call anywhere.**

## `r2.ts` (additive helper; presignPut/assetUrlForKey reused UNCHANGED)

```text
brandKitLogoKey(workspaceId: string): string   // a key under a "brand-kit/" prefix, e.g. brand-kit/{ws}/logo-{uuid}.{ext}
```

## Server actions (`src/app/app/brand/actions.ts`, NEW — `"use server"`)

### `presignBrandKitLogoUpload(input: { contentType: string; sizeBytes: number }): Promise<LogoPresignResult>`
1. `getCurrentWorkspace()` — identity server-side, never trusted from the client.
2. **Validate the image** (never trust the client): `isAllowedLogoType(contentType)` + `sizeBytes ≤
   MAX_LOGO_BYTES` → else `{ status:"invalid", reason }` (no presign).
3. `key = brandKitLogoKey(ws.id)`; `uploadUrl = await presignPut({ key, contentType })` (the B2 helper,
   `aws4fetch`). Return `{ status:"ok", uploadUrl, key }`.

### `saveBrandKit(input: { name: string|null; brandColor: string; fonts: BrandKitFonts; logoKey: string|null }): Promise<SaveBrandKitResult>`
1. `getCurrentWorkspace()`. **Re-validate** server-side: `isHexColor(brandColor)`, both fonts via
   `isValidFontKey`, `name` length cap → else `{ status:"invalid", reason }`.
2. Resolve `logoAssetUrl`: if `logoKey` provided (a freshly-uploaded object) → `assetUrlForKey(logoKey)`;
   else keep the existing kit's `logoAssetUrl` (or null). (So Save persists a just-uploaded logo and
   doesn't clobber an existing one.)
3. `kit = await upsertBrandKit(ws.id, { name, logoAssetUrl, brandColor, fonts })`.
4. `revalidatePath("/app/brand")`. Return `{ status:"saved", kit }`. (No other surface to revalidate —
   the kit is not yet applied anywhere; that's T8.)
   On a genuine failure → `{ status:"error" }`.

## Client flow (the upload widget — mirrors B2's)

`brand-kit-logo-upload.tsx`:
1. The owner picks a file; the widget **validates client-side** (`isAllowedLogoType` + size) for instant
   feedback, then calls `presignBrandKitLogoUpload`.
2. On `ok`, the **browser PUTs the file directly to R2** (`fetch(uploadUrl, { method:"PUT", body:file,
   headers:{ "Content-Type": contentType }})`) — bytes never transit the server.
3. On the PUT's success, the widget shows the logo as a real `<img>` (from the R2 public URL) and surfaces
   the `key` to the editor's form state so the next **Save** persists `logoAssetUrl`.
4. On `invalid` / a failed PUT → an honest inline error; the prior state (no logo / existing logo) is
   preserved. **Never a broken `<img>`.**

The editor (`brand-kit-editor.tsx`) holds the form (logo key, brandColor, fonts, name) and calls
`saveBrandKit` on Save (A-11 — persists). Without a logo, the widget shows the honest **"no logo yet —
upload one"** state.

## Honesty + byte-stability checklist

- A real logo → `<img>`; absent → "no logo yet"; invalid/failed → honest error; **never a broken image**
  (FR-005).
- No consent call (owned data — FR-019/P-VII).
- Build green without R2 env (lazy `getConfig()` — only the live presign throws).
- `r2.ts` `presignPut`/`assetUrlForKey` reused unchanged; B2's `brand-asset.ts`/`footage/actions.ts`
  untouched. No new dependency. Consuming surfaces + nav rail byte-stable.
