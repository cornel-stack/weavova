---
description: "Task list for T4-B2 — Brand-asset store: reusable workspace-scoped store of brand-OWNED clips (real R2 presigned upload via aws4fetch) attachable many-to-many to proof; additive schema 0002; honest T8 seam"
---

# Tasks: T4-B2 — Brand-asset store (reusable owned footage, attachable to proof)

**Input**: Design documents from `specs/T4-B2-brand-asset-store/`
**Prerequisites**: plan.md, spec.md (US1–US4 + Q1–Q3 resolved), research.md (§1–§4, **ratified**:
1a presigned PUT browser→R2 · 1b **aws4fetch** · 2 palette + inline entry, rail byte-stable), data-model.md
(`0002` additive), contracts/server-actions-and-reads.md, quickstart.md.
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Prerequisite slices**: T0.3 (schema/seed + `getCurrentWorkspace` seam), T2.3 (proof detail —
`getProof`/`getProofClips`, `ProofDetail`), T2.4b/T4-B1 (the studio + `generateClip`/`generateBatch` the seam
stays clear of), T3.1 (Library route-shell pattern this derives from), T1 (the chrome + command palette) — all
shipped. **This slice makes its FIRST schema change since T2.4a (additive `0002`) and adds its FIRST new
dependency since T0 (`aws4fetch`).**
**Tests**: NOT requested (no test runner). Verification via `npm run typecheck`/`lint`/`build` (green **without**
`DATABASE_URL` **and without** R2 env) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented, scaffolded,
> installed, or run. Execution happens in `/speckit.implement` AFTER human approval.
> **At implementation, leave EVERYTHING uncommitted** — no per-task commits, no branch, no push/merge. Cornel
> reviews and commits manually (mirrors the prior slices).

> **⛔ RATIFIED DECISIONS carried in (research.md):** **1a** upload = **presigned PUT, browser→R2** (bytes
> never transit Vercel); **1b** the **one new dependency = `aws4fetch`** (tiny SigV4 signer); **2** the
> derived store route is reached via the **command palette + an inline link from the attach picker** — the
> **nav rail (`src/lib/nav.ts`/`app-rail.tsx`) stays byte-stable**. Store route = **`/app/footage`** (distinct
> from `/app/brand` = T5 Brand kits).

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US4 on user-story tasks; Setup/Foundational/Polish carry no story label.
- **[INFRA·Cornel]**: a Cornel-owned provisioning task — **NOT code**, **NOT done by the implementer**.
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (the one new dep, the additive schema, the owned view shapes, the infra prereqs)

- [X] T001 [P] **Install the ONE new dependency: `aws4fetch`** (the first new runtime dep since T0 — the
  ratified 1b decision; a ~6–7 kB SigV4 signer used only to sign the presigned R2 PUT). `npm install
  aws4fetch`; confirm it lands in `package.json` `dependencies` + `package-lock.json` and **nothing else** is
  added. → research.md §1b (P-III)
- [X] T002 [P] **Additive schema** in `src/db/schema.ts` (ADD only; import `uniqueIndex` alongside `index`):
  `brandAssetKindEnum = pgEnum("brand_asset_kind", ["product","broll"])`; `brandAsset` table (`id`,
  `workspaceId`→workspace cascade, `kind`, `label` text notNull, `assetUrl` text notNull, `createdAt`) with
  `brand_asset_ws_created_idx`; `proofBrandAsset` join (`id`, `workspaceId`→cascade, `proofId`→proof cascade,
  `brandAssetId`→brandAsset cascade, `createdAt`) with **`uniqueIndex("proof_brand_asset_unique")` on
  `(proofId, brandAssetId)`** + `proof_brand_asset_proof_idx` + `proof_brand_asset_brand_asset_idx`. **Zero
  edits to `workspace`/`source`/`proof`/`consent`/`derivedAsset`.** Per data-model.md. → FR-012 (SC-007)
