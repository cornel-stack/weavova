# Feature Specification: T6.2 — Onboarding Wizard

**Feature Branch**: `T6.2-onboarding-wizard`

**Created**: 2026-07-02

**Status**: Draft

**Input**: User description: "Onboarding Wizard — the workspace-configuration flow that runs after
T6.1 creates a workspace. A brand-new user (workspace.onboarded_at IS NULL) is walked through a
4-step wizard (business type → source → brand → format) plus a dashboard spotlight tour, then
onboarded_at is set."

---

## Step 0 — Design-sync check (MANDATORY, done first)

**Result: PASS.** All 5 onboarding designs are present in the repo as paired HTML + PNG under
`design-reference/Weavova/Onboarding/` (read-only; port faithfully, do not redesign — P-V):

| # | Screen | Files found |
|---|---|---|
| 1 | Business type (`_onboard_role`) | `1 _ Business type  _onboard_role.html` + `.png` |
| 2 | Connect a source (`_onboard_source`) | `2 _ Connect a source  _onboard_source.html` + `.png` |
| 3 | Brand quickstart (`_onboard_brand`) | `3 _ Brand quickstart  _onboard_brand.html` + `.png` |
| 4 | First format (`_onboard_format`) | `4 _ First format  _onboard_format.html` + `.png` |
| 5 | Dashboard spotlight tour | `5 _ Dashboard spotlight tour.html` + `.png` |

Verbatim copy, options, and structure are lifted from these files below. The wizard chrome shows a
4-step progress rail (**1 Business · 2 Source · 3 Brand · 4 Format**), a global **"Skip for now"**
affordance (top-right on every step), **Back / Continue** per step, and **"Step N of 4"**. The tour
is a separate **"Tour · N of 5"** spotlight overlay with **Skip tour / Next**.

---

## Grounding — what already exists vs what's new (verified in code)

| Capability | State at spec time | This slice |
|---|---|---|
| `workspace.onboarded_at` | **Exists** (T6.1) — NULL = un-onboarded | Read by the gate; **set** on finish/skip |
| Brand kit write path | **Exists** — `upsertBrandKit(workspaceId, {name, logoAssetUrl, brandColor, fonts})` | Reused by Step 3 (no new brand schema) |
| Public brand bucket | **Exists** — `assetUrlForKey` public class (T7.4a) | Step 3 logo upload uses it |
| Per-workspace webhook secret | **Exists** — `getOrCreateWebhookEndpoint` (T7.4) | Step 2 surfaces the real webhook URL + secret |
| "Coming soon" pattern for unwired integrations | **Exists** — request-builder Shopify/Stripe/Calendly honest "coming" (T7.3) | Step 2 native connectors reuse it |
| `business_type` on workspace | **Does NOT exist** | **New additive column** (Step 1) |
| `first_format` on workspace | **Does NOT exist** | **New additive column** (Step 4) |
| `/onboard/*` routes | **Do NOT exist** (fresh build) | New routes: `/onboard/role · /source · /brand · /format` |
| Render engine | **Not built** (T8) | Step 4 sets a preference only — **no render, no fabricated preview** |

---

## Readiness map (the crux — honest states where capability is deferred)

- **Step 1 — Business type: FULLY REAL.** Six choices (E-commerce · Services & bookings · SaaS ·
  Local business · Creator · Agency), each with the design's subcopy. Writes a real `business_type`
  preference. Copy: "This sets your smart defaults — you can change anything later."
- **Step 2 — Connect a source: PARTIAL, with an explicit seam.** "Where should proof come from?
  Connect one now, or just use a link." The **generic webhook / "works with anything" (Automation:
  Zapier/Make/n8n/Pipedream → one Weavova webhook)** path is **REAL** — it surfaces the workspace's
  real webhook URL + secret (reusing the T7.4 endpoint). The **native connectors (Shopify, Stripe,
  Instagram) and the other unwired integration cards (Forward order emails, Ask after delivery)** are
  **honest "coming" states** (the deferred Sources track), **NOT dead controls**. **This step does NOT
  build any Sources-track OAuth** — it presents the choices, wires the real webhook path, and leaves
  the native connectors as honest "coming" the Sources track fills in later behind the same UI.
