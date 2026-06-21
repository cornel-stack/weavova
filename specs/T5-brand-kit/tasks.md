---
description: "Task list for T5-BrandKit — store the brand's visual identity (logo, colour, fonts) so output looks like THEIR brand. A PARTIAL honest port of screen-12 (logo/colour/fonts only; the live-reskin preview / B-roll / music / per-format caption styles are HIDDEN, not faked). Logo upload REUSES B2's R2 presigned-PUT path (no new dep). Additive brand_kit table (0003). The styled-clip application is the labeled T8 seam."
---

# Tasks: T5-BrandKit — Brand kit (store the brand's visual identity)

**Input**: Design documents from `specs/T5-brand-kit/`
**Prerequisites**: plan.md, spec.md (US1–US3 + Q1:A / Q2:A / Q3:A folded, single logo v1), research.md
(§1 the partial-port hidden-vs-faked · §2 the reused R2 path · §3 multi-row schema · §4 derived
auto-contrast · §5 curated fonts · §6 confirmations), data-model.md (additive `brand_kit`, migration
`0003`), contracts/brand-kit-reads-write.md, contracts/logo-upload.md, quickstart.md.
**Constitution**: build against `.specify/memory/constitution.md` (current).
**Prerequisite slices** (all shipped): **T4-B2** (the R2 wiring — `src/lib/r2.ts` `presignPut` /
`assetUrlForKey`, `aws4fetch`, the `footage/actions.ts` presign→browser-PUT→persist flow, the
client-safe `brand-asset.ts` validation pattern — all REUSED here), T0.3 (schema/seed + `getCurrentWorkspace`),
T1 (the chrome + the `/app/brand` "Brand kits" rail destination — already present). **This slice makes its
FIRST schema change since `0002` (additive `0003`) and adds NO new dependency.**
**Tests**: NOT requested (no test runner). Verification via `npm run lint`/`build` (green **without**
`DATABASE_URL` **and without** R2 env) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented, installed,
> or run. Execution happens in `/speckit.implement` AFTER human approval. **At implementation, leave
> EVERYTHING uncommitted** — no per-task commits, no branch, no push/merge. Cornel reviews and commits
> manually (mirrors prior slices).