- [X] T003 [P] **Owned view shapes** in NEW `src/lib/brand-asset.ts` (type-only enum import, mirrors
  `src/lib/clip.ts`): `BrandAssetKind`; `BrandAssetView { id; kind; label; assetUrl; createdAt }`;
  `ProofBrandAssetView extends BrandAssetView { attachmentId; attachedAt }`. **Owned fields only — no
  view/reach/engagement, no proof framing.** → FR-011 (FR-019)
- [ ] T004 [INFRA·Cornel] **Provision R2 env vars (NOT code).** Add to `.env.local` (local) **and** Vercel
  (Preview + Production) the keys the presign/record need: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL` (and rely on the derived S3 endpoint
  `https://<account_id>.r2.cloudflarestorage.com`). The implementer only adds the **key names** to
  `.env.example` (T007). **The build is GREEN without these** (lazy client, T007); **only the live-upload walk
  (T015/quickstart) needs them.** → research.md §1c (SC-001)
- [ ] T005 [INFRA·Cornel] **Configure the R2 bucket CORS policy (NOT code)** to permit browser **PUT** (and
  the preflight) from the app origins (`http://localhost:3000` + the Vercel preview/prod domains).
  Documented in quickstart.md "Prerequisites". Without it, the direct browser→R2 PUT (T015) fails CORS — the
  build/typecheck still pass. → research.md §1a/§1c (SC-001)

**Checkpoint**: the dep is in, the additive schema + owned shapes exist, and the (Cornel-owned) R2 infra is
named and separated from code. No migration applied, no UI, no actions yet.

---

## Phase 2: Foundational (migration + the R2 lib + reads/writes + server actions — BLOCKS all UI)

**⚠️ CRITICAL**: brand-asset reads/writes/actions sit **OUTSIDE** the consent model; the generation gate
(`getGrantedConsentId`) is **not touched** by anything here.

- [X] T006 **Generate + review the additive migration**: `npx drizzle-kit generate` → `drizzle/0002_*.sql`.
  **Assert it contains ONLY** `CREATE TYPE brand_asset_kind`, `CREATE TABLE brand_asset`, `CREATE TABLE
  proof_brand_asset`, and their indexes — **zero `ALTER`/`DROP`** on existing tables (read the SQL before any
  `migrate`). `drizzle/meta/` snapshot updates are expected. (Apply with `drizzle-kit migrate` only against a
  DB; not required for the green build.) → FR-012 (SC-007)
- [X] T007 **Create `src/lib/r2.ts`** (the first real R2 wiring; `SAMPLE_CLIP_URL` stays the separate stub
  seam): a **lazily-constructed** R2 config reading the T004 env (mirror `getDb()` so typecheck/lint/build are
  green **without** creds); `ALLOWED_TYPES` (`video/mp4`,`video/quicktime`,`video/webm`) + `MAX_BYTES` (~100
  MB) constants; a **`presignPut({ key, contentType })`** helper that uses **`aws4fetch`** to produce a
  short-lived signed PUT URL against the R2 S3 endpoint (signing the exact content-type); an `assetUrl(key)`
  builder from `R2_PUBLIC_BASE_URL`. Add the env **key names** to `.env.example`. → research.md §1a/§1b/§1c
  (SC-001, SC-010)
- [X] T008 [P] **Additive reads** in `src/db/queries.ts` (`withDbRetry`-wrapped, workspace-scoped, ADD only):
  `getBrandAssets(workspaceId): BrandAssetView[]` (newest first via `brand_asset_ws_created_idx`);
  `getProofBrandAssets(workspaceId, proofId): ProofBrandAssetView[]` (join ⨝ brand_asset). **Do NOT edit any
  existing read** or `getGrantedConsentId`/`insertDerivedAsset`. → FR-001, FR-011 (SC-007)
- [X] T009 [P] **Additive writes** in `src/db/queries.ts` (single-attempt, D4 — not retry-wrapped):
  `createBrandAsset({ workspaceId, kind, label, assetUrl }): BrandAssetView`;
  `attachBrandAsset({ workspaceId, proofId, brandAssetId })` — **idempotent** via the unique index (on
  conflict do nothing / detect already-attached); `detachBrandAsset({ workspaceId, proofId, brandAssetId })`
  — deletes the **join row only**. **No consent reference anywhere in these.** → FR-005, FR-006, FR-009
  (P-VII, data-model.md)