- **Step 3 — Brand quickstart: LARGELY REAL.** "One logo, one colour, one font — your clips will wear
  this." Logo (optional) → the public brand bucket; one brand colour; one caption font (Grotesk /
  Serif); a **live preview** rendered from the entered values. Writes a real brand kit.
- **Step 4 — First format: PREFERENCE-ONLY.** "Pick your first format. We'll start you here — switch
  any time in the studio." Choices (Raw review · UGC · Digital product · Physical product · Quote
  card). Sets a `first_format` default T8 will later honour. **Rendering is not live** — this step
  produces **no clip and no fabricated preview output** (P-XIV).
- **Step 5 — Dashboard spotlight tour: REAL overlay.** A 5-step guided spotlight over the **real**
  dashboard ("Your masthead — the numbers that matter…"), with **Skip tour / Next**. It highlights the
  new user's own dashboard regions; it does **not** inject the design's sample Lumen/Maya numbers — on
  a fresh empty workspace the masthead the tour points at is the honest zeroed state (T6.1).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A new user configures their workspace and lands onboarded (Priority: P1) 🎯 MVP

A user whose workspace is freshly created (`onboarded_at IS NULL`) is routed into the wizard, walks
Business → Source → Brand → Format, and on **Finish setup** their choices are saved and the workspace
is marked onboarded so they enter the app configured.

**Why this priority**: This is the reason the wizard exists — it turns the empty workspace T6.1
creates into a configured one, and closes the "un-onboarded" state so the app is usable and personal.

**Independent Test**: As a NULL-onboarded user, complete all four steps; confirm `business_type`, the
brand kit, and `first_format` are persisted, `onboarded_at` is set, and the user lands in the app.

**Acceptance Scenarios**:

1. **Given** a signed-in user whose current workspace has `onboarded_at IS NULL`, **When** they load
   any app route, **Then** they are routed into the wizard starting at Step 1 (Business type).
2. **Given** Step 1, **When** they pick a business type and Continue, **Then** the choice is saved as
   the workspace `business_type` and Step 2 shows with "✓ Business" in the progress rail.
3. **Given** Step 3, **When** they set a logo/colour/font and Continue, **Then** a brand kit is
   written for the workspace (logo stored in the public brand bucket) and the live preview reflects
   the entered values.
4. **Given** Step 4, **When** they pick a format and **Finish setup**, **Then** `first_format` is
   saved, `onboarded_at` is set, and they are taken to the dashboard. No clip is rendered.
5. **Given** a completed wizard, **When** the user later loads an app route, **Then** the wizard does
   **not** show again (the gate sees `onboarded_at` set).

---

### User Story 2 — Deferred capabilities are honest, never dead or faked (Priority: P1)

Where the underlying capability is not yet built, the wizard shows an honest "coming" state or a
preference-only choice — never a dead control and never fabricated output.

**Why this priority**: P-XIII/P-XIV are central to the product's counter-positioning. A wizard that
implies working native connectors or a faked render would be dishonest and would erode trust on the
very first run.

**Independent Test**: On Step 2, confirm the webhook path is genuinely usable and each native
connector is an honest "coming" affordance; on Step 4, confirm no render/preview output is produced.

**Acceptance Scenarios**:

1. **Given** Step 2, **When** the user chooses the Automation / webhook path, **Then** they see the
   workspace's **real** webhook URL + secret (the T7.4 endpoint) — a working configuration, not a
   placeholder.
2. **Given** Step 2, **When** the user selects a native connector (Shopify / Stripe / Instagram) or an
   unwired integration card, **Then** they get an honest "coming" explanation (consistent with the
   existing requests "coming soon" pattern) and can still proceed — no dead control, no fake success.
3. **Given** Step 4, **When** the user picks a format, **Then** the app stores the preference and shows
   **no** rendered clip or fabricated preview; any design element implying output is presented honestly
   as "coming at render" rather than as a produced asset.

---

### User Story 3 — Skip anytime, land onboarded, never nagged (Priority: P2)

At any wizard step the user can "Skip for now"; they are marked onboarded and taken to the app, and
the wizard does not re-appear on later visits.

