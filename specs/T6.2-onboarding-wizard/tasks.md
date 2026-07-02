---

description: "Task list for T6.2 — Onboarding Wizard"
---

# Tasks: T6.2 — Onboarding Wizard

**Input**: Design documents from `specs/T6.2-onboarding-wizard/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D6), data-model.md,
contracts/{routing-gate,step-writes,coming-states}.md, quickstart.md
**Binding designs**: `design-reference/Weavova/Onboarding/` (read-only; port faithfully — P-V)

**Tests**: No automated suite is wired in this repo; verification is the `npm run build` gate + the
`quickstart.md` A–G + resume matrix. The DB writes (business_type/first_format/onboarded_at) and the
gate conditionals are **headless-assertable** (the T6.1 harness pattern); the ported UI, tour, and
honesty states need a **real new-user browser session** (Cornel's live walk) — noted per task.

**Constitution tags**: P-V (port + reuse, binding refs, cores frozen), P-XIII (honest "coming", no
dead controls), P-XIV (no fabricated output). **P-XV/XVI: N/A — non-render slice.**

**Cores frozen (P-V)**: `src/lib/session.ts` (untouched — `getCurrentWorkspace()` already returns
`onboarded_at`), the `brand_kit`/`webhook_endpoint` **models** and their actions (reused, not
rebuilt), `assetUrlForKey` public/private split (T7.4a), T6.1 `onboarded_at` + bootstrap,
consent/verification. Only enumerated touch points change. **STOP-and-surface if a core needs a real
change.**

## Format: `[ID] [P?] [Story] Description`

- **[P]**: different file, no dependency on an incomplete task
- **[Story]**: US1–US5 (Setup/Foundational/Polish have no story label)

---

## Phase 1: Setup

- [X] T001 [P] Record baseline anchors (read-only): `package.json` dependency count (expected **11**)
      and confirm `getCurrentWorkspace()` in `src/lib/session.ts` already returns `onboardedAt` (T6.1)
      so the routing gate reads it **free** and `session.ts` stays untouched. Note for T020/T021.
      **DoD**: values noted; no files changed. **(P-V)**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The additive columns, data-layer writes, the routing gate, and the `/onboard` shell —
everything the step pages depend on. **⚠️ No step work begins until this phase is done.**

- [X] T002 Add `businessType` and `firstFormat` nullable `text` columns to the `workspace` table in
      `src/db/schema.ts` (additive; alongside `onboardedAt`). No other column touched.
      **DoD**: both columns present, nullable, no default. **(P-V)**
- [X] T003 Generate the additive migration into `drizzle/` via `npx drizzle-kit generate` (expected
      `drizzle/0012_*.sql`). Confirm the SQL is exactly two `ADD COLUMN` (`business_type text`,
      `first_format text`) with no other diff. (Depends on T002.)
      **DoD**: `0012` present; ADD COLUMN only (gate T022 re-checks). **(P-V)**
- [X] T004 [P] Add data-layer writes to `src/db/queries.ts`: `setWorkspaceBusinessType(workspaceId,
      value)` and `setWorkspaceFirstFormat(workspaceId, value)` (each rejects values outside the
      code-side allowlists `BUSINESS_TYPES` = {ecommerce, services, saas, local, creator, agency} /
      `FIRST_FORMATS` = {raw_review, ugc, digital_product, physical_product, quote_card}), and
      `markWorkspaceOnboarded(workspaceId)` (sets `onboarded_at = now()`, idempotent).
      **DoD**: three exported writes; allowlist-guarded; matches `source.kind` text+allowlist precedent.
      **(P-V, P-XIII — real writes)**
- [X] T005 Add the **forward gate** to `src/app/app/layout.tsx`: after `getCurrentWorkspace()`, if
      `workspace.onboardedAt == null` → `redirect("/onboard/role")`; otherwise render `AppChrome`
      unchanged. No other change to the layout.
      **DoD**: un-onboarded → wizard; onboarded (incl. seed) → app unchanged (byte-stable). **(P-V)**
- [X] T006 [P] Extend the matcher in `src/middleware.ts` to `["/app/:path*", "/onboard/:path*"]`
      (cookie-presence only; **no** DB read — edge-safe invariant preserved).
      **DoD**: signed-out `/onboard/*` → `/login`; middleware still imports no db/auth. **(P-V)**
- [X] T007 Create the `/onboard` shell: `src/app/onboard/layout.tsx` — resolve session + workspace,
      **inverse gate** (`onboardedAt != null` → `redirect("/app")`), and render the minimal wizard
      chrome (progress rail "1 Business · 2 Source · 3 Brand · 4 Format" with completed marks, the
      global "Skip for now" affordance, "Step N of 4"), on Pressroom tokens, light + dark. Add shared
      pieces under `src/components/app/onboarding/` (progress rail, skip control, step frame).
      **DoD**: wizard chrome renders; inverse gate blocks re-entry; not the app rail. **(P-V, P-XIII)**
- [X] T008 Scaffold `src/app/onboard/actions.ts` with the server actions that resolve the workspace
      server-side via `getCurrentWorkspace()` (never trust a client id): `saveBusinessType(value)` →
      `setWorkspaceBusinessType`; `saveFirstFormat(value)` → `setWorkspaceFirstFormat`;
      `finishOnboarding()` → `markWorkspaceOnboarded` then `redirect("/app?tour=1")`. (`skipOnboarding`
      is added in US3; Step 3 reuses existing brand actions; Step 2 has no write.)
      **DoD**: three actions compile and are server-only. **(P-V)**

**Checkpoint**: schema + writes + gate + shell ready; step pages can be built.

---

## Phase 3: User Story 1 — Configure the workspace and land onboarded (Priority: P1) 🎯 MVP

**Goal**: A NULL-onboarded user walks the wizard and, on Finish, their real config is saved and
`onboarded_at` is set. Delivers the reason the wizard exists.

**Independent Test**: As a new user, complete steps 1/3/4 → `business_type`, brand kit, `first_format`
persisted, `onboarded_at` set, land on `/app`. (Quickstart A/B — needs a real new-user session;
DB writes + gate are headless-assertable.)

**Note**: Step 2 page is built in US2 (its defining content is the honesty states); US1's walk-through
depends on US2's step-2 page landing (both are P1, shipped together).

- [X] T009 [US1] Build Step 1 page `src/app/onboard/role/page.tsx` (+ client) — port
      `design-reference/Weavova/Onboarding/1 _ Business type  _onboard_role`: six cards (E-commerce,
      Services & bookings, SaaS, Local business, Creator, Agency) with verbatim subcopy, "Step 1 of 4",
      Continue → `saveBusinessType`; pre-fill the current `business_type`. Light + dark, on-token.
      **DoD**: selection persists (allowlist value); ported faithfully; persimmon only on Continue.
      **(P-V, P-XIV)**
- [X] T010 [US1] Build Step 3 page `src/app/onboard/brand/page.tsx` (+ client) — port
      `design-reference/Weavova/Onboarding/3 _ Brand quickstart  _onboard_brand`: optional logo +
      brand colour + caption font (Grotesk/Serif) + **live preview** from entered values; wire the
      **existing** `presignBrandKitLogoUpload` (logo → **PUBLIC** brand bucket via `assetUrlForKey`,
      never the private captures bucket) + `saveBrandKit`; pre-fill from the current kit; "Step 3 of 4".
      **DoD**: brand kit written via the existing actions; logo is a public URL; preview uses only
      real entered data; no new brand model. **(P-V, P-XIV)**
- [X] T011 [US1] Build Step 4 page `src/app/onboard/format/page.tsx` (+ client) — port
      `design-reference/Weavova/Onboarding/4 _ First format  _onboard_format`: the format tiles as
      **static decorative illustration** (design has no preview/render — research D3), Continue/Finish;
      write via `saveFirstFormat`. "Step 4 of 4 · Finish setup". **No** clip/preview produced.
      **DoD**: `first_format` persists (allowlist); zero rendered/fabricated output (P-XIV).
      **(P-V, P-XIV)**
- [X] T012 [US1] Wire the linear flow + Finish: Back/Continue navigation across steps 1→2→3→4, and
      **Finish setup** → `finishOnboarding()` (sets `onboarded_at`, redirects `/app?tour=1`); after
      which the forward gate no-ops and the app renders.
      **DoD**: finishing sets `onboarded_at` and lands on `/app`; the wizard is unreachable afterward
      (inverse gate). **(P-V)**

**Checkpoint**: a new user can configure and complete onboarding (with US2's step-2 page present).

---

## Phase 4: User Story 2 — Deferred capabilities are honest, never dead or faked (Priority: P1)

**Goal**: Step 2's webhook is genuinely live; its native connectors and Step 4's tiles are honest
"coming"/preference states — no dead controls, no fabricated output.

**Independent Test**: On Step 2 the webhook card shows a real secret and each native connector is an
honest "coming"; Step 4 produces no render. (Quickstart E/F — inspection; needs a real session for
the rendered surfaces.)

- [X] T013 [US2] Build Step 2 page `src/app/onboard/source/page.tsx` (+ client) — port
      `design-reference/Weavova/Onboarding/2 _ Connect a source  _onboard_source`: the **real**
      Automation/"works with anything" card surfaces the workspace's webhook URL + secret via the
      **existing** `getOrCreateWebhookEndpoint(workspaceId)` (reuse, **do not duplicate** the T7.4
      surface); native connectors (Shopify/Stripe/Instagram) + Forward-emails/Ask-after-delivery as
      honest "coming" reusing the **T7.3** `request-builder` pattern; **no OAuth**; Back/Continue;
      "Step 2 of 4". Light + dark.
      **DoD**: webhook card is a working config (real secret); every native card is honest "coming"; no
      OAuth is initiated; the Sources track can later fill OAuth behind these same cards. **(P-V, P-XIII)**
- [X] T014 [US2] Step 4 honesty guard (`src/app/onboard/format/page.tsx`): confirm the tiles are static
      decorative art and the step produces **no** clip, preview, or personalized output — the only
      effect is the `first_format` write.
      **DoD (by construction)**: zero render/preview output at Step 4. **(P-XIV)**
- [X] T015 [US2] Step 2 honesty guard (`src/app/onboard/source/page.tsx`): confirm no native card is a
      dead control or fakes a connection, and none starts an OAuth flow; the webhook secret shown is
      the real endpoint value.
      **DoD**: no dead controls; no fake success; no OAuth. **(P-XIII)**

**Checkpoint**: the first-run flow is honest end-to-end.

---

## Phase 5: User Story 3 — Skip anytime → onboarded, never nagged (Priority: P2)

**Goal**: "Skip for now" on any step marks the workspace onboarded and exits to the app, without
re-prompting or writing fabricated config.

**Independent Test**: Skip on Step 2 → `onboarded_at` set, land in `/app`, reload → no wizard.
(Quickstart C — real session; DB effect headless-assertable.)

- [X] T016 [US3] Add `skipOnboarding()` to `src/app/onboard/actions.ts` (→ `markWorkspaceOnboarded`
      then `redirect("/app")`, **no** `?tour=1`) and wire the global "Skip for now" control (in the
      T007 shell chrome) to it on every step.
      **DoD**: skip from any step sets `onboarded_at`, lands in `/app`, wizard does not reappear; only
      steps actually acted on are persisted (untouched columns NULL — partial-safe). **(P-V, P-XIV)**

**Checkpoint**: skip is a first-class, honest exit.

---

## Phase 6: User Story 4 — Already-onboarded / seeded users bypass (Priority: P2)

**Goal**: Onboarded users (incl. the seeded Lumen owner) never see the wizard.

**Independent Test**: Sign in as the seed owner → straight to `/app`; `/onboard/*` redirects to
`/app`. (Quickstart D — real session or headless DB assert on the gate conditional.)

- [X] T017 [US4] Verify the gate correctness (no new code beyond T005/T007): seeded Lumen owner
      (`onboarded_at` set) → forward gate no-ops → app; direct navigation to `/onboard/role` → inverse
      gate → `/app`; `src/lib/session.ts` confirmed untouched.
      **DoD**: onboarded users never reach the wizard; existing sessions byte-stable. **(P-V)**

**Checkpoint**: the gate is provably surgical.

---

## Phase 7: User Story 5 — Dashboard spotlight tour (Priority: P3)

**Goal**: A non-blocking one-shot spotlight tour over the real (honest-empty) dashboard after Finish.

**Independent Test**: Finish → tour starts ("Tour · 1 of 5"); Next steps through 5; Skip tour
dismisses; refresh without `?tour=1` → no tour. (Quickstart G — real session.)

- [X] T018 [US5] Build the tour overlay under `src/components/app/onboarding/` + wire it into the
      dashboard (`/app`) — port `design-reference/Weavova/Onboarding/5 _ Dashboard spotlight tour`: a
      client, non-blocking spotlight overlay triggered when the URL has `?tour=1`, 5 steps
      ("Tour · N of 5", "Your masthead…"), Skip tour / Next, strips the param after start. On a fresh
      empty workspace it highlights the **honest zeroed** masthead — **no** fabricated Lumen/Maya
      sample numbers or proof. **No** `tour_seen` column.
      **DoD**: one-shot overlay over real regions; dismissible; reflects the real (empty) dashboard;
      no persistence. **(P-V, P-XIV)**
- [X] T019 [US5] Confirm the trigger wiring: Finish → `/app?tour=1` (T012) launches the tour; Skip →
      `/app` (no tour); a refresh without the param shows no tour.
      **DoD**: tour appears only on the finish path, once. **(P-XIII)**

**Checkpoint**: the finishing flourish works without gating or nagging.

---

## Phase 8: Polish, Gates & Definition of Done

- [X] T020 [P] **Cores-frozen gate (P-V)**: `src/lib/session.ts` untouched; `brand_kit`/
      `webhook_endpoint` models + their actions reused (not rebuilt); the webhook surface is **not**
      duplicated (only `getOrCreateWebhookEndpoint` used); consent/verification untouched; only the
      enumerated files changed.
      **DoD**: no out-of-scope/core change; else STOP-and-surface.
- [X] T021 [P] **No-new-dep gate (P-III)**: `package.json` dependency count unchanged (**11**); no
      OAuth/provider dependency added.
      **DoD**: count identical to T001 baseline.
- [X] T022 [P] **Migration additive-only gate**: `drizzle/0012_*.sql` is two nullable `ADD COLUMN`
      only; no drop/alter of existing columns; safe on a live table.
      **DoD**: SQL diff is ADD COLUMN ×2.
- [X] T023 [P] **P-XIV no-fabricated-output audit**: Step 4 produces no render/preview; Step 3 preview
      uses only real entered brand; the tour shows the real zeroed dashboard; Step 2 fakes no
      connection.
      **DoD**: zero fabricated output across the flow.
- [X] T024 **Port-fidelity + tokens pass (P-V/P-IV)**: all 4 steps + tour match their binding screens
      (verbatim copy, layout), light + dark, persimmon only on the primary action; responsive at
      480/1024/1280; keyboard-accessible (step nav, skip, tour).
      **DoD**: faithful port; on-token; accessible.
- [X] T025 **Run the quickstart matrix** (`quickstart.md` A–G + resume): note headless-assertable
      (DB writes for business_type/first_format/onboarded_at; gate conditionals; skip effect) vs
      needs-a-real-new-user-session (ported UI, honesty inspection, tour, resume pre-fill).
      **DoD**: every applicable scenario passes; OAuth-free by construction; session-gated ones noted.
- [X] T026 **`npm run lint` and `npm run build` green** (TS strict; no `any`/unjustified `@ts-ignore`).
      **DoD**: both exit 0.

**P-XV / P-XVI**: N/A — non-render slice.

**Definition of done**: new user routes into the wizard, configures (real writes: business_type, brand
kit, first_format), finishes → `onboarded_at` set → app + one-shot tour (US1/US5); deferred states
honest (US2); skip lands onboarded without nag (US3); onboarded/seeded users bypass (US4); cores
frozen + no new dep + additive migration + no fabricated output; quickstart passes; build green. Then
**STOP and report** (P-IX).

---

## Dependencies & Execution Order

- **Setup (T001)** → no deps.
- **Foundational (T002→T003; T004 [P]; T005; T006 [P]; T007; T008)** → blocks all stories. T003
  depends on T002; T007 depends on T004 (writes) + T002 (columns); T008 depends on T004.
- **US1 (T009–T012)** → after Foundational. T009/T010/T011 are different files ([P]-eligible among
  themselves); T012 wires nav/finish after they exist.
- **US2 (T013–T015)** → T013 after Foundational (reuses `getOrCreateWebhookEndpoint`); T014/T015 audit
  US1's T011 / US2's T013.
- **US3 (T016)** → edits `actions.ts` (after T008) + the shell skip control (after T007).
- **US4 (T017)** → verification after T005/T007.
- **US5 (T018–T019)** → after US1 finish (T012) provides the `?tour=1` trigger.
- **Polish/Gates (T020–T026)** → after all stories; T026 is the final green gate.

### Parallel opportunities

- T009 [P] + T010 [P] + T011 [P] (three different step-page files) once Foundational lands.
- T020 [P] + T021 [P] + T022 [P] + T023 [P] (independent audits).
- T004 [P] and T006 [P] within Foundational.

---

## Implementation Strategy

### MVP (US1 + US2 — both P1, ship together)

1. Setup + Foundational (T001–T008).
2. US1 steps 1/3/4 + finish (T009–T012) and US2 step 2 + honesty (T013–T015) — the full honest 4-step
   flow to `onboarded_at`.
3. Validate quickstart A/B/E/F.

### Incremental

1. MVP (US1+US2) → validate.
2. US3 skip → validate (C).
3. US4 bypass → validate (D).
4. US5 tour → validate (G).
5. Gates (T020–T026) → build green → STOP and report.

---

## Notes

- Step 2 lives in US2 because its defining content is the readiness/honesty states; US1's end-to-end
  walk therefore co-requires US2 (both P1).
- Step 3 and Step 2 **reuse** existing actions/queries — no new brand or source model, no duplicated
  webhook surface (P-V).
- The tour is a **query-param one-shot** (no `tour_seen` column) — a mid-tour refresh shows no tour by
  design (research D4).
- If correctness appears to need a frozen-core change (brand/webhook models, session.ts,
  consent/verification), **stop and surface** (P-V).