- [X] T010 **Store-route server actions** in NEW `src/app/app/footage/actions.ts` (`"use server"`):
  **`presignBrandAssetUpload({ kind, label, contentType, sizeBytes })`** — resolve workspace via
  `getCurrentWorkspace()` (never client); **server-validate** `kind ∈ {product,broll}`, `label` non-empty +
  capped, `contentType ∈ ALLOWED_TYPES`, `sizeBytes ≤ MAX_BYTES` → invalid → `{status:'invalid',reason}` (no
  presign); else return `{status:'ok',uploadUrl,key}` via `r2.presignPut`. **`createBrandAsset({ kind, label,
  key })`** — re-resolve workspace, re-validate, build `assetUrl`, single-attempt `createBrandAsset` insert,
  then `revalidatePath('/app/footage')`; return `{status:'created',asset}` | `invalid` | `error`. **Consent
  flow is never invoked.** → contracts §presign/create; FR-002, FR-003, FR-004 (P-VII)
- [X] T011 **Attach/detach server actions** in NEW `src/app/app/proof/[id]/actions.ts` (`"use server"`):
  **`attachBrandAsset({ proofId, brandAssetId })`** + **`detachBrandAsset({ proofId, brandAssetId })`** —
  resolve workspace server-side, verify both ids belong to it (no cross-tenant), call the T009 writes,
  `revalidatePath('/app/proof/${proofId}')`; return honest `attached`/`already_attached`/`detached`/`error`.
  **No `getGrantedConsentId` call, no consent prompt** — attaching owned footage is consent-free; the
  generation gate is untouched. → contracts §attach/detach; FR-005, FR-006 (P-VII)

**Checkpoint**: migration is additive-only; `r2.ts` signs presigned PUTs via aws4fetch (lazy, green without
creds); workspace-scoped reads/writes + four server actions exist, all OUTSIDE the consent model;
`queries.ts` only GAINED functions; `generateClip`/`generateBatch`/existing reads untouched. No UI yet.

---

## Phase 3: User Story 1 — Upload a clip into the reusable store (Priority: P1) 🎯 MVP

**Goal**: a dedicated `/app/footage` store where the owner uploads their own clip → real R2 → a labeled owned
asset that persists and is reusable; honest `uploading/stored/failed` states + validation.
**Independent Test**: upload a valid `.mp4` → uploading→stored, persists, in R2, clearly owned (not proof);
invalid type/oversize rejected before any write; failed PUT shows honest failed + retry (quickstart §6–10).

- [X] T012 [US1] **Derived store route shell** `src/app/app/footage/page.tsx` (Server Component; **port the
  `src/app/app/library/page.tsx` pattern**): resolve workspace via `getCurrentWorkspace()`, `Suspense` +
  skeleton, stream the data integrator. **Comment it as a DERIVED surface** (no `/design-reference` screen —
  T3.2 precedent). Inherits `/app` force-dynamic + AppChrome. → FR-001, P-V (research.md §3)
- [X] T013 [US1] **Data integrator** `src/app/app/footage/footage-data.tsx` (async Server): one workspace-
  scoped `getBrandAssets` read inside the boundary; render the store list (or empty state). → FR-001
- [X] T014 [US1] **Store list + owned asset card + empty + skeleton** in `src/components/app/brand-assets/`
  (port the Library card-grid pattern): each card shows the **kind chip (`product`/`broll`) + the free label**
  and is **honestly the brand's own footage** — **never** the verified-customer mark, **never** a proof
  framing; empty state = "no brand footage yet — upload one" + the upload affordance (no fake/sample card). →
  FR-001, FR-011 (FR-019, P-V)