**Why this priority**: A forced setup that re-prompts is hostile. Skipping must be a first-class,
honest exit that doesn't trap the user or nag them — but it's secondary to the core configured path.

**Independent Test**: Start the wizard, "Skip for now" on Step 2; confirm `onboarded_at` is set and
the user lands in the app; reload — the wizard does not show.

**Acceptance Scenarios**:

1. **Given** any wizard step, **When** the user chooses "Skip for now", **Then** `onboarded_at` is set
   and they are taken to the app.
2. **Given** a skipped wizard, **When** the user returns later, **Then** the wizard does not re-appear.
3. **Given** a skip, **Then** no partial/garbage config is written — only the choices the user
   actually made before skipping are persisted (an untouched step leaves its field unset).

---

### User Story 4 — Already-onboarded and seeded users bypass the wizard (Priority: P2)

Users whose workspace is already onboarded — including the seeded Lumen owner — never see the wizard.

**Why this priority**: The gate must be surgically correct. If it fired for existing users it would
interrupt real work and re-collect settled config. Protecting the existing path matters as much as
adding the new one.

**Independent Test**: Sign in as the seeded owner (`onboarded_at` set by T6.1's seed); confirm no
wizard, straight to the app.

**Acceptance Scenarios**:

1. **Given** the seeded Lumen owner, **When** they sign in, **Then** they go straight to the app; the
   wizard never shows.
2. **Given** any user whose current workspace has `onboarded_at` set, **When** they load an app route,
   **Then** the gate does not redirect them into the wizard.

---

### User Story 5 — Dashboard spotlight tour (Priority: P3)

Immediately after Finish setup, a 5-step spotlight tour highlights the real dashboard; it can be
skipped or stepped through, and does not block the app.

**Why this priority**: A helpful finishing flourish over surfaces that already exist. Valuable but not
essential — the workspace is fully configured and usable without it.

**Independent Test**: Finish the wizard; confirm the tour starts on the dashboard ("Tour · 1 of 5"),
Next advances through 5 steps over real regions, and Skip tour dismisses it.

**Acceptance Scenarios**:

1. **Given** the user just finished the wizard, **When** the dashboard loads, **Then** the spotlight
   tour begins at step 1 ("Your masthead…") over the real masthead region.
2. **Given** the tour, **When** the user clicks Next, **Then** it advances through its 5 steps; **When**
   they click Skip tour (or finish the last step), **Then** the overlay is dismissed and the dashboard
   is fully usable.
3. **Given** a fresh empty workspace, **When** the tour highlights the masthead, **Then** it reflects
   the honest zeroed dashboard — it does **not** show fabricated sample numbers or proof.

---

### Edge Cases

- **Mid-wizard exit without skip (close tab / navigate away).** Steps saved so far persist;
  `onboarded_at` stays NULL, so the gate resumes the wizard on the next visit. (Onboarding is
  resumable, not lost.)
- **Multiple app routes hit while un-onboarded.** Every app route redirects to the wizard until
  `onboarded_at` is set — no app surface is reachable in the un-onboarded state (except the wizard and
  sign-out).
- **Logo upload fails or is skipped.** Logo is optional; the brand kit saves without it, and the live
  preview shows the no-logo honest default.
- **Tour abandoned.** Since `onboarded_at` is already set at Finish setup, abandoning the tour leaves
  the user onboarded — the tour never re-triggers and never re-blocks.
- **User with multiple workspaces (future).** The gate evaluates the **current** workspace's
  `onboarded_at`; onboarding one workspace does not force it on another. (Multi-workspace UI is out of
  scope; the gate must simply key on the resolved current workspace.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST route a signed-in user whose current workspace has `onboarded_at IS
  NULL` into the wizard (starting at, or resuming within, the 4 steps) and MUST NOT allow app surfaces
  to render for that workspace until onboarding is completed or skipped.
- **FR-002**: The system MUST NOT show the wizard for a workspace whose `onboarded_at` is set,
  including the seeded Lumen owner (byte-stable existing-user experience).
- **FR-003**: Step 1 MUST present the six business types from the design with their subcopy and MUST
  persist the selection as the workspace `business_type`.
- **FR-004**: Step 2 MUST surface the workspace's real webhook URL + secret (reusing the existing
  per-workspace webhook endpoint) as a working "connect anything" path.
- **FR-005**: Step 2 MUST present the native connectors (Shopify, Stripe, Instagram) and any other
  unwired integration cards as honest "coming" states (consistent with the existing requests "coming
  soon" copy) — every rendered control either works or is an explicit "coming" state; none is dead,
  and none fakes a connection. This step MUST NOT implement any native-connector OAuth.
- **FR-006**: Step 3 MUST let the user set an optional logo, one brand colour, and one caption font
  with a live preview, and MUST persist them via the existing brand-kit write path; the logo MUST be
  stored in the public brand-asset store.
- **FR-007**: Step 4 MUST present the format choices from the design and persist the selection as the
  workspace `first_format` preference. It MUST NOT render a clip or display any fabricated preview
  output; rendering is explicitly deferred.
- **FR-008**: Completing the wizard (Finish setup) MUST set `onboarded_at` and take the user to the
  dashboard.
- **FR-009**: "Skip for now" MUST be available on every wizard step, MUST set `onboarded_at`, and MUST
  take the user to the app — after which the wizard MUST NOT re-appear.
- **FR-010**: A skip or mid-wizard exit MUST persist only the choices the user actually made; no
  partial/fabricated configuration is written for untouched steps.
- **FR-011**: The wizard MUST show the design's progress rail ("1 Business · 2 Source · 3 Brand · 4
  Format", completed steps marked), "Step N of 4", and Back/Continue, ported faithfully in both light
  and dark, on the Pressroom tokens.
- **FR-012**: After Finish setup, the system MUST present the 5-step dashboard spotlight tour over the
  real dashboard regions, with Skip tour / Next, non-blocking and dismissible; it MUST reflect the
  user's real (possibly empty) dashboard and MUST NOT display fabricated sample data.
- **FR-013**: The tour MUST NOT gate onboarding — `onboarded_at` is already set at Finish setup, so
  abandoning the tour leaves the user onboarded and the tour does not re-trigger.
- **FR-014**: New configuration MUST be additive only (`business_type`, `first_format` on the
  workspace); the wizard MUST reuse the existing brand-kit, webhook, and dashboard models without new
  source models, and MUST NOT alter the token/consent/verification cores (P-V frozen).

### Key Entities *(include if data involved)*

- **Workspace**: gains `business_type` (Step 1) and `first_format` (Step 4) as additive fields, plus
  the existing `onboarded_at` (set on finish/skip). Its `onboarded_at` state drives the routing gate.
- **Brand kit**: the existing per-workspace visual identity (logo, colour, fonts) written by Step 3.
- **Webhook endpoint**: the existing per-workspace webhook (URL + secret) surfaced by Step 2.
- **Business type**: a fixed set of merchant categories (E-commerce, Services & bookings, SaaS, Local
  business, Creator, Agency) that seed later smart defaults.
- **First format**: a fixed set of starting formats (Raw review, UGC, Digital product, Physical
  product, Quote card) — a preference honoured by the render engine later, not a produced asset now.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can go from a freshly created workspace to a configured, onboarded workspace
  by completing four short steps, with no dead controls and no fabricated output at any step.
- **SC-002**: 100% of wizard completions persist the user's business type, brand kit, and first-format
  preference and set `onboarded_at`; the wizard never re-appears afterward.
- **SC-003**: 100% of "Skip for now" actions set `onboarded_at` and land the user in the app, with the
  wizard never re-appearing and no fabricated config written for skipped steps.
- **SC-004**: 0% of already-onboarded users (including the seeded owner) are shown the wizard.
- **SC-005**: On Step 2, the webhook path is a working configuration (real URL + secret) and every
  native connector is an honest "coming" affordance — verifiable by inspection, with zero controls
  that appear functional but do nothing.
- **SC-006**: Step 4 produces zero rendered clips and zero fabricated previews (render remains
  deferred), while still saving the chosen preference.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: N/A for produced proof (the wizard configures the workspace).
  The flow is the merchant honestly setting up their own workspace; Step 3's preview uses the
  merchant's real entered brand, and the tour points at the real (empty) dashboard, never a fabricated
  headline customer.
- **Port, don't redesign (P-V)**: all five surfaces are ported faithfully from the named
  `design-reference/Weavova/Onboarding/` files (Step 0). Reuses T6.1 `onboarded_at`, T7.4 webhook,
  the brand-kit model, and the dashboard. No layout is invented; where the design implies a deferred
  capability, that is handled as an honest state, not a redesign. Any divergence is a recorded
  decision, not an invention (P-XII).
- **Fixtures-first (P-VI)**: the wizard reads/writes the real schema (additive `business_type`/
  `first_format`, the existing brand-kit and webhook models); a fresh workspace is the honest
  zero-config case.
- **Consent (P-VII)**: N/A — the wizard creates no proof or derived asset; no consent surface is
  involved.
- **No editor (P-VIII)**: Step 4 is a **format picker**, not a timeline/track/scrubber, and produces
  no render — consistent with the no-editor principle.
- **Scope (P-IX)**: one vertical slice — the 4-step wizard + tour + the routing gate + two additive
  fields. Native-connector OAuth (Sources track) and the render engine (T8) are explicitly out.
- **Microcopy (P-XVII)**: all copy is lifted verbatim from the designs; no "amazing"/"awesome", no
  emoji added.
- **Port-completeness (P-XIII)**: Step 2 native connectors and Step 4 rendering are honest "coming"/
  preference states; the Step 2 webhook path is genuinely live. No dead controls; no fabricated render.
- **Owned data only (P-XIV)**: no fabricated previews, counts, or sample data — Step 3's preview and
  the tour reflect only the user's real entered/owned data (including the honest empty dashboard).
- **Plan-not-code (P-XV)**: N/A — non-render slice (Step 4 sets a preference; no runtime composition).
- **No-LLM-in-render (P-XVI)**: N/A — non-render slice (no render engine in this slice).

## Assumptions

- **Cores frozen (P-V).** Reuses T6.1 (`onboarded_at`), the brand-kit model + public brand bucket
  (T7.4a), and the per-workspace webhook (T7.4). The token/consent/verification cores are unchanged.
  If correctness appears to need a frozen-core change, work stops and surfaces the conflict.
- **New config lives on the workspace.** `business_type` and `first_format` are per-workspace
  singletons → additive workspace columns. No new source model (Step 2 reuses the webhook).
- **The wizard routes live under `/onboard/*`** (per the CLAUDE.md sitemap: role/source/brand/format);
  they are a fresh build. The routing gate keys on the current workspace's `onboarded_at`.
- **Reuse the existing "coming soon" pattern** (T7.3 request-builder) for Step 2 native connectors so
  honesty copy is consistent across the app.

### Recommended defaults for the open questions (baked in; flag to change before `/speckit.plan`)

- **Config homes** → `business_type` and `first_format` are **new additive workspace columns**
  (recommend nullable text with a code-side allowlist, matching the `source.kind` precedent; an enum
  is the alternative). Brand kit and webhook already have homes. Adopted in FR-003/007/014.
- **Skip semantics** → "Skip for now" **sets `onboarded_at`** (don't nag). Adopted in FR-009.
- **Per-step vs global skip** → the design shows a single top-right "Skip for now" on every step →
  **global skip** (skips the remaining wizard). Adopted in FR-009.
- **Tour flow / re-trigger** → `onboarded_at` is set at **Finish setup / skip** (before the tour); the
  tour is a **non-blocking one-shot** overlay that runs right after finishing and does **not**
  re-trigger or persist a separate flag. Adopted in FR-012/FR-013.
- **Step 2 native-connector copy** → **reuse the T7.3 "coming soon" pattern** for consistency.
  Adopted in FR-005.

### Out of scope

- Native-connector OAuth / the Sources track (Shopify/Stripe/Instagram/AfterShip/etc.) — honest
  "coming" only.
- The render engine and any real preview/clip output (T8) — Step 4 is preference-only.
- Editing `business_type`/`first_format`/brand later from settings (the wizard writes them; a
  dedicated settings editor is a separate concern), and multi-workspace onboarding UI.
