# Implementation Plan: T4-B2 — Brand-asset store (reusable owned footage, attachable to proof)

**Branch**: `main` (a `T4-B2-brand-asset-store` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T4-B2-brand-asset-store/spec.md` with clarifications folded:
**Q1→A** dedicated `/app` route + inline attach from proof · **Q2→A** detach-only in B2 (delete-from-store a
named conscious deferral) · **Q3→A** `kind` pgEnum `{product, broll}` alongside a free-text `label`.

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. **Two decisions are surfaced for
ratification at review — the implementation MUST NOT start until they are settled**: (1) the **R2 upload
mechanism + the first new dependency** (research.md §1, the primary STOP); (2) the **navigation entry** for the
derived store route (research.md §2 — the rail is a fixed 8-destination port). When implemented, every change
is **left uncommitted** for Cornel to review and commit (mirrors prior slices).

## Summary

The second T4 slice — **"my own footage, woven in for context."** It ships **three real, persisting things**
and **one honest deferred seam**:

1. **Real R2 upload → a reusable owned store.** Upload one of the brand's own clips; it is **genuinely
   uploaded to Cloudflare R2**, validated (type + size), with honest states (`uploading` / `stored` /
   `failed`); on success it becomes a **labeled owned brand asset** (`brand_asset` row), reusable across many
   proofs.
2. **Many-to-many attach** (`proof_brand_asset` join) — one asset → many proofs, one proof → several assets —
   from an **additive "attached brand assets" section** on proof detail.
3. **Detach** — remove the association for one proof (the asset survives). **Delete-from-store** is a
   **named conscious deferral** (Q2:A), not an omission.
4. **Honest T8 seam** — the attached asset shows it **"will appear in the rendered clip when rendering ships
   (T8)"**; **no fake combined preview**. `generateClip` / `generateBatch` are **byte-unchanged** and still
   return the `SAMPLE_CLIP_URL` stub.

**Two facts from the codebase reshape this slice** (see research.md):

- **There is no real R2 wiring to reuse.** `SAMPLE_CLIP_URL` (`src/lib/clip.ts`) is a **literal**
  `r2://weavova-samples/press-run-sample.mp4` string — a display/seed placeholder, never uploaded by code.
  The only env var is `DATABASE_URL`. **B2 is the project's first real R2 integration** (a new `src/lib/r2.ts`
  + new env vars) **and** — almost certainly — **its first new runtime dependency since T0**. That is **THE
  decision to ratify** (research.md §1).