- [X] T015 [US1] **Upload widget (client island)** in `src/components/app/brand-assets/` driving the ratified
  **presigned-PUT flow**: a file input `accept`=ALLOWED_TYPES + a label + kind picker; **client-validate**
  type+size before requesting a presign; call `presignBrandAssetUpload` → on `ok`, **browser `PUT`s the file
  directly to R2** (with progress) → on 2xx, call `createBrandAsset(key,…)`. Drive an honest state machine
  **`idle → uploading → stored | failed`** (validation reject, PUT error, or record-row error → `failed`,
  **retryable**, never shown as stored). → FR-002, FR-003, FR-004 (A-11, research.md §1)
- [X] T016 [US1] **Command-palette entry (rail untouched)** in `src/components/app/command-palette.tsx`: add a
  `ACTIONS` item (e.g. "Brand footage" / "Upload footage" → `/app/footage`). **Do NOT touch `src/lib/nav.ts`
  or `app-rail.tsx`** — the 8-destination ported rail stays byte-stable (ratified decision 2). → research.md
  §2 (P-V)

**Checkpoint**: `/app/footage` lists owned assets (empty state honest), a real upload runs presign→browser-
PUT→record with honest states + validation, and the route is reachable from the palette — rail unchanged.

---

## Phase 4: User Story 2 — Attach brand assets to a proof (many-to-many) + detach (Priority: P1)

**Goal**: from proof detail, attach assets from the store (one asset→many proofs, one proof→many assets) and
detach; associations persist; **no delete-from-store** (named deferral).
**Independent Test**: attach to proof A, attach same asset to proof B, second asset to A; re-attach is no
duplicate; detach from A leaves the asset + B's attachment intact (quickstart §11–14).

- [X] T017 [US2] **Additive read wiring** in `src/components/app/proof-detail/proof-detail-data.tsx`: add a
  `getProofBrandAssets(workspaceId, id)` read and pass it to `ProofDetail`. **`getProof`/`getProofClips` and
  their view shapes stay byte-stable** (separate read, like `getProofClips` was). → FR-005 (SC-007)
- [X] T018 [US2] **Additive section** in `src/components/app/proof-detail/proof-detail.tsx`: render an
  honestly-labeled **"Attached brand assets"** section (extended props; existing screen-03 layout intact). The
  **customer quote/face stays the largest, warmest element** — the section is quiet, secondary supporting
  context. → FR-005, P-II
- [X] T019 [US2] **Section + attach picker + detach (client island)** in
  `src/components/app/proof-detail/attached-brand-assets/`: list attached assets (owned-labeled supporting
  context — never proof); an **attach picker** over the store (`getBrandAssets`) → `attachBrandAsset`
  (idempotent → "already attached", no dup); a **detach** control → `detachBrandAsset` (removes that proof's
  association only). Include the ratified **inline "Manage / upload footage" link → `/app/footage`**. **NO
  delete-from-store control — leave a code comment naming it the Q2:A conscious deferral (block-while-attached
  + R2 object cleanup, later).** → FR-005, FR-006, FR-011 (FR-019, Q2:A)

**Checkpoint**: proof detail shows the additive attached-assets section; attach/detach persist and are
many-to-many + idempotent; the store is reachable inline; no delete-from-store exists (named deferral);
`getProof`/`getProofClips` byte-stable.

---

## Phase 5: User Story 3 — Honest about the T8 composite (Priority: P1)

**Goal**: the attachment states honestly the asset **"will appear in the rendered clip when rendering ships
(T8)"**; clip output is unchanged; **no fake combined preview**.
**Independent Test**: attach to a granted proof, generate a clip → still the honest sample/preview, asset not
composited; the section shows the deferred T8 label, no combined preview anywhere (quickstart §15–16).

- [X] T020 [US3] In the attached-assets section (T019), render the **honest deferred T8 seam**: an explicit
  "will be included when rendering ships (T8)" state (mirroring the non-playing "Sample preview" framing) —
  **no fabricated composited/combined-output preview**, **no** claim the asset is already in the output, **no**
  retro-claim over already-made sample clips. → FR-007 (A-11, FR-019, research.md §4)
