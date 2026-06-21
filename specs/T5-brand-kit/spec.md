# Feature Specification: Brand kit (store the brand's visual identity)

**Feature Branch**: `T5-brand-kit`

**Created**: 2026-06-21

**Status**: Draft — **3 clarifications OPEN** (see "Clarifications to resolve"). Do **not** `/speckit-plan`
until Q1–Q3 are answered by the human.

**Tier**: T5 — Remaining workspace surfaces (T5-BrandKit; the brand-kit rail destination, alongside the
shipped T5-Consent).

**Input**: User description: "T5-BrandKit — Brand kit: store the brand's visual identity (logo, colors,
fonts) for styling the clips Weavova produces, so the output looks like THEIR brand. … The identity
preview is real; the styled-clip preview is the T8 seam."

**Ported from**: `/design-reference/Weavova/The Workspace/11 _ Brand kits` (the list) + `12 _ Brand kit
editor` + `Derived surfaces & states/25 _ New brand kit`. **Critical port-completeness finding (P-V /
the port-completeness rule):** the reference **editor (screen 12) is far richer than the honest,
buildable-now scope** — it depicts **light & dark logos, a brand colour with auto-contrast, caption
font, *and also* per-format caption styles, a default music bed, B-roll cutaways (which is B2's footage
store), and a "Live preview · reskins live"** (a styled-clip preview that **reskins a real customer clip
live**). The styled-clip live preview is **exactly the faked styled-clip preview the fences forbid** —
it is the **T8 render seam**. So this slice is a **partial, honest port**: port the **logo + colours +
fonts** portions of screens 11/12; **hide** (not fake) the music-bed / per-format caption-style / B-roll
/ live-styled-preview controls (T8- or B2-owned), per the **port-completeness rule** and **P-XII**.

---

## Overview

A brand kit stores a workspace's **visual identity** — **logo, colours, fonts** — once, so the clips
Weavova produces can look like **their** brand. It is **owned brand data** (not customer proof, like
B2's footage store) — **no consent** is involved. It is distinct from B2 (reusable *footage*); this is
visual *identity*.

**What it stores (real, owned, workspace-scoped):**
- **Logo** — a real **image upload to R2**, reusing **B2's presigned-PUT path** (the browser PUTs the
  file directly to R2; bytes never transit the server). **No new dependency** — the same `aws4fetch`
  signer, R2 env, and CORS already provisioned for B2 cover it; image type/size validation mirrors B2's
  pattern (an image allowlist + a size cap).
- **Colours** — a small fixed palette of hex values, persisted.
- **Fonts** — a curated selection (pick from available fonts), persisted.

**The honest identity preview (real, buildable now):** the kit shows its **own elements** — the **logo
image as a real `<img>`** when present, **colour swatches** of the saved hex, and **font specimens** of
the saved fonts. These are all genuinely real and directly displayable.

**The T8 seam (the only deferred part):** applying the identity to **style a rendered clip** is the
render engine — **T8**. The kit states this honestly — *"will style your rendered clips when rendering
ships"* — and **never fakes a styled-clip preview**. The **identity preview is real**; the **styled-clip
preview is the T8 seam** (the same seam the rest of the app already keeps honest).

**Honest logo display:** a real uploaded logo shows as an `<img>`; an **absent** logo shows an honest
**"no logo yet — upload one"** state, **never a broken image**. The seed therefore seeds **colours +
fonts** and **leaves the logo for live upload** (or seeds a real R2 logo object) — it does **not** seed
a placeholder URL that would render broken.

**A-11 — every control genuinely works and persists:** upload logo, pick colours, pick fonts, save —
all real and durable. The **only** deferred capability is the identity *applied to the rendered clip*
(the labeled T8 seam). **No dead controls, no faked styled-clip preview.**

**Schema:** a **new `brand_kit` table** (workspace-scoped: logo asset reference, colours, fonts,
optional name) — **additive migration only**. **No change** to existing tables, the consent model,
`derived_asset`, `brand_asset`, or the proof / clip / showcase / consent **read shapes**.

**Byte-stable:** `ProofCard`, the proof / clip / showcase / consent reads, `generateClip`,
`generateBatch`, and the **nav rail** (the `/app/brand` "Brand kits" destination already exists) are
**unchanged**. The kit is **additive** — a new route, a new table, and a logo upload reusing B2's R2
path.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set the brand's colours and fonts, and see the real identity preview (Priority: P1)