> **⛔ RATIFIED DECISIONS (research.md):** **Q1:A** single kit per workspace (`/app/brand`, **no** list /
> `[id]`) · **Q2:A** curated fonts (no upload) · **Q3:A** one brand colour + **derived** auto-contrast ·
> **single logo v1** (light/dark deferred) · **NO new dependency** (reuse B2's R2 path) · **additive
> schema only** (`brand_kit`, `0003`) · `/app/brand` rail destination already exists (no nav change).

> **PARTIAL HONEST PORT (P-V / port-completeness rule / FR-011):** port **logo + brand colour + fonts**
> from screen 12. **HIDE — omit entirely, NOT faked, NOT dead-stubbed:** the **"live preview · reskins
> live"** (the forbidden faked styled-clip preview → replaced by the honest **T8 seam** label),
> **B-roll cutaways** (= B2's footage store, `/app/footage`), **default music bed** + **per-format caption
> styles** (= T8 render capabilities), the **multi-kit list (screen 11) + `/app/brand/[id]`** (Q1:A), and
> **light/dark logos** (single logo v1).

> **OWNED, CONSENT-FREE (FR-019 / P-VII):** the brand kit is the brand's own identity (like B2's footage)
> — it NEVER invokes the consent flow and the consent model is untouched.

> **THE T8 SEAM:** storing the identity is real + buildable now; **applying it to STYLE a rendered clip is
> T8** — labeled honestly ("will style your rendered clips when rendering ships"). **No faked
> styled-clip / live-reskin preview** anywhere.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US3 on user-story tasks; Setup/Foundational/Polish carry no story label.
- **[INFRA·Cornel]**: a Cornel-owned task — NOT code (R2 infra was already provisioned for B2; noted for completeness).
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (the no-dep guard + the additive schema + the owned lib)

- [X] T001 [P] **ZERO-dependency guard (no install).** Confirm the slice installs **nothing** — the logo
  upload reuses B2's `aws4fetch` R2 path; everything else is Drizzle/Neon + the existing Pressroom fonts.
  **Do NOT run `npm install`.** `package.json` + `package-lock.json` MUST be unchanged (verified in T018).
  → research §6 (P-III)
- [X] T002 [P] **Additive schema — the `brand_kit` table** in `src/db/schema.ts` (ADD only; mirror the
  `brand_asset` table style): `brandKit` table — `id` uuid pk, `workspaceId` → workspace **cascade**,
  `name` text (nullable), `logoAssetUrl` text (nullable), `brandColor` text notNull, `fonts` jsonb
  notNull, `createdAt`, `updatedAt`; index `brand_kit_ws_idx` on `(workspaceId)`. **NO unique constraint
  on `workspaceId`** (naturally multi-row → multi-kit later is additive UI, no migration). **Zero edits to
  `workspace`/`source`/`proof`/`consent`/`derivedAsset`/`brandAsset`/`proofBrandAsset`.** Per data-model.md.
  → FR-009 (SC: additive)
- [X] T003 [P] **The owned brand-kit lib** in NEW `src/lib/brand-kit.ts` (client-safe; **type-only** enum
  imports, the `clip.ts`/`brand-asset.ts` idiom; no DB code). Define: **`FontKey`** + **`FONT_OPTIONS`**
  (curated, render-available families — the Pressroom set Fraunces/Hanken/JetBrains via their loaded
  `next/font` CSS vars) + **`DEFAULT_FONTS`** + `isValidFontKey`; **`BrandKitFonts`** + **`BrandKitView`**
  (`id`, `name|null`, `logoAssetUrl|null`, `brandColor`, `fonts` — **NO contrast field**);
  **`DEFAULT_BRAND_COLOR`** + `isHexColor`; **`contrastOn(hex): string`** (pure relative-luminance → a
  readable on-colour — the **DERIVED** auto-contrast, not stored); **`ALLOWED_LOGO_TYPES`** (png/jpeg/
  svg+xml/webp) + **`MAX_LOGO_BYTES`** (~5 MB) + `isAllowedLogoType` (mirrors B2's `brand-asset.ts`);
  result types `LogoPresignResult` / `SaveBrandKitResult`. Owned identity only — no consent, no metric.
  → FR-002, FR-004, FR-019 (Q2:A, Q3:A, research §4/§5)
- [X] T004 [INFRA·Cornel] **R2 env + CORS — ALREADY PROVISIONED (no action).** The brand-kit logo reuses
  B2's bucket/env (`R2_ACCOUNT_ID`/…/`R2_PUBLIC_BASE_URL`) + the browser-PUT CORS already set for B2. **No
  new infra.** The build is green without these; only the live logo upload (T015/quickstart) needs them.
  → research §2 (SC-005)

**Checkpoint**: no dependency; the additive `brand_kit` schema + the owned lib exist; R2 infra is reused.
No migration applied, no UI yet.

---

## Phase 2: Foundational (migration + reads/write + the reused R2 logo path — BLOCKS the UI)

**⚠️ CRITICAL**: owned brand data — NO consent call anywhere. `r2.ts` `presignPut`/`assetUrlForKey` are
**reused unchanged**; existing reads/tables are byte-stable.

- [X] T005 **Generate + review the additive migration**: `npx drizzle-kit generate` → `drizzle/0003_*.sql`.
  **Assert it contains ONLY** `CREATE TABLE brand_kit` + its index — **zero `ALTER`/`DROP`** on existing
  tables (read the SQL before any `migrate`). `drizzle/meta/` snapshot updates expected. (Apply with
  `drizzle-kit migrate` only against a DB; not required for the green build.) → FR-009
- [X] T006 [P] **Additive reads/write** in `src/db/queries.ts` (`withDbRetry` for the read; ADD only):
  **`getBrandKit(workspaceId): Promise<BrandKitView | null>`** — the workspace's single kit (`limit 1`),
  fonts parsed from jsonb; null if none. **`upsertBrandKit(workspaceId, { name, logoAssetUrl, brandColor,
  fonts })`** — read-then-write upsert (update the existing row + `updatedAt`, else insert; **no
  `onConflict`/unique key** — keeps multi-kit open); single-attempt write; returns `BrandKitView`. **Do
  NOT touch any existing read** or the consent/brand-asset functions. → FR-002, FR-009 (research §3)
- [X] T007 [P] **Reuse B2's R2 path — the additive key helper** in `src/lib/r2.ts`: ADD
  **`brandKitLogoKey(workspaceId): string`** (a key under a `brand-kit/` prefix). **`presignPut` /
  `assetUrlForKey` are reused UNCHANGED** (do not edit them). No new dependency. → FR-003 (research §2)
- [X] T008 **The logo-upload + save server actions** in NEW `src/app/app/brand/actions.ts` (`"use server"`):
  **`presignBrandKitLogoUpload({ contentType, sizeBytes })`** — resolve workspace via `getCurrentWorkspace()`
  (never client); **server-validate the image** (`isAllowedLogoType` + `sizeBytes ≤ MAX_LOGO_BYTES`) →
  invalid → `{status:'invalid',reason}`; else `key = brandKitLogoKey(ws.id)`, `uploadUrl = presignPut({key,
  contentType})` → `{status:'ok',uploadUrl,key}`. **`saveBrandKit({ name, brandColor, fonts, logoKey })`** —
  re-resolve workspace, **re-validate** (`isHexColor`, both fonts via `isValidFontKey`, name cap); resolve
  `logoAssetUrl` = `assetUrlForKey(logoKey)` when a fresh key is provided else keep the existing kit's logo;
  `upsertBrandKit(...)`; `revalidatePath('/app/brand')`; return `{status:'saved',kit}` | `invalid` | `error`.
  **Consent flow is never invoked.** → FR-003, FR-007, FR-008 (A-11, P-VII, research §2)

**Checkpoint**: migration is additive-only; the reads/write + the two actions exist (reusing B2's R2 path);
`queries.ts`/`r2.ts` only GAINED functions; consent/brand-asset/existing reads untouched. No UI yet.

---

## Phase 3: User Story 1 — Set colours + fonts, see the real identity preview (Priority: P1) 🎯 MVP

**Goal**: `/app/brand` lets the owner pick + persist the brand colour and curated fonts and shows a real
identity preview (swatch + derived contrast + font specimens). Fully real, no upload dependency.
**Independent test**: open `/app/brand`; pick a colour + fonts; Save; reload → persists; the preview shows
the real swatch (with derived contrast) + font specimens.

- [X] T009 [US1] **Replace the placeholder route** `src/app/app/brand/page.tsx` — drop `SectionPlaceholder`;
  render `Suspense` + `BrandKitData` (the spine pattern). Add `src/app/app/brand/loading.tsx` (skeleton) +
  `src/app/app/brand/error.tsx` (shared `<ErrorState>`). → FR-001 (P-Governance states)
- [X] T010 [US1] **The data integrator + skeleton** — NEW `src/components/app/brand/brand-kit-data.tsx`
  (async Server): `getBrandKit(workspaceId)`; render `BrandKitEditor` seeded with the kit (or
  `DEFAULT_BRAND_COLOR`/`DEFAULT_FONTS`/no-logo when none — an honest fresh kit, never fabricated). Add NEW
  `brand-kit-skeleton.tsx`. → FR-001, FR-019
- [X] T011 [US1] **The editor (colour + fonts + Save)** — NEW `src/components/app/brand/brand-kit-editor.tsx`
  (`"use client"`): the **partial-port** form — a **brand-colour** picker (hex; `isHexColor`) and a
  **curated font** picker (`FONT_OPTIONS`, display + body roles), plus a **Save** (persimmon primary) that
  calls `saveBrandKit` and reports honest saved/invalid/error (A-11 — persists). **Omit entirely** the
  hidden controls (music bed, per-format caption style, B-roll, live-reskin, multi-kit) — render nothing,
  no dead stubs (FR-011). Pressroom chrome on-token; the kit's own colour/fonts are content. → FR-002,
  FR-007, FR-011 (A-11)
- [X] T012 [US1] **The honest identity preview** — NEW `src/components/app/brand/brand-kit-preview.tsx`:
  the kit's **own** elements — the **brand-colour swatch with its `contrastOn`-derived** readable
  foreground and **font specimens** of the picked fonts (real, renderable). A clearly-labeled **T8 seam**
  panel: "These style your rendered clips when rendering ships." **NO** restyled customer-clip / live-reskin
  preview. (The logo slot is added in US2.) → FR-004, FR-006 (FR-019, P-XII)

**Checkpoint**: US1 is independently shippable — colours + fonts persist and the real preview renders (MVP),
no R2 dependency.

---

## Phase 4: User Story 2 — Upload the brand logo (real image to R2) (Priority: P1)

**Goal**: upload a logo (browser PUTs direct to R2 via B2's path); show it as a real `<img>`; absent → an
honest "no logo yet — upload one" (never broken).
**Independent test**: with R2 provisioned, upload a valid image → stored + shown as `<img>` + Save persists;
no logo → the honest empty state; invalid file → honest rejection.

- [X] T013 [US2] **The logo-upload widget** — NEW `src/components/app/brand/brand-kit-logo-upload.tsx`
  (`"use client"`, mirrors B2's upload widget): client-validate (`isAllowedLogoType` + size) → call
  `presignBrandKitLogoUpload` → on `ok` the **browser PUTs the file directly to R2** (`fetch(uploadUrl,
  {method:'PUT', body:file, headers:{'Content-Type':contentType}})`, bytes never transit the server) → on
  success show the logo as a real **`<img>`** (from the R2 public URL) and surface the `key` to the editor
  form (so Save persists `logoAssetUrl`). Absent → the honest **"no logo yet — upload one"** state;
  invalid/failed → an honest inline error preserving the prior state. **NEVER a broken `<img>`.** → FR-003,
  FR-005, FR-007 (A-11, research §2)
- [X] T014 [US2] **Wire the logo into the editor + preview**: in `brand-kit-editor.tsx` mount
  `BrandKitLogoUpload` and thread the uploaded `logoKey` into the `saveBrandKit` call; in
  `brand-kit-preview.tsx` render the logo `<img>` when `logoAssetUrl` is present, else the honest no-logo
  state. The whole kit (logo + colour + fonts) persists on Save. → FR-003, FR-004, FR-005
- [X] T015 [US2] **Seed the kit honestly** in `src/db/seed.ts` (ADD only): seed one `brand_kit` row for the
  demo workspace with a real **brandColor + fonts** and **`logoAssetUrl = null`** (the honest no-logo state)
  — **do NOT** seed a placeholder logo URL that would render broken. → FR-005 (P-VI)

**Checkpoint**: the logo genuinely uploads to R2 (B2's path, no new dep) and displays as `<img>`; absent is
honest; the full kit persists.

---

## Phase 5: User Story 3 — Owned, reusable, consent-free (Priority: P2)

**Goal**: the kit is owned brand data — no consent flow — workspace-scoped and reusable.
**Independent test**: creating/saving never invokes consent; the kit returns on a later visit.

- [X] T016 [US3] **Owned/consent-free verification**: confirm by construction that nothing in
  `brand-kit.ts` / `queries.ts` (`getBrandKit`/`upsertBrandKit`) / `brand/actions.ts` references the
  `consent` model, `effectiveConsentState`, or `getGrantedConsentId`; the kit is workspace-scoped and
  reusable (returns via `getBrandKit` on a later visit). Document in the quickstart (T019). → FR-008
  (FR-019, P-VII)

**Checkpoint**: the kit is provably owned, consent-free, and reusable.

---

## Phase 6: Polish & Cross-Cutting (Definition of Done)

- [X] T017 [P] **States & a11y**: fresh kit (defaults) + no-logo honest state; upload failure / save
  failure → honest message (no broken image, no fabricated success); the build-green-without-R2 path (a
  presign without creds fails honestly, the rest of the editor still works); keyboard reach + visible
  focus on the colour picker, font picker, upload, and Save; responsive `480 / 1024 / 1280`. → spec Edge
  Cases (P-Governance DoD)
- [X] T018 [P] **Byte-stability + no-dep audit** (diff review): NO change to `ProofCard`, the proof / clip
  / showcase / **consent** reads, `generateClip` / `generateBatch`; `r2.ts` `presignPut` / `assetUrlForKey`
  and B2's `brand-asset.ts` / `footage/actions.ts` **unchanged** (only the additive `brandKitLogoKey`);
  nav rail (`src/lib/nav.ts`) unchanged (`/app/brand` already present); the migration is **additive**
  (`0003` CREATE brand_kit only, zero ALTER on existing tables); `git diff package.json package-lock.json`
  shows **NO new dependency**. → FR-009, FR-010 (P-V)
- [X] T019 **Green build, no env + quickstart walkthrough**: `npm run lint` + `npm run build` green
  **without** `DATABASE_URL` and **without** R2 env (CI parity — `getDb()`/`getConfig()` lazy); then walk
  `specs/T5-brand-kit/quickstart.md` — colours/fonts persist, logo → `<img>` / no-logo honest, the T8 seam
  (no faked preview), hidden controls absent, owned/consent-free. → all SC (P-III)

---

## Dependencies & execution order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **Phase 3 (US1)** → **Phase 4 (US2)** →
  **Phase 5 (US3)** → **Phase 6 (Polish)**.
- **Phase 2 BLOCKS the UI** — US1's editor (T011) needs `getBrandKit` (T006) + `saveBrandKit` (T008); US2's
  widget (T013) needs `presignBrandKitLogoUpload` (T008) + `brandKitLogoKey` (T007).
- **US1 (P1)** is the **MVP** (colours + fonts + preview, no R2 dependency) and is independently shippable.
- **US2 (P1)** adds the logo (R2 reuse); it extends `brand-kit-editor.tsx` + `brand-kit-preview.tsx` (built
  in US1) — sequential on those files.
- **US3 (P2)** is a construction verification; depends only on Phase 2.
- **Polish (Phase 6)** runs last (audits need all code present).

## Parallel opportunities

- **Setup**: T001 ‖ T002 ‖ T003 (different files).
- **Foundational**: T006 (queries) ‖ T007 (r2 helper) are different files; T008 (actions) needs both; T005
  (migration) follows T002.
- **US1**: T009 (route) ‖ T010 (data+skeleton) then T011 (editor) → T012 (preview).
- **US2**: T013 (widget) then T014 wires it into the US1 editor/preview; T015 (seed) is independent ‖.
- **Polish**: T017 ‖ T018 are independent audits; T019 runs after.

## Implementation strategy (MVP first)

1. **MVP = Phase 1 + Phase 2 + Phase 3 (US1)** — colours + fonts persist + the real identity preview, with
   **no** R2 dependency. Independently demoable.
2. **+ Phase 4 (US2)** adds the real logo upload (reusing B2's R2 path) + honest no-logo state.
3. **+ Phase 5 (US3)** verifies owned/consent-free + reusable.
4. **+ Phase 6** finalizes states, byte-stability, zero-dep, and the env-free green build.

**Total: 19 tasks** — Setup 4 (incl. 1 INFRA·Cornel no-op) · Foundational 4 · US1 4 · US2 3 · US3 1 ·
Polish 3.