- [X] T021 [US3] **Generation-unchanged verification**: confirm an attached asset does **not** alter
  `generateClip` (`src/app/app/proof/[id]/studio/actions.ts`) or `generateBatch`
  (`src/app/app/proof/actions.ts`) — they still write `derived_asset` pointing at `SAMPLE_CLIP_URL`; **no new
  branch reads `proof_brand_asset` during generation**. → FR-008 (SC-004)

**Checkpoint**: the T8 composite is an honest labeled seam only; clip generation byte-unchanged.

---

## Phase 6: User Story 4 — Consent stays the sole gate; brand assets sit outside it (Priority: P1)

**Goal**: upload/attach/detach never invoke customer consent; attaching to a withdrawn proof still cannot
generate; the existing gate + cascade are untouched.
**Independent Test**: attach to a non-granted proof (no consent prompt, attach succeeds) → generation still
blocked → 0 clips; withdraw a granted proof with attachments → existing cascade unchanged (quickstart §17–19).

- [X] T022 [US4] **P-VII sovereignty verification**: confirm (a) `presign`/`create`/`attach`/`detach` create
  **0** consent rows/versions and show **0** consent prompts (brand assets outside the model); (b) a proof
  whose effective consent is **not granted**, with an asset attached, still yields **0** clips — the **sole**
  gate is `getGrantedConsentId` in `generateClip`/`generateBatch`, **unchanged**, asset attached or not; (c)
  the `derived_asset` withdrawal cascade + read-time filters are unchanged by this slice. → FR-009, FR-010
  (P-VII, SC-006)

**Checkpoint**: brand assets never touch consent; the generation gate is unchanged and remains the only gate.

---

## Phase 7: Polish, seed & Definition of Done (audits + green build)

- [X] T023 [P] **Seed** `src/db/seed.ts` (ADD only): a couple of sample **owned brand assets** (`product` +
  `broll`, with `assetUrl` placeholders clearly distinct from `SAMPLE_CLIP_URL`) + 1–2 `proof_brand_asset`
  attachments, clearly owned, **never** counted/shown as proof. Existing seed rows unchanged. → FR-006
  (P-VI, FR-019)
- [X] T024 [P] **FR-019 audit (never proof)**: brand assets appear in **0** proof counts, the inbox, and the
  showcase proof set; the asset card uses **owned fields only** and **never** the verified-customer mark or a
  proof framing; the store + section are the only places they surface, always labeled owned. → FR-011 (FR-019,
  SC-005)
- [X] T025 [P] **A-11 audit**: upload + attach + detach genuinely persist; the **only** deferred thing is the
  **labeled T8 composite** (no fake combined preview); **0** dead controls; **0** delete-from-store control
  (named deferral). → FR-007 (A-11, SC-009)
- [X] T026 [P] **P-VIII audit (no editor)**: the slice is **attach only** — confirm **0** timeline/track/
  trim/scrubber/sequence/compositor controls anywhere. → FR-015 (P-VIII, SC-009)
- [X] T027 [P] **Byte-stable + dep gate**: `src/components/proof-card.tsx` **byte-identical**;
  `src/lib/proof.ts` (`ProofView`/`ProofCardProps`/`ProofDetailView`), `src/lib/clip.ts`, `src/lib/showcase.ts`
  shapes **unchanged**; `src/db/queries.ts` **only GAINED** `getBrandAssets`/`getProofBrandAssets`/
  `createBrandAsset`/`attachBrandAsset`/`detachBrandAsset` (every existing read + `getGrantedConsentId`/
  `insertDerivedAsset` byte-identical); `generateClip` + `generateBatch` **unchanged**; **`src/lib/nav.ts` +
  `app-rail.tsx` byte-identical** (rail unchanged); the **only** new dependency is **`aws4fetch`**;
  `SAMPLE_CLIP_URL` unchanged; the only schema change is the additive `0002`. → FR-013, FR-014 (SC-007, SC-010)
- [X] T028 [P] **Responsive + keyboard + on-token**: upload widget, store list, attach picker, attached
  section, detach are responsive at 480 / 1024 / 1280 (+1240 max) with no overlap/scroll, fully keyboard-
  operable (choose file, upload, attach, detach, dismiss) with visible focus; **tokens only**; persimmon only
  on the primary action + the verified mark. → FR-017 (P-IV, SC-008)
