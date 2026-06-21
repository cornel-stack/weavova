# Quickstart — Validating T5-BrandKit (manual, on fixtures)

Prerequisites: `npm run dev` (localhost:3000), the stub session / fixtures (the seed seeds a brand kit's
colours + fonts with **no logo**). A live logo upload needs the R2 env + CORS already provisioned for B2;
the build + colours/fonts work without it.

## 1. Colours & fonts persist + the real identity preview (US1, FR-002/004)

1. Open `/app/brand` — the single-kit editor (no list, no kit-switching).
2. Pick a brand colour (hex) and curated fonts (display + body); **Save**.
3. Reload — the saved colour + fonts **persist**.
4. The identity preview shows the **real** brand-colour swatch with its **derived contrast** foreground
   and **font specimens** of the picked fonts — all real, nothing fabricated.

## 2. The logo: real `<img>` or honest no-logo (US2, FR-003/005)

1. With no logo, confirm the logo area shows **"no logo yet — upload one"** — **not** a broken image.
2. Upload a valid image (PNG/JPEG/SVG/WebP, ≤ ~5 MB): the browser PUTs it directly to R2 (B2's path,
   no new dependency); on success it shows as a real `<img>`; **Save** persists it (survives reload).
3. Try an invalid file (wrong type / too large): it is honestly rejected with an inline message; the
   prior state is preserved (no broken/partial image).

## 3. The T8 seam — no faked styled-clip preview (FR-006, FR-011)

1. Confirm a clearly-labeled panel states the identity **"will style your rendered clips when rendering
   ships"** (T8). There is **no** restyled customer-clip / live-reskin preview.
2. Confirm the out-of-scope reference controls are **absent** (not dead stubs): no music bed, no
   per-format caption style, no B-roll cutaways (that's `/app/footage`), no multi-kit list.

## 4. Owned & consent-free (US3, FR-008)

1. Confirm creating/saving the kit **never** invokes the consent flow (no consent prompt/record) — it is
   owned brand data, like B2's footage.
2. Confirm the kit is workspace-scoped and reusable (returns on a later visit).

## 5. Byte-stability & build (FR-009/010)

- Diff confirms **no** change to `ProofCard`, the proof / clip / showcase / **consent** reads,
  `generateClip` / `generateBatch`, the **nav rail** (`src/lib/nav.ts`); `r2.ts` `presignPut` /
  `assetUrlForKey` and B2's `brand-asset.ts` / `footage/actions.ts` **unchanged** (only an additive
  `brandKitLogoKey` helper); the migration is **additive** (`0003` CREATE brand_kit only, zero ALTER on
  existing tables).
- `npm run build` + `npm run lint` green **without** `DATABASE_URL` and **without** R2 env; `git diff
  package.json package-lock.json` shows **no new dependency**.