A workspace owner opens the brand-kit surface, picks the brand's colours and fonts, saves, and sees a
real identity preview — colour swatches and font specimens of exactly what they saved.

**Why this priority**: It is the slice's core, fully-real MVP — owned identity stored and previewed,
with no upload infrastructure dependency. It stands alone and persists.

**Independent Test**: Open the brand-kit surface; pick colours + fonts; save; reload — the saved colours
and fonts persist and the identity preview (swatches + specimens) reflects them exactly.

**Acceptance Scenarios**:

1. **Given** the brand-kit surface, **When** the owner picks colours and fonts and saves, **Then** the
   selection persists (survives reload) and the identity preview shows the real swatches + font
   specimens.
2. **Given** a saved kit, **When** the owner views the preview, **Then** every element shown is the
   kit's own real data (real hex, real renderable fonts) — nothing fabricated (FR-019).
3. **Given** the surface, **When** the owner reads it, **Then** the styled-clip application is labeled
   as arriving with rendering (T8) — **no** faked styled-clip preview is shown.

---

### User Story 2 - Upload the brand logo (real image to R2) (Priority: P1)

The owner uploads the brand logo; it is genuinely stored (the browser PUTs it directly to R2 via the
B2 presigned-PUT path) and then displayed as a real `<img>` in the identity preview. Before upload, the
logo area shows an honest "no logo yet" state.

**Why this priority**: The logo is the centerpiece of visual identity and the one upload control; it
must genuinely work (A-11) and display honestly (no broken image).

**Independent Test**: With R2 provisioned, upload an image logo; confirm it is stored and shown as an
`<img>`; with no logo, confirm the honest "no logo yet — upload one" state (never a broken image).

**Acceptance Scenarios**:

1. **Given** the brand-kit surface with no logo, **When** the owner views the logo area, **Then** an
   honest "no logo yet — upload one" state is shown (no broken image).
2. **Given** a valid image, **When** the owner uploads it, **Then** it is genuinely stored to R2 (via
   the B2 presigned-PUT path — no new dependency) and shown as a real `<img>` in the preview.