- [X] T029 [P] **Microcopy / honesty**: honest about the sample stub, the deferred **T8** composite, and the
  **brand-owned (non-proof)** nature of the footage; no "amazing"/"awesome", no emoji. → FR-018 (P-XI)
- [X] T030 **Build green (CI parity) + quickstart + STOP**: run `npm run typecheck`, `npm run lint`, `npm run
  build` — all green **without `DATABASE_URL` AND without R2 env** (move `.env.local` aside, build, restore —
  lazy `getDb()` + lazy `r2.ts`); run `quickstart.md` (the build/byte-stability + attach/detach + consent +
  fence checks always; the **live R2 upload walk only if Cornel provisioned T004/T005**); confirm the
  `CLAUDE.md` SPECKIT pointer targets this plan. Then **STOP and report**; do **not** run `/speckit.implement`
  again, and **leave the entire change uncommitted** for Cornel's manual review/branch/commit (no
  commit/push/merge). → SC-001..010, DoD (P-IX)

**Checkpoint**: Definition of Done met — real R2 presigned upload (aws4fetch) into a reusable owned store,
many-to-many attach + detach, honest T8 seam, consent untouched and sovereign; additive `0002` only; ProofCard
/ read shapes / generateClip / generateBatch / nav rail byte-stable; one new dep (aws4fetch); builds green
without `DATABASE_URL`/R2 env.

---

## Dependencies & Execution Order

- **Setup (T001–T005)** → first. T001/T002/T003 are code [P] (different files). **T004/T005 are Cornel-owned
  infra** — they gate only the *live upload walk*, not the build; can be provisioned any time before T030's
  live checks.
- **Foundational (T006–T011)** → after Setup. T006 (migration) after T002. T007 (`r2.ts`) after T001.
  T008/T009 (reads/writes) after T002/T003 [P with each other]. T010 (store actions) after T007+T009. T011
  (attach/detach actions) after T009. Foundational **BLOCKS** all UI.
- **US1 (T012–T016)** → after Foundational. T012→T013→T014; T015 (upload widget) after T010+T014; T016
  (palette) [P] after the route exists.
- **US2 (T017–T019)** → after Foundational. T017→T018→T019 (T019 calls T008 read + T011 actions).
- **US3 (T020–T021)** → T020 extends T019; T021 is a verification (after Foundational; independent of UI).
- **US4 (T022)** → verification, after the actions + a generation path exist.
- **Polish (T023–T030)** → after the stories; T030 last (build + quickstart + STOP, uncommitted).

## Parallel Opportunities

- Setup: T001 ∥ T002 ∥ T003 (different files); T004 ∥ T005 (Cornel infra, independent of code).
- Foundational: T008 ∥ T009 (same file `queries.ts` — additive, but coordinate to avoid edit churn; treat as
  sequential if editing together).
- US1: T016 (palette) ∥ the route work once `/app/footage` exists.
- Polish: T023–T029 are independent audits/concerns (different files); T030 last.

## Implementation Strategy

- **MVP** = Setup + Foundational + **US1** — a real upload into a reusable owned store at `/app/footage`
  (presign→browser-PUT→record, honest states), reachable from the palette.
- Then **US2** (many-to-many attach/detach on proof detail) → **US3** (honest T8 seam) → **US4** (consent
  sovereignty verification) → Polish/DoD.
- **Do NOT commit per task.** Build the whole slice, then leave the entire change uncommitted; Cornel reviews,
  branches (`T4-B2-brand-asset-store`), and commits manually. Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | research.md §1b (P-III) — the one new dep |
