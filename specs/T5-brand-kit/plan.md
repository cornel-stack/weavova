# Implementation Plan: T5-BrandKit — Brand kit (store the brand's visual identity)

**Branch**: `main` (a `T5-brand-kit` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T5-brand-kit/spec.md` with clarifications folded: **Q1→A**
single kit per workspace (`/app/brand`, no list / no `[id]`) · **Q2→A** curated font selection · **Q3→A**
one brand colour + auto-contrast · **single logo v1** (light/dark deferred).

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Do **not** run git. **No decision
needs ratification** — the logo upload **reuses B2's R2 path** (no new dependency), the schema change is
**additive** (migration `0003`), and the consuming surfaces + nav rail are byte-stable. When implemented,
every change is left **uncommitted** for Cornel to review and commit (mirrors prior slices).

## Summary

A brand kit stores a workspace's **visual identity** — **logo, brand colour, fonts** — once, so the clips
Weavova produces can look like **their** brand. It is **owned brand data** (no consent, like B2's
footage). It ships **real storage + a real identity preview**, and keeps the **one honest deferred seam**
(applying the identity to a *rendered clip* = T8):

1. **A single brand kit at `/app/brand`** (replacing the T1 placeholder) — a **partial honest port** of
   the reference editor (screen 12): **logo + brand colour + fonts only**.
2. **Real logo upload to R2**, reusing **B2's presigned-PUT path** verbatim (`r2.ts` `presignPut` +
   `assetUrlForKey` + `aws4fetch`) — **no new dependency**, the same R2 env + CORS already provisioned
   for B2. A real logo shows as an `<img>`; absent → an honest **"no logo yet — upload one"** (never a
   broken image).
3. **One brand colour stored** (hex) with **auto-contrast derived at read time** (a luminance helper, not
   a stored field).
4. **Curated fonts** picked from the renderable set (the Pressroom families already loaded) — **no font
   upload** (licensing/embedding).
5. **An honest identity preview** of the kit's own elements — the logo `<img>`, the brand-colour swatch
   + its derived contrast, and font specimens — all real. **The styled-clip application is the labeled
   T8 seam**; **no faked styled-clip / live-reskin preview**.

**The partial-port honesty — what is HIDDEN (not faked, not dead) and why** (FR-011, the port-completeness
rule). The reference editor depicts more than we can honestly build; each out-of-scope control is
**omitted**, with a documented reason:

| Reference control (screen 12) | Disposition | Why |
|---|---|---|
| **"Live preview · reskins live"** (a real customer clip restyled live) | **HIDDEN** | It is the **forbidden faked styled-clip preview** — the exact thing the fences ban. Replaced by the honest **T8 seam** label. |
| **Product media · B-roll cutaways** | **HIDDEN** | That is **B2's footage store** (shipped at `/app/footage`) — not this slice. |
| **Default music bed** | **HIDDEN** | A render-time capability we don't have → **T8**. |
| **Caption style · per format** | **HIDDEN** | A render-time styling capability → **T8**. |
| **Light & dark logos** | **DEFERRED** | Single logo in v1 (documented); light/dark is an additive later expansion. |
| **Multi-kit list (screen 11) + `/app/brand/[id]`** | **OUT (Q1:A)** | Single kit v1; multi-kit is additive UI later (the schema stays multi-row — see below). |

Hidden controls are **omitted entirely** (no dead/disabled stubs), consistent with the established
port-completeness rule ("don't render pictured controls that can't work yet").

**Schema — additive, naturally multi-row.** A **new `brand_kit` table** (migration `0003`, the first
schema change since B2's `0002`): workspace-scoped, `{ logoAssetUrl (nullable), brandColor, fonts,
name (nullable) }`. **No unique constraint on `workspaceId`** — the table is naturally multi-row so
**promoting to multiple kits later is additive UI, no migration**; v1 simply manages the workspace's
**single** kit (read the one row; `saveBrandKit` updates it if present, else inserts). **No change** to
existing tables, the consent model, `derived_asset`, `brand_asset`, or any read shape.

**Reused R2 — no new dependency.** The logo upload is the **same three-step flow as B2**: (1)
`presignBrandKitLogoUpload` validates an **image** type/size (a new image allowlist mirroring B2's
`ALLOWED_UPLOAD_TYPES`/`MAX_UPLOAD_BYTES` pattern) and signs a short-lived R2 PUT via `aws4fetch`; (2) the
**browser PUTs the bytes directly to R2**; (3) the kit persists `logoAssetUrl = assetUrlForKey(key)` on
Save. `r2.ts` gains only a small additive logo-key helper (its `presignPut`/`assetUrlForKey` are reused
unchanged). **Build stays green without R2 env** (the lazy `getConfig()` only throws on a live presign).

**Owned, consent-free (FR-019 / P-VII).** The brand kit is the **brand's own identity** — like B2's
footage, it **never** invokes the consent flow, holds no proof linkage, and the consent model is
untouched.

**Byte-stable.** `ProofCard`, the proof / clip / showcase / **consent** reads, `generateClip`,
`generateBatch`, and the **nav rail** (the `/app/brand` "Brand kits" destination already exists) are
**unchanged**. The kit is additive: the route + components, the `brand_kit` table + its reads/write, the
new `brand-kit.ts` lib, the logo-upload action (reusing B2's R2 path), and the additive `r2.ts` key
helper.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: **NONE NEW** — the logo upload reuses B2's `aws4fetch` R2 path; everything else
is Drizzle/Neon + the existing Pressroom fonts.

**Storage**: Neon Postgres + Drizzle (a new additive `brand_kit` table, migration `0003`) + **Cloudflare
R2** for the logo object (reusing B2's bucket/env/CORS).

**Testing**: manual quickstart validation on fixtures (project convention; no automated suite). Build
green via `npm run build` / `npm run lint` **without** `DATABASE_URL` and **without** R2 env.

**Target Platform**: Vercel (Next.js App Router). Heavy render (applying identity to a clip) stays off
Vercel — the T8 seam.

**Project Type**: Web application (single Next.js app, `src/`).

**Performance Goals**: the editor is one workspace-scoped read; the logo upload is a presign + a direct
browser→R2 PUT (bytes never transit the server); save is one upsert.

**Constraints**: owned identity only (FR-019, no consent); the styled-clip application is the labeled T8
seam (no faked preview — FR-006); reuse B2's R2 path (no new dep); consuming surfaces + nav rail
byte-stable.

**Scale/Scope**: workspace-scoped; one kit. One new lib, a new table + two reads/one write, two server
actions (presign + save), the route page + ~5 components, an additive `r2.ts` key helper, a seed addition.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Customer is the headline (P-II)**: PASS (by exception) — N/A in the customer-proof sense; the
      brand kit stores the *brand's* identity, shows no customer faces/quotes. When applied at T8, the
      customer stays the headline inside the clip; this slice only stores identity.
- [x] **Locked stack (P-III)**: PASS — Next.js / React / TS, Neon + Drizzle, **R2 via B2's existing
      `aws4fetch` path**. **No new dependency.** Heavy render stays off Vercel (T8 seam).
- [x] **Pressroom tokens (P-IV)**: PASS — the surface chrome is on-token; the kit's **own** colour/fonts
      are the brand's data shown as swatches/specimens (content), clearly distinct from the chrome.
      Persimmon stays on the one primary action (Save).
- [x] **Port, don't redesign (P-V)**: PASS — ports the logo/colour/fonts portions of screens 11/12/25;
      **hides** the out-of-scope controls (music bed, per-format caption style, B-roll, live-reskin
      preview) per the port-completeness rule; raises the multi-kit shape as Q1 (resolved A) rather than
      guessing.
- [x] **Fixtures-first (P-VI)**: PASS — the new table's fixture shape is the schema contract; the seed
      seeds colours + fonts + the honest **no-logo** state (no broken placeholder URL).
- [x] **Consent enforcement (P-VII)**: PASS (N/A) — owned brand data, **outside** the consent model
      (like B2). Never invokes consent; the consent model + reads are untouched.
- [x] **No editor (P-VIII)**: PASS — the brand-kit editor is a **settings form** (logo/colour/fonts
      pickers), not a clip timeline/track/scrubber. It edits identity data, not video.
- [x] **SDD scope (P-IX, P-XI)**: PASS — one slice: store + preview identity. No styled-clip render
      (T8), no music/caption/B-roll, no font upload, no multi-kit, no onboarding quickstart.
- [x] **Ambiguity handling (P-XII)**: PASS — the partial-port (what's hidden vs faked) is documented; the
      three forks were raised in the spec and resolved before planning.

**Definition of done (P-Governance)** — render on fixtures; handle empty (fresh kit / no logo), loading
(skeleton), and error (upload failure / save failure → honest message, no broken image) states;
responsive at `480 / 1024 / 1280`; Pressroom tokens exact; keyboard-accessible (pickers, upload, save);
pass acceptance criteria; build green without R2 env.

## Project Structure

### Documentation (this feature)

```text
specs/T5-brand-kit/
├── plan.md              # This file
├── research.md          # Phase 0 — the partial-port (hidden vs faked), reused R2 path, auto-contrast derive, curated fonts, multi-row schema
├── data-model.md        # Phase 1 — the additive brand_kit table + the BrandKitView + the upsert
├── quickstart.md        # Phase 1 — manual validation (colours/fonts persist, logo upload→<img>, no-logo honest, T8 seam, byte-stability)
├── contracts/
│   ├── brand-kit-reads-write.md   # getBrandKit / upsertBrandKit + the brand-kit.ts lib (fonts, validation, contrast)
│   └── logo-upload.md             # presignBrandKitLogoUpload + saveBrandKit (reusing B2's R2 path)
└── tasks.md             # Phase 2 (/speckit.tasks — NOT created here)
```

### Source Code (repository root) — additive; the brand page replaces its placeholder

```text
src/
├── lib/
│   ├── brand-kit.ts                       # NEW — client-safe: BrandKitView, FONT_OPTIONS (curated), DEFAULT_*, isHexColor, ALLOWED_LOGO_TYPES + MAX_LOGO_BYTES, contrastOn(hex) derive, result types
│   ├── brand-asset.ts                     # UNCHANGED (B2)
│   └── r2.ts                              # ADD a small brandKitLogoKey() helper; presignPut/assetUrlForKey reused UNCHANGED
├── db/
│   ├── schema.ts                          # ADD brand_kit table (migration 0003); existing tables untouched
│   ├── queries.ts                         # ADD getBrandKit() + upsertBrandKit(); existing reads byte-unchanged
│   └── seed.ts                            # ADD a brand_kit seed row (colours + fonts; NO logo — honest no-logo state)
├── app/app/brand/
│   ├── page.tsx                           # REPLACE the T5 SectionPlaceholder → Suspense + BrandKitData
│   ├── actions.ts                         # NEW — presignBrandKitLogoUpload() + saveBrandKit() (reuse B2's presign→PUT→persist flow)
│   ├── loading.tsx                        # NEW — skeleton fallback
│   └── error.tsx                          # NEW — shared <ErrorState> boundary
└── components/app/brand/
    ├── brand-kit-data.tsx                 # NEW (async Server) — getBrandKit; renders the editor (fresh defaults when none)
    ├── brand-kit-editor.tsx               # NEW (client) — the partial-port form: logo upload + brand colour + curated fonts + Save
    ├── brand-kit-logo-upload.tsx          # NEW (client) — the presign→browser-PUT widget (mirrors B2's upload widget); <img> on success, honest "no logo yet" otherwise
    ├── brand-kit-preview.tsx              # NEW — the honest identity preview (logo <img> / swatch + derived contrast / font specimens) + the labeled T8 seam
    └── brand-kit-skeleton.tsx             # NEW — loading skeleton
```

**Structure Decision**: Single Next.js app under `src/`. `/app/brand` (already a rail destination)
replaces its placeholder with the **single-kit editor** — no list, no `[id]` route. The logo upload
reuses B2's R2 path; the styled-clip application is the T8 seam (no faked preview).

## The auto-contrast derive & the curated fonts (honesty + reuse — full spec in contracts/)

- **Auto-contrast is DERIVED, not stored**: store one `brandColor` hex; a pure `contrastOn(hex)` helper
  (relative-luminance threshold → a readable on-colour, e.g. ink vs paper) computes the contrast at
  read/render time. The swatch shows the brand colour with its derived readable foreground — real, not a
  second stored field.
- **Curated fonts**: `FONT_OPTIONS` is a fixed list of the **renderable** families (the Pressroom set
  already loaded via `next/font` — Fraunces / Hanken Grotesk / JetBrains Mono, plus any embed-licensed
  additions). The kit stores the picks (e.g. a display + a body/caption role); specimens render the real
  fonts. **No font-file upload** (Q2:A).

## The honest identity preview vs the T8 seam (FR-004 vs FR-006)

The preview shows the kit's **own** elements — the logo `<img>` (or the honest no-logo state), the
brand-colour swatch + derived contrast, and font specimens — **all real**. A clearly-labeled panel states
the styled-clip application is the T8 seam: *"These style your rendered clips when rendering ships."*
There is **no** restyled customer-clip preview (the reference's live-reskin is hidden).

## Complexity Tracking

*No Constitution violations. No new dependency, no new gate, no new route (rail destination exists). The
one schema change is the additive `brand_kit` table (0003). Table omitted.*
