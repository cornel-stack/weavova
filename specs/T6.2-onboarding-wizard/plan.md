# Implementation Plan: T6.2 — Onboarding Wizard

**Branch**: `T6.2-onboarding-wizard` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T6.2-onboarding-wizard/spec.md`

## Summary

Build the 4-step onboarding wizard (Business → Source → Brand → Format) + a 5-step dashboard
spotlight tour, ported faithfully from the 5 synced `design-reference/Weavova/Onboarding/` screens.
A workspace with `onboarded_at IS NULL` (the T6.1 seam) is routed into `/onboard/*`; completing or
skipping sets `onboarded_at` and lands the user in the app. The wizard writes **real** config where
the capability exists and shows **honest "coming"/preference** states where it's deferred:

- **Step 1 Business type** → writes new additive `workspace.business_type` (allowlist).
- **Step 2 Connect a source** → wires the **real** per-workspace webhook (reuse
  `getOrCreateWebhookEndpoint`); native connectors (Shopify/Stripe/Instagram) are honest "coming"
  (reuse the T7.3 pattern). **No OAuth built** — the Sources track fills it behind the same buttons.
- **Step 3 Brand quickstart** → reuses the existing brand actions (`presignBrandKitLogoUpload` →
  **public** bucket via `assetUrlForKey`, `saveBrandKit`); no new brand model.
- **Step 4 First format** → writes new additive `workspace.first_format` (allowlist). The design has
  **no** preview/render of proof — the format tiles are **decorative concept-art**, ported static.
  No clip, no fabricated preview (P-XIV).
- **Step 5 Spotlight tour** → a non-blocking one-shot client overlay over the **real** (honest-empty)
  dashboard.

The routing gate lives in the **Layer-2 layouts** (which already do a DB read), not middleware
(deliberately DB-free). One additive migration adds two nullable columns.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 15 App Router, React 19

**Primary Dependencies**: Auth.js v5 (session), Drizzle/Neon, R2 (public brand bucket, existing),
Tailwind v4 + Pressroom tokens. **No new dependency.**

**Storage**: Neon Postgres. Additive: `workspace.business_type`, `workspace.first_format` (both
nullable text, code-side allowlist). Reused unchanged: `brand_kit`, `webhook_endpoint`, `workspace.
onboarded_at` (T6.1). One additive migration (`drizzle/0012_*.sql`).

**Testing**: `npm run build` + `npm run lint`; manual verification per `quickstart.md` (new user
walks the wizard; skip; seeded owner bypass; tour).

**Target Platform**: Vercel. `/onboard/*` is authenticated + workspace-scoped (its own minimal
chrome, not the app rail — matching the design).

**Project Type**: Web application (single Next.js project; `src/`).

**Performance Goals**: The gate adds no new query — both layouts already resolve
`getCurrentWorkspace()`, which (since T6.1) returns `onboarded_at`. Reading it is free.

**Constraints**: Cores frozen (P-V) — token/consent/verification, the brand-kit **model**, the
webhook model, and `onboarded_at` are unchanged; the wizard **reuses** them. Copy is lifted verbatim
from the design files (P-XVII). Persimmon only on the primary action (Continue/Finish) (P-IV).

**Scale/Scope**: New `/onboard/*` route group (4 pages + layout + actions), a tour overlay on the
dashboard, two forward/inverse gate lines, two additive columns. No render, no OAuth.

### Enumerated touch points

| File | Change |
|---|---|
| `src/db/schema.ts` | Add `businessType`, `firstFormat` nullable text to `workspace` (additive) |
| `drizzle/0012_*.sql` | `ALTER TABLE "workspace" ADD COLUMN "business_type" text, ADD COLUMN "first_format" text` |
| `src/db/queries.ts` | Add data-layer writes: `setWorkspaceBusinessType`, `setWorkspaceFirstFormat`, `markWorkspaceOnboarded` (allowlist-validated) |
| `src/app/onboard/layout.tsx` | **NEW** — session + workspace resolve; **inverse gate**: `onboarded_at` set → `redirect("/app")`; minimal wizard chrome (step rail + Skip) |
| `src/app/onboard/role/page.tsx` (+ client) | **NEW** Step 1 (design 1) |
| `src/app/onboard/source/page.tsx` (+ client) | **NEW** Step 2 (design 2) — real webhook surface + honest "coming" |
| `src/app/onboard/brand/page.tsx` (+ client) | **NEW** Step 3 (design 3) — reuse brand actions |
| `src/app/onboard/format/page.tsx` (+ client) | **NEW** Step 4 (design 4) — static tiles, preference-only |
| `src/app/onboard/actions.ts` | **NEW** — `saveBusinessType`, `saveFirstFormat`, `finishOnboarding`, `skipOnboarding` (set `onboarded_at`); Step 3 delegates to existing brand actions; Step 2 reads the webhook endpoint |
| `src/app/app/layout.tsx` | Add the **forward gate**: `onboarded_at IS NULL` → `redirect("/onboard/role")` |
| `src/middleware.ts` | Extend matcher to `["/app/:path*", "/onboard/:path*"]` (cookie-presence gate; still no DB read) |
| Dashboard tour | **NEW** client overlay component + a one-shot trigger (query param) on `/app` |

**Frozen — do NOT touch**: `brand_kit`/`webhook_endpoint` schemas, `upsertBrandKit`/`saveBrandKit`/
`presignBrandKitLogoUpload`/`getOrCreateWebhookEndpoint` internals, `assetUrlForKey` (public) vs the
private captures class, T6.1 `bootstrapWorkspaceIfNeeded`, consent/verification. STOP-and-surface if
a frozen core appears to need a real change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Customer is the headline (P-II)**: N/A for produced proof — the wizard configures the
      merchant's own workspace. Step 3's preview shows the merchant's real entered brand; the tour
      points at the real dashboard, never a fabricated customer.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / Auth.js / Drizzle / R2. No new dependency; no
      OAuth provider added.
- [x] **Pressroom tokens (P-IV)**: ported on-token, light + dark; persimmon only on the primary
      action (Continue/Finish).
- [x] **Port, don't redesign (P-V)**: all 5 surfaces ported from the named design files (Step 0 in
      spec). Reuses T6.1 `onboarded_at`, T7.4 webhook, the brand-kit model, the dashboard. No layout
      invented.
- [x] **Fixtures-first (P-VI)**: reads/writes the real schema; a fresh workspace is the honest
      zero-config case.
- [x] **Consent (P-VII)**: N/A — no proof/derived asset created.
- [x] **No editor (P-VIII)**: Step 4 is a **format picker** (static tiles), no timeline/scrubber, no
      render.
- [x] **SDD scope (P-IX)**: one vertical slice — wizard + tour + gate + 2 columns. Sources-track
      OAuth and the render engine are out.
- [x] **Ambiguity handling (P-XII)**: the Step 4 "preview" question is resolved by inspecting design 4
      (no preview text → decorative tiles). Remaining choices recorded as decisions in research.md.
- [x] **Port-completeness (P-XIII)**: Step 2 native connectors + Step 4 render are honest
      "coming"/preference states; the Step 2 webhook path is genuinely live. No dead controls.
- [x] **Owned data only (P-XIV)**: no fabricated previews/counts/sample data; Step 3 preview and the
      tour reflect only the user's real (possibly empty) data.
- [x] **Plan-not-code (P-XV)**: N/A — non-render slice.
- [x] **No-LLM-in-render (P-XVI)**: N/A — non-render slice.

**Definition of done (P-Governance)**: renders on real data (empty workspace is real); handles
empty/loading/error (fresh workspace, optional logo, skipped steps); responsive at 480/1024/1280;
on-token; keyboard-accessible (wizard steps, tour); passes acceptance criteria; build green.

**Result**: PASS (no violations; Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/T6.2-onboarding-wizard/
├── plan.md
├── research.md          # gate placement, step-2 seam, step-4 preview finding, resume/tour decisions
├── data-model.md        # 2 additive columns + allowlists; reused models
├── quickstart.md        # walk / skip / bypass / tour scenarios
├── contracts/
│   ├── routing-gate.md          # forward + inverse gate contract
│   ├── step-writes.md           # per-step write actions + reuse map
│   └── coming-states.md         # P-XIII/P-XIV honesty contract (step 2 native, step 4 render)
└── tasks.md             # Phase 2 (/speckit-tasks — NOT here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── onboard/
│   │   ├── layout.tsx           # inverse gate + wizard chrome
│   │   ├── role/                # Step 1  → design 1
│   │   ├── source/              # Step 2  → design 2
│   │   ├── brand/               # Step 3  → design 3
│   │   ├── format/              # Step 4  → design 4
│   │   └── actions.ts           # business_type / first_format / finish / skip
│   └── app/
│       ├── layout.tsx           # forward gate (onboarded_at NULL → /onboard/role)
│       └── (dashboard tour overlay trigger)
├── components/app/onboarding/   # wizard step components + tour overlay (design 5)
├── db/{schema,queries}.ts       # +2 columns, +3 data-layer writes
└── middleware.ts                # matcher += /onboard/:path*
drizzle/0012_*.sql               # additive migration
```

**Structure Decision**: New `/onboard` route group with its **own** minimal layout (wizard chrome,
not the app rail — per the designs). The gate is symmetric across the two Layer-2 layouts.

## The six things this plan resolves

### 1. The routing gate (the T6.1 seam)  → FR-001/FR-002

- **Placement: the Layer-2 layouts, not middleware.** `src/middleware.ts` is deliberately a
  cookie-presence check with **no DB read** (edge-safe). The onboarded check needs a DB read, so it
  lives where the DB read already happens:
  - **Forward gate** in `src/app/app/layout.tsx`: after `getCurrentWorkspace()`, if
    `workspace.onboardedAt == null` → `redirect("/onboard/role")`. Every `/app` route inherits this
    layout, so no app surface renders for an un-onboarded workspace.
  - **Inverse gate** in `src/app/onboard/layout.tsx`: after `getCurrentWorkspace()`, if
    `workspace.onboardedAt != null` → `redirect("/app")`. A finished user or the seeded owner cannot
    re-enter the wizard by URL.
- **Free read**: since T6.1 (Option A), `getCurrentWorkspace()` already returns `onboardedAt` — the
  gate adds **no** query and needs **no** change to `src/lib/session.ts`.
- **Middleware**: extend the matcher to `["/app/:path*", "/onboard/:path*"]` so `/onboard` also gets
  the Layer-1 cookie gate (redirect to `/login` when signed out). Still no DB read in middleware.
- **Seeded owner & existing sessions undisturbed**: their `onboarded_at` is set (T6.1 seed) → forward
  gate is a no-op → straight to the app; byte-stable.
- **Resume** (decision, research D5): the forward gate redirects to `/onboard/role` (step 1); the
  wizard **pre-fills** from persisted values (business_type, brand kit, first_format) so nothing is
  lost. Resume-at-furthest-incomplete is deferred (steps 2/3 are optional → "furthest" is fuzzy).

### 2. The Step-2 seam (wizard vs the future Sources track)  → FR-004/FR-005

- **Real path**: Step 2's "Automation / works with anything" card surfaces the workspace's **real**
  webhook URL + secret by reusing `getOrCreateWebhookEndpoint(workspaceId)` (T7.4) — **not**
  duplicated. This is a genuinely usable configuration on first run.
- **Honest "coming"**: the native connectors (Shopify, Stripe, Instagram) and the other unwired cards
  (Forward order emails, Ask after delivery) reuse the **T7.3 "coming soon"** affordance
  (`request-builder` pattern) — visible, explained, not dead, no fake success. **No OAuth is built.**
- **Clean seam for Sources**: the later Sources track fills the OAuth **behind these same buttons**
  (same UI, same cards) — this slice deliberately leaves that hook empty, so no rework. Stated
  explicitly so the two slices don't overlap.

### 3. Step 3 reuse (brand)  → FR-006

- Wire Step 3 to the **existing** brand actions: `presignBrandKitLogoUpload` (presigned PUT →
  browser uploads direct to R2 → key), then `saveBrandKit` which persists `logoAssetUrl =
  assetUrlForKey(key)` (the **PUBLIC** brand bucket) + brand colour + caption font via `upsertBrandKit`.
- **Public, not private**: the logo is OWNED brand data and uses `assetUrlForKey` (public class) —
  explicitly **not** the private captures bucket (T7.4a two-class split preserved).
- **No new brand model**: `brand_kit` already stores logo/colour/fonts (verified). Step 3 writes real
  config and builds nothing new; the live preview renders from the entered values.

### 4. Step 4 honest preference  → FR-007

- Writes new additive `workspace.first_format` (allowlist) only.
- **Design finding (research D3)**: design 4 contains **no** "preview/render/sample/your-proof" text —
  the format cards are **decorative concept-art tiles**. Port them as **static illustration**; there
  is **no** personalized render implied, so **no** clip and **no** "coming at render" caption is
  needed. Nothing fabricated (P-XIV).

### 5. Step 1 + Step 5  → FR-003/FR-012/FR-013

- **Step 1**: writes new additive `workspace.business_type` (allowlist: e-commerce, services, saas,
  local, creator, agency), with the design's six cards + subcopy.
- **Step 5 tour**: a **non-blocking one-shot** client overlay (design 5) over the **real** dashboard.
  `onboarded_at` is set at Finish (§6), so the tour never gates onboarding and never re-triggers.
  Trigger (decision, research D4): **Finish** redirects to `/app?tour=1`; the dashboard reads the
  param once, launches the 5-step spotlight, then strips it. **Skip** goes to `/app` (no tour). On a
  fresh workspace the highlighted masthead is the honest **zeroed** state — no fabricated sample data.

### 6. Finish / Skip → onboarded_at + the additive migration  → FR-008/FR-009/FR-010/FR-014

- **Finish** (`finishOnboarding`) and **Skip** (`skipOnboarding`) both call `markWorkspaceOnboarded`
  (sets `onboarded_at = now()`), then redirect (Finish → `/app?tour=1`; Skip → `/app`). Idempotent
  (setting an already-set timestamp is harmless; the inverse gate makes re-entry impossible anyway).
- **Partial-safe** (FR-010): each step writes independently; an untouched step leaves its column NULL /
  the brand kit unwritten. Skip persists only what was actually chosen — no fabricated config.
- **Migration** (`drizzle/0012`): `ADD COLUMN business_type text`, `ADD COLUMN first_format text`
  (both nullable, no default, allowlist-validated **in code** — matching the `source.kind` precedent).
  No token/consent/verification/brand-kit-core change. `onboarded_at` already exists (T6.1).

## Complexity Tracking

*No constitution violations. No entries.*