| T002 | FR-012 (SC-007) — additive schema |
| T003 | FR-011 (FR-019) — owned shapes |
| T004, T005 | SC-001 — R2 infra (Cornel-owned) |
| T006 | FR-012 (SC-007) — additive migration 0002 |
| T007 | FR-002, FR-003, FR-004 (SC-001, SC-010) — r2.ts + aws4fetch presign |
| T008 | FR-001, FR-011 (SC-007) — reads |
| T009 | FR-005, FR-006, FR-009 (P-VII) — writes |
| T010 | FR-002, FR-003, FR-004 (P-VII) — presign/create actions |
| T011 | FR-005, FR-006 (P-VII) — attach/detach actions |
| T012 | FR-001, P-V — derived route shell |
| T013 | FR-001 — data integrator |
| T014 | FR-001, FR-011 (FR-019, P-V) — store list/card |
| T015 | FR-002, FR-003, FR-004 (A-11) — upload widget (presigned PUT) |
| T016 | research.md §2 (P-V) — palette entry, rail untouched |
| T017 | FR-005 (SC-007) — additive proof read |
| T018 | FR-005 (P-II) — additive section |
| T019 | FR-005, FR-006, FR-011 (FR-019, Q2:A) — attach/detach UI + inline link, no delete |
| T020 | FR-007 (A-11, FR-019) — honest T8 seam |
| T021 | FR-008 (SC-004) — generation unchanged |
| T022 | FR-009, FR-010 (P-VII, SC-006) — consent sovereignty |
| T023 | FR-006 (P-VI, FR-019) — seed |
| T024 | FR-011 (FR-019, SC-005) — never-proof audit |
| T025 | FR-007 (A-11, SC-009) — A-11 audit |
| T026 | FR-015 (P-VIII, SC-009) — no-editor audit |
| T027 | FR-013, FR-014 (SC-007, SC-010) — byte-stable + dep gate |
| T028 | FR-017 (P-IV, SC-008) — responsive/keyboard/tokens |
| T029 | FR-018 (P-XI) — microcopy/honesty |
| T030 | SC-001..010, DoD — build green + quickstart + STOP |

## Notes

- 30 tasks (28 code/verification + **2 Cornel-owned infra**, T004/T005); 0 test tasks (no runner —
  verification via typecheck/lint/build + quickstart). An **additive-schema + real-R2-upload + attach** slice.
- **First new dependency since T0 = `aws4fetch`** (T001/T027) — ratified, called out explicitly; nothing else
  added.
- **First schema change since T2.4a = additive `0002`** (T002/T006) — enum + 2 tables + indexes; zero
  ALTER/DROP.
- **Presigned PUT, browser→R2** (T007/T010/T015): bytes never transit Vercel; the server signs a short-lived
  PUT via aws4fetch and records the row after the PUT; honest `uploading/stored/failed` + type/size validation.
- **R2 infra is Cornel-owned** (T004/T005): env (local + Vercel) + bucket CORS for browser PUT. The **build is
  green without them**; only the live upload walk needs them (flagged in T015/T030/quickstart).
- **Store route `/app/footage`** is a **derived surface** (no design-reference; T3.2 precedent) reached via the
  **command palette + inline attach-picker link** — the **nav rail stays byte-stable** (T016/T027).
- **Lifecycle = detach only** (T019); **delete-from-store is a named conscious deferral** (block-while-attached
  + R2 object cleanup, later) — not an omission.
- **Consent (P-VII) sovereign** (T011/T022): brand assets sit OUTSIDE the consent model; `getGrantedConsentId`
  stays the SOLE generation gate, unchanged; attaching never bypasses a withdrawn proof.
- **FR-019** (T014/T024): a brand asset is never shown/counted as proof; owned fields only.
- **Byte-stable** (T027): ProofCard, all shared view shapes, every existing read, `generateClip`,
  `generateBatch`, and the nav rail unchanged; `queries.ts` only GAINS additive functions.
- **Honest T8 seam** (T020/T021): the composite is a labeled deferred state; clip output unchanged; no fake
  combined preview.
- **Uncommitted hand-off** (T030): implementation leaves EVERYTHING uncommitted; Cornel branches + commits.
- Out of scope (do NOT build): the T8 render/composite, T5 Brand kits, design-reference B2 "Add proof
  (upload)", Warmth sort (B3), Export (B4), any editor/compositor, delete-from-store, the public showcase (T9).