3. **Given** an invalid file (wrong type or too large), **When** the owner tries to upload, **Then** it
   is honestly rejected (validation reusing B2's pattern), with no broken/partial state.

---

### User Story 3 - The kit is reusable, owned, and consent-free (Priority: P2)

The saved kit is the workspace's reusable visual identity — owned brand data, with **no** consent flow
(like B2's footage). It exists to be applied to future output (at T8), and stays available across the
app.

**Why this priority**: It frames the kit's purpose and the consent-free boundary; the storage + preview
(US1/US2) deliver the value, so this is P2.

**Independent Test**: Confirm creating/saving the kit never invokes the consent flow and the kit is
workspace-scoped owned data (no proof/consent linkage).

**Acceptance Scenarios**:

1. **Given** the brand kit, **When** it is created/saved, **Then** **no** consent record/prompt is
   involved (owned brand data — FR-019), and it is workspace-scoped.
2. **Given** a saved kit, **When** the owner returns later, **Then** the same kit (logo, colours, fonts)
   is available — reusable identity, not a one-off.

---

### Edge Cases

- **No logo uploaded**: honest "no logo yet — upload one" placeholder; never a broken `<img>`.
- **Upload without R2 provisioned** (e.g. a dev without creds): the upload control reports an honest
  failure; the rest of the kit (colours/fonts) still works; the build itself stays green without R2 env.
- **Upload fails mid-way / invalid type / oversized**: honest rejection, no partial/broken save.
- **Empty kit (fresh workspace)**: an honest initial state (defaults or blank) the owner can fill —
  never a fabricated kit.
- **The styled-clip application**: always the labeled T8 seam — never a rendered/styled clip preview.
- **Colours/fonts only, no logo**: a valid, savable kit; the preview shows swatches + specimens and the
  honest no-logo state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a brand-kit surface at the existing `/app/brand` rail destination
  where the owner stores the workspace's **visual identity** — **logo, colours, fonts**.
- **FR-002**: The system MUST let the owner pick and **persist colours** (a small fixed hex palette) and
  **fonts** (a curated selection); the saved values MUST survive reload (A-11).
- **FR-003**: The system MUST let the owner **upload a logo image**, genuinely stored to R2 via **B2's
  presigned-PUT path** (browser → R2 direct), with **no new dependency**; image type + size are
  validated reusing B2's pattern.
- **FR-004**: The system MUST show an **honest identity preview** of the kit's own elements — the **logo
  as a real `<img>`** when present, **colour swatches**, and **font specimens** — all real owned data.
- **FR-005**: When no logo is present, the system MUST show an honest **"no logo yet — upload one"**
  state and MUST NOT render a broken image. The seed MUST NOT seed a placeholder logo URL that would
  break (seed colours/fonts; leave the logo for live upload, or seed a real R2 object).
- **FR-006**: The system MUST NOT fake a **styled-clip preview**. Applying the identity to a rendered
  clip is the **T8 render seam**, labeled honestly ("will style your rendered clips when rendering
  ships"). The only deferred capability is this application.
- **FR-007**: Every kit control (upload logo, pick colours, pick fonts, save) MUST genuinely work and
  persist (A-11) — **no dead controls**.
- **FR-008**: The brand kit MUST be **owned brand data** — workspace-scoped, with **no consent** flow,
  record, or prompt (like B2's footage). It MUST NOT touch the consent model (FR-019).
- **FR-009**: The slice MUST add a **new `brand_kit` table** (workspace-scoped: logo reference, colours,
  fonts, optional name) via an **additive migration only** — **no change** to existing tables, the
  consent model, `derived_asset`, `brand_asset`, or the proof / clip / showcase / consent read shapes.
- **FR-010**: The slice MUST keep these **byte-stable**: `ProofCard`, the proof / clip / showcase /
  consent reads, `generateClip`, `generateBatch`, and the **nav rail**. It MUST add **no new
  dependency**. The build MUST stay green **without** R2 env (only the live logo upload needs the
  already-provisioned infra).
- **FR-011**: The slice MUST **port faithfully** the logo/colours/fonts portions of the reference
  brand-kit screens and **hide** (not fake or invent) the out-of-scope controls it depicts (per-format
  caption styles, default music bed, B-roll cutaways, the live styled-clip preview) — those are T8- or
  B2-owned (port-completeness rule).

### Key Entities *(include if feature involves data)*

- **Brand kit (new)**: a workspace's owned visual identity — an optional **name**, a **logo** reference
  (the R2 object, absent until uploaded), a small fixed set of **colours** (hex), and a curated set of
  **fonts**. Workspace-scoped; **no** consent or proof linkage. *(Single vs multiple per workspace =
  Q1.)*
- **Logo object (new, in R2)**: the uploaded brand logo image — a real owned object, referenced by the
  kit; displayed as an `<img>`. Stored via B2's presigned-PUT path.
- **Existing entities (untouched)**: `proof`, `consent`, `derived_asset`, `brand_asset` — the brand kit
  references none of them and changes none of their shapes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The owner can set and **persist** the brand's colours and fonts in one session, and the
  values survive reload — verifiable with **0** lost selections.
- **SC-002**: A valid logo image uploads and then displays as a real `<img>` in **100%** of successful
  uploads; with no logo, the honest "no logo yet" state shows in **100%** of cases — **0** broken
  images.
- **SC-003**: Creating/saving a kit involves the consent flow in **0%** of cases (owned brand data).
- **SC-004**: The styled-clip application is presented as the T8 seam in **100%** of the surface — **0**
  faked styled-clip previews.
- **SC-005**: The slice adds **0** new dependencies and the build is green **without** R2 env (CI
  parity).

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: N/A for the customer-proof sense — the brand kit is the *brand's*
  identity, not customer proof. It does not display customer faces/quotes; it carries the brand's own
  marks. (When applied at T8, the customer stays the headline *inside* the clip; this slice only stores
  identity.)
- **Locked stack (P-III)**: uses Next.js / React / TS, Neon + Drizzle, **R2 via B2's existing
  `aws4fetch` path** — **no new dependency**. Heavy render (applying identity to a clip) stays off
  Vercel → the T8 seam.
- **Pressroom tokens (P-IV)**: the surface uses only on-token colour/type/spacing; note the **brand
  kit's own colours/fonts are the brand's data shown as swatches/specimens** (content), distinct from
  the Pressroom chrome (which stays on-token). Persimmon stays on the primary action only.
- **Port, don't redesign (P-V)**: ports the logo/colours/fonts portions of reference screens 11/12/25;
  **hides** the out-of-scope controls (music bed, per-format caption style, B-roll, live styled preview)
  per the port-completeness rule, and raises the multi-kit vs single-kit shape as **Q1** (P-XII) rather
  than guessing.
- **Fixtures-first (P-VI)**: built and demonstrated on fixtures shaped like the real schema; the seed
  seeds colours/fonts and the honest no-logo state (no broken placeholder). The new table's fixture
  shape is the schema contract.
- **Consent (P-VII)**: N/A — the brand kit is **owned brand data**, **outside** the consent model (like
  B2's footage); it never invokes consent and never gates on it. The consent model is untouched.
- **No editor (P-VIII)**: the brand-kit *editor* is a settings form (logo/colours/fonts pickers), **not**
  a clip timeline/track/scrubber — it edits identity data, not video.
- **Scope (P-IX, P-XI)**: one vertical slice — store + preview the visual identity. No styled-clip
  rendering (T8), no music beds / per-format caption styles / B-roll (T8 or B2), no font-file upload
  (Q2), no onboarding quickstart (screen 3 is a later tier).
- **Microcopy (P-XI)**: copy avoids "amazing"/"awesome" and emoji; the T8 seam is stated plainly.

## Clarifications to resolve *(blocking — human decision, the B-pattern)*

Surfaced, not assumed. Leans noted (the user gave one for each).

### Question 1: Kit count — a single brand kit per workspace, or multiple kits?

**Context**: The reference shows **multiple** kits — screen 11 is a **"Brand kits" list** ("New kit",
"DEFAULT", "Holiday Edit", "Workshops") and screen 12 is a **per-kit editor at `/app/brand/[id]`**. A
single-kit v1 would port the **editor as the whole `/app/brand` surface** (no list, no `[id]` route).

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Single kit per workspace (v1)** | Simplest: `/app/brand` is the one editor; no list, no `[id]` route, no kit-switching. Ports screen 12 only. **(User lean.)** Multiple kits a later expansion. |
| B | **Multiple kits** | Ports screen 11 (list) + 12 (editor) + the `/app/brand/[id]` route + create/select/delete. Matches the reference fully; larger slice. |
| Custom | Your own | e.g. single kit now, list shell visible-but-inert. |

**Lean (user)**: A — single kit for v1; simpler. **Your choice**: ____

### Question 2: Fonts — a curated selection, or font-file upload?

**Context**: The reference shows a **curated pick** (Hanken Grotesk / Fraunces). Font-file upload adds
file handling + licensing concerns.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Curated selection** (pick from available fonts) | No font-file upload, no licensing; pick from a known, renderable list. Matches the reference. **(User lean.)** |
| B | **Font-file upload** | The brand's exact fonts, but adds file handling + licensing + render-embedding concerns — heavier, later. |
| Custom | Your own | — |

**Lean (user)**: A — curated selection v1; avoids font-file upload + licensing. **Your choice**: ____

### Question 3: Colour palette — how many slots, and what roles?

**Context**: The reference shows essentially **one brand colour with auto-contrast**. The user wants "a
small fixed palette."

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **One brand colour (+ auto-contrast)** | Closest to the reference; minimal. Auto-contrast (light/dark on the brand colour) is derived, not stored. |
| B | **A small fixed set** (e.g. primary + accent + background) | A richer identity (2–3 named slots), still fixed/simple. **(User lean — "a small fixed set".)** |
| Custom | Your own (name the slots/count) | — |

**Lean (user)**: B — a small fixed set (e.g. primary + accent + background). **Your choice**: ____

## Assumptions

- The actor is the workspace owner (the only role in the fixtures/stub session today).
- **Logo count**: a **single logo** in v1 (the reference shows light & dark logos; **light/dark is
  deferred** — simpler, matches the single-kit-v1 minimalism). Adjustable if you'd rather port light &
  dark now.
- **R2 reuse**: the logo upload reuses B2's `r2.ts` presigned-PUT path + `aws4fetch` exactly — **no new
  dependency**; the same R2 env + CORS (already provisioned for B2) cover it. The build stays green
  **without** R2 env; only the live upload needs the infra.
- **Image validation**: an image allowlist (e.g. PNG / JPEG / SVG / WebP) + a size cap, mirroring B2's
  `ALLOWED_UPLOAD_TYPES` / `MAX_UPLOAD_BYTES` pattern (a new image-specific allowlist, the same
  mechanism).
- **Seed**: seeds colours + fonts and the honest **no-logo** state (no broken placeholder URL); a real
  seeded R2 logo object is optional.
- **No schema change beyond the additive `brand_kit` table**; no consent involvement; no new dependency;
  `/app/brand` rail destination already exists (no nav change).
- Out of scope (T8 or later): styled-clip rendering, music beds, per-format caption styles, B-roll
  cutaways (B2), font-file upload, the onboarding brand quickstart.