- **The rail is a fixed port of 8 design-reference destinations** (`src/lib/nav.ts` — "the eight rail/palette
  destinations, in the /design-reference chrome order"). A **dedicated** store route (Q1:A) has **no slot in
  the ported chrome** — so its **navigation entry is a P-V decision to ratify** (research.md §2).

**Consent (P-VII) stays sovereign and untouched.** Brand assets are **owned footage** — upload/store/attach
**never** invoke the consent flow (no consent row/version/prompt). Attaching to a proof **never** bypasses its
consent: the existing **`getGrantedConsentId` / effective-consent gate remains the SOLE gate** on clip
generation, **unchanged** — a non-granted proof produces no clip, asset attached or not. The
`derived_asset` withdrawal cascade is untouched.

**Schema is additive-only** (the first change since `derived_asset`, T2.4a → migration **`0002_*.sql`**): a new
`brand_asset` table + a new `proof_brand_asset` join + a new `brand_asset_kind` pgEnum. **No change** to
existing tables, the consent model, `derived_asset`, or the proof / clip / showcase **read shapes**.

**Byte-stable elsewhere.** **ProofCard**, the proof/clip/showcase read shapes, **`generateClip`**, and
**`generateBatch`** are behaviorally unchanged. Proof detail gains **only** the additive attached-assets
section (a new workspace-scoped read, leaving the existing `getProof` / `getProofClips` contracts byte-stable).

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing — `next`, `react`, `drizzle-orm`, `@neondatabase/serverless`,
`lucide-react`. **NEW (to ratify — research.md §1)**: one R2/SigV4 dependency for the presigned upload — the
**first conscious dep decision since T0**. Recommendation laid out, **not pre-chosen**.

**Storage**: Neon Postgres via the lazy `getDb()` + Drizzle (existing) **+ Cloudflare R2** for the real video
object (new). **Additive migration `0002_*.sql`**: `brand_asset` + `proof_brand_asset` + `brand_asset_kind`
enum. New workspace-scoped reads/writes; existing reads untouched.

**Testing**: No unit-test runner. Verification = `npm run typecheck`/`lint`/`build` (green **without**
`DATABASE_URL` and **without** R2 creds — the R2 client must construct lazily, mirroring `getDb()`), plus the
`quickstart.md` manual checks (real upload to R2; validation rejects; many-to-many attach/detach persist;
honest T8 seam; consent still sole gate; byte-stability; the one new dep).

**Target Platform**: Vercel; modern browsers. **Upload bytes MUST NOT transit a Next.js route handler/Server
Action** (Vercel request-body limits + Active-CPU cost on large video) — the recommended mechanism is
**presigned PUT direct browser→R2**; the server only issues a short-lived signed URL and records the row
(research.md §1).

**Performance Goals**: Demo scale. Reads `withDbRetry`-wrapped; the asset-insert and attach/detach are
single-attempt writes (D4 convention). Video bytes go **straight to R2** (not through Vercel). One
`revalidatePath` round per mutation.

**Constraints**: Drizzle only; Server Components by default (the store list + attached-section are server-read;
the upload widget + attach picker are client islands); Tailwind classes + Pressroom tokens only; `withDbRetry`
on reads; single-attempt writes (D4); **P-VII unchanged — brand assets sit OUTSIDE the consent gate**; owned
values only (FR-019 — never shown/counted as proof); **No-Editor (P-VIII)** — attach only, no
timeline/trim/compositor; A-11 (upload + attach + detach genuinely persist; only the composite is the labeled
deferred seam); **ProofCard + proof/clip/showcase read shapes + generateClip + generateBatch byte-stable**;
additive schema only.

**Scale/Scope**: One new `brand_asset` table + one join + one enum (migration `0002`); a new `src/lib/r2.ts`
(lazy R2 client + presign + validation constants) and `src/lib/brand-asset.ts` (owned view shapes); new reads
(`getBrandAssets`, `getProofBrandAssets`) + new writes (`createBrandAsset`, `attachBrandAsset`,
`detachBrandAsset`) + presign action; a new dedicated route under `/app` (the derived store: list + upload);
an additive attached-assets section on proof detail. **No change** to existing reads, ProofCard, the studio,
or the chrome data contracts.

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS — the two open decisions are surfaced (not
violations); the one new dependency is raised explicitly for ratification per P-III (not slipped in).*

- [x] **Customer is the headline (P-II)**: The brand footage is **supporting context, never the lead**. On
      proof detail the customer's quote/face stays the headline; the attached-assets section is a quiet,
      secondary, honestly-labeled addition. The store route is brand-owned utility, not a proof surface.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, **R2**
      for the real upload. The **one new dependency** (R2/SigV4 signer) is raised **explicitly** for
      ratification (research.md §1) — the first conscious dep decision since T0, not assumed. Heavy
      render/composite stays off Vercel (T8); clips stay sample-stubbed.
- [x] **Pressroom tokens (P-IV)**: On-token only; persimmon reserved for the primary action (Upload / Attach)
      + the verified mark. The derived store + section port existing Pressroom patterns (cards, sections,
      buttons, empty/loading/error).
- [x] **Port, don't redesign (P-V)**: The store has **no design-reference screen** → a **derived surface**
      (precedent T3.2 clip detail), assembled from existing ported patterns, **documented as derived**. The
      attached-section follows screen 03's section pattern. The **navigation entry** is surfaced as a decision
      (research.md §2) rather than silently changing the 8-destination chrome.
- [x] **Fixtures-first (P-VI)**: New tables shaped exactly like the real schema (the contract). Seed gains
      sample owned brand assets + a couple of attachments to exercise the store, attach, and the honest T8
      state — clearly owned, never proof.
- [x] **Consent enforcement (P-VII)**: **Unchanged.** Brand assets are outside the consent model
      (upload/store/attach never prompt). The existing `getGrantedConsentId` gate stays the **sole** gate on
      generation; a non-granted proof can't generate, attached or not; the `derived_asset` withdrawal cascade
      is untouched.
- [x] **No editor (P-VIII)**: Honoured — **attach an asset, not compose a video**. No timeline/track/trim/
      scrubber/compositor; the automated render template (T8) arranges material the user supplies.
- [x] **SDD scope (P-IX, P-XI)**: One vertical slice — real upload + reusable store + many-to-many attach +
      detach + the honest T8 seam. Composite (T8), Brand kits (T5), customer-proof upload (design-reference
      B2), warmth/export, delete-from-store, public showcase (T9) are out of scope.
- [x] **Ambiguity handling (P-XII)**: The R2 mechanism/dep and the nav entry are raised as **named decisions**
      (research.md), and the spec's Q1–Q3 were resolved before planning — nothing guessed.

**Definition of done (P-Governance)**: renders on fixtures/real data; handles empty (no assets / nothing
attached), loading (skeleton), and error (upload `failed`, shared `<ErrorState>`); responsive at 480 / 1024 /
1280 (+1240 max); on-token; keyboard-accessible (choose file, upload, attach, detach, dismiss); passes
acceptance criteria; **builds green without `DATABASE_URL` and without R2 creds**.

## Project Structure

### Documentation (this feature)

```text
specs/T4-B2-brand-asset-store/
├── plan.md              # This file
├── research.md          # Phase 0 — R2 mechanism + dep decision (THE stop); nav-entry decision; validation; derived-surface
├── data-model.md        # Phase 1 — brand_asset + proof_brand_asset + enum; migration 0002; owned view shapes
├── contracts/           # Phase 1 — server actions + reads (presign, create, attach, detach; getBrandAssets, getProofBrandAssets)
├── quickstart.md        # Phase 1 — manual validation guide
├── checklists/
│   └── requirements.md  # from /speckit.specify
└── tasks.md             # Phase 2 — /speckit.tasks (NOT created here)
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── schema.ts                 # + brandAssetKindEnum, brand_asset, proof_brand_asset (additive only)
│   ├── queries.ts                # + getBrandAssets, getProofBrandAssets (reads, withDbRetry);
│   │                             #   + createBrandAsset, attachBrandAsset, detachBrandAsset (single-attempt writes, D4)
│   └── seed.ts                   # + sample owned brand assets + a couple of attachments (clearly owned, never proof)
├── lib/
│   ├── r2.ts                     # NEW — lazy R2 client + presign helper + ALLOWED_TYPES/MAX_BYTES + env reads (lazy, like getDb())
│   ├── brand-asset.ts            # NEW — owned view shapes (BrandAssetView, ProofBrandAssetView) + kind type (type-only enum import)
│   └── clip.ts                   # UNCHANGED (SAMPLE_CLIP_URL stays the literal seam)
├── app/app/
│   ├── <store-route>/            # NEW derived route (name in research.md §2) — page.tsx (Suspense + skeleton) + data integrator
│   │   └── actions.ts            # "use server" — presignBrandAssetUpload, createBrandAsset (record row after R2 PUT)
│   └── proof/[id]/
│       ├── page.tsx              # UNCHANGED
│       └── actions.ts            # + attachBrandAsset / detachBrandAsset server actions (revalidate the proof path)
├── components/app/
│   ├── brand-assets/             # NEW — store list, upload widget (client), asset card (owned-labeled), empty/skeleton
│   │   └── ...
│   └── proof-detail/
│       ├── proof-detail.tsx      # + render the additive "attached brand assets" section (props extended; existing layout intact)
│       ├── proof-detail-data.tsx # + one new read getProofBrandAssets (getProof/getProofClips contracts byte-stable)
│       └── attached-brand-assets/ # NEW — section + attach picker (client island) + T8-seam label; detach control
│   └── (ProofCard)               # BYTE-UNCHANGED
└── lib/nav.ts                    # MAYBE +1 destination — only if research.md §2 ratifies a rail entry (else palette/inline entry)

drizzle/
└── 0002_<generated_name>.sql     # NEW additive migration (drizzle-kit generate)

.env.example / .env.local         # + R2 env keys (names in research.md §1; values are Cornel's)
```

**Structure Decision**: Single Next.js App-Router project (existing). The slice is **additive**: new schema
objects, two new lib modules (`r2.ts`, `brand-asset.ts`), new reads/writes/actions, one derived `/app` route,
and one additive proof-detail section — leaving every existing read, the studio, ProofCard, and the chrome
contracts byte-stable. The two cross-cutting decisions (R2 mechanism/dep; nav entry) are isolated in
research.md and gate the build.

## Phase 0 — Research (see research.md)

- **§1 R2 upload mechanism + the first new dependency (THE decision — STOP).** Presigned direct-to-R2 vs
  server-proxied; `@aws-sdk/client-s3` + `s3-request-presigner` vs `aws4fetch` vs hand-rolled SigV4 — with
  bundle size, build/RAM cost (7.6 GiB SFF), and complexity. Recommendation given, presented for ratification.
  Plus: file-type/size validation, the `uploading/stored/failed` state machine, and the new R2 env vars
  (no existing R2 config to reuse — `SAMPLE_CLIP_URL` is a literal).
- **§2 Navigation entry for the derived store route.** The rail is a fixed 8-destination port; options for how
  the dedicated route is reached (command-palette + inline-from-proof vs a ratified 9th rail item) — decision
  to ratify.
- **§3 Derived-surface basis.** No design-reference screen; which existing ported patterns the store + section
  reuse (precedent T3.2).
- **§4 Honest T8-composite seam.** How the attachment states "arrives with rendering (T8)" without a fake
  preview; `generateClip`/`generateBatch` untouched.

## Phase 1 — Design & Contracts (see data-model.md, contracts/, quickstart.md)

- **data-model.md** — `brandAssetKindEnum {product, broll}`, `brand_asset`, `proof_brand_asset` (unique on
  `(proofId, brandAssetId)`), the additive `0002` migration, the owned view shapes, and the explicit
  no-change list (existing tables, consent, `derived_asset`, read shapes).
- **contracts/** — the server actions (`presignBrandAssetUpload`, `createBrandAsset`, `attachBrandAsset`,
  `detachBrandAsset`) and reads (`getBrandAssets`, `getProofBrandAssets`): inputs, validation, consent
  posture (none on brand assets; gate untouched), revalidation, and honest result/error states.
- **quickstart.md** — manual validation: real upload + validation rejects; many-to-many attach/detach persist;
  honest T8 seam (clip output unchanged); consent still sole gate; byte-stability; one new dep; green build
  without DB/R2 creds.

## Complexity Tracking

> No constitution violations to justify. The **one new dependency** is not a violation — it is the
> spec-anticipated, P-III-mandated **conscious dep decision**, raised explicitly in research.md §1 for
> ratification before any install. Recorded here so it is impossible to miss:

| Item | Why needed | Ratification |
|------|------------|--------------|
| First new runtime dependency since T0 (an R2/SigV4 signer) | Real R2 presigned upload of brand-owned video; no existing R2 client to reuse (`SAMPLE_CLIP_URL` is a literal) | **STOP at review** — choose from research.md §1 (recommend the lightweight signer) before install/implement |
| Navigation entry for a derived route with no chrome slot | Q1:A dedicated `/app` route, but the rail is a fixed 8-destination port (P-V) | **Ratify at review** — research.md §2 (recommend palette + inline-from-proof, no rail change) |
