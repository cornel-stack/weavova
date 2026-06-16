# Feature Specification: Clip Studio (the spine finale)

**Feature Branch**: `T2.4b-clip-studio`

**Created**: 2026-06-16

**Status**: Draft — clarifications RESOLVED (Q1→B, Q2→A, Q3→A). **PARKED**: do not `/speckit.plan` this
slice until the schema sub-slice **T2.4a** (derived-asset schema + revocation cascade + seed + the
dashboard/detail reads) has shipped. This slice is the studio **UI + stubbed generate**; it writes into
the `derived_asset` table T2.4a creates and re-checks consent at generate.

**Tier**: T2 — The spine (T2.4b — clip studio UI; the spine finale, following T2.4a)

**Input**: User description: "T2.4 — Clip studio. Author the spec for the clip studio at screen 04 —
opened from the proof detail's consent-gated 'Make a clip' — where a merchant configures and generates
a post-ready clip from a piece of proof, WITHOUT a video editor. Derive it from CLAUDE.md, the
constitution, the Render & Proof Spec in docs/ (the render contract), and design-reference/ screen 04.
Render is STUBBED; consent re-checked at generate; A-11 + FR-019 govern."

**Ported from**: `/design-reference/Weavova/The spine/04 _ Clip studio  _studio.(html|png)` (screen 04).

**Render contract**: `docs/Weavova-Render-Proof-Spec.md` (v0.2) — the `RenderInput` discriminated union
(§4), the hook→review→payoff timeline (§3), the pre-render pipeline (§5), and the trust layer (§7).

---

## Overview

The Clip studio is the **finale of the spine** (Dashboard → Proof inbox → Proof detail → **Clip
studio**). It opens **from a piece of proof** — the proof detail's consent-gated "Make a clip" — not
from a nav menu, as the studio is where a merchant turns one verified, consented testimonial into a
post-ready vertical clip **without ever touching a video editor** (Principle VIII). The merchant
*configures* (chooses the shape of the clip and edits the brand-authored hook) and *generates*; the
system does the assembly. There is no timeline, track, or scrubber the user edits.

In this slice the **render is stubbed**: "Generate" plays the signature **press-run** animation and
returns a **pre-made sample clip** from object storage. The real render engine — the Remotion
template-family pipeline (transcribe → correct → highlight → reframe → assemble → render) — is **T8**.
The stub MUST be presented **honestly** (FR-019): it is a clearly-marked **sample/preview standing in
for the real render of this proof**, never passed off as a fabricated personalized render of the
customer's words.

Two laws bind this slice hard. **Consent Is Sacred (P-VII)**: even though the studio is only reachable
from a granted proof, consent is **re-checked at generate time** — if consent is no longer granted
(revoked between opening and generating), the clip cannot be rendered. **We never fabricate the
customer's testimony (the render spec's governing law, FR-019)**: the studio shows only configuration
the merchant actually controls and data Weavova actually owns; pictured controls that depend on the
T7/T8 pipeline or on data the fixtures don't carry are not rendered with invented values.

This slice ports screen 04's **configure-and-generate** flow faithfully and stubs the render. It does
**not** build the real render engine, transcription, highlight/caption editing, the cutaway/product-
media library, a music library, multiple brand kits, publishing/distribution, or the batch studio —
those are later tiers.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the studio and configure a clip from a consented proof (Priority: P1)

A workspace owner viewing a granted proof activates "Make a clip" and the clip studio opens over the
proof, showing a preview and a small set of configuration controls (the clip's format, and the
brand-authored hook) — no editor, no timeline. They adjust the configuration and see it reflected.

**Why this priority**: This is the reason the studio exists and the destination of the spine's primary
action. It is the MVP — a real, no-editor configure surface opened from consented proof.

**Independent Test**: From a granted proof's detail, activate "Make a clip"; confirm the studio opens
(as an overlay over the proof, inside the AppChrome), shows the configuration controls the slice
supports, and reflects changes — with no timeline/track/scrubber to edit.

**Acceptance Scenarios**:

1. **Given** a granted proof's detail, **When** the owner activates "Make a clip", **Then** the clip
   studio opens over the proof (screen-04 layout) inside the existing AppChrome, with a close
   affordance back to the proof.
2. **Given** the studio is open, **When** it renders, **Then** it shows the configuration controls this
   slice supports (the clip **format**, and the **editable hook**) and a **Generate** action — and
   **no** timeline/track/scrubber the user edits (Principle VIII).
3. **Given** the configuration, **When** the owner changes a supported control (e.g. selects a format,
   edits the hook), **Then** the change is reflected in the studio (and carried into the generate step).
4. **Given** the hook field, **When** it renders, **Then** the hook is clearly the **brand's** words
   (editable, visually/semantically separate from the customer's quote), never presented as something
   the customer said (render spec §7.4).

---

### User Story 2 - Generate a clip and get an honest result (Priority: P1)

The owner activates "Generate"; the studio plays the press-run animation and presents the resulting
clip — clearly framed as a **sample/preview** standing in for the real render (which arrives with the
engine), never as a fabricated personalized render of this customer's testimony.

**Why this priority**: Generating is the studio's payoff and the end of the spine demo. It ships with
Story 1. The honest framing of the stub is non-negotiable (the governing law).

**Independent Test**: Activate "Generate" on a granted proof; confirm the press-run animation plays
(respecting reduced-motion), a clip result appears, and it is unambiguously labelled as a sample/preview
standing in for the real render — with no claim that it is a personalized render of this proof's words.

**Acceptance Scenarios**:

1. **Given** a granted proof in the studio, **When** the owner activates "Generate", **Then** the
   signature **press-run** animation plays (a clip fills bottom-up like ink; honoured `prefers-reduced-
   motion`) and a clip result is presented.
2. **Given** the generated result, **When** it is shown, **Then** it is **clearly marked as a sample /
   preview** that stands in for the real render until the engine ships (FR-019) — it does **not** claim
   to be a render of this customer's actual words/voice, and no fabricated transcript, caption, or
   personalized footage is presented as theirs.
3. **Given** the stub, **When** it returns the sample, **Then** the same honest sample is used regardless
   of the chosen configuration (the stub cannot truly render the config) and this limitation is not
   hidden — the configuration is captured/previewed conceptually, not falsely reflected in the sample.

---

### User Story 3 - Consent is re-checked at generate; revocation blocks the render (Priority: P1)

When the owner activates "Generate", the system re-checks the proof's **current** consent. If consent
is not currently granted (e.g. it was revoked after the studio opened), the clip is **not** rendered
and the owner sees an honest block explaining consent is required — no clip is produced.

**Why this priority**: Consent Is Sacred (P-VII). A clip made from non-consented proof is the exact
violation the product exists to prevent; this guarantee is P1 alongside generating.

**Independent Test**: Open the studio for a proof, simulate consent being revoked, then activate
"Generate"; confirm no clip is produced and an honest consent-required state is shown — and that a
proof whose effective consent is not "granted" can never reach a rendered clip.

**Acceptance Scenarios**:

1. **Given** a proof whose effective consent is "granted" when the studio opens, **When** the owner
   activates "Generate" and consent is still granted, **Then** the (stubbed) render proceeds.
2. **Given** the proof's consent has been revoked (or is awaiting) at generate time, **When** the owner
   activates "Generate", **Then** the render is **blocked**, no clip is produced, and an honest
   "consent required" message is shown (not a raw error).
3. **Given** the consent gate, **When** any generate is attempted, **Then** the decision is based on the
   proof's **current effective consent** read at generate time, not a value cached when the studio
   opened.

---

### User Story 4 - The studio is an honest port (no fabricated controls or values) (Priority: P2)

The studio shows only configuration the merchant controls and data Weavova owns. Screen 04's controls
that depend on the T7/T8 pipeline or on data the fixtures don't carry — AI-matched **cutaways** /
product-media, a **music** library, **multiple brand kits**, the **scene/highlight timeline**, and the
**AI hook/cutaway suggestions** — are **not rendered with invented values**.

**Why this priority**: Faithful porting under A-11 + the governing law. The studio must feel complete for
*configuring and generating*, not be a panel of dead controls or fabricated AI output. Secondary to the
generate flow itself.

**Independent Test**: Inspect the rendered studio; confirm no cutaway/product-media picker with invented
"matched" shots, no music library, no multi-brand-kit selector, no scene/highlight timeline, and no
fabricated AI suggestions appear — only the supported, owned controls.

**Acceptance Scenarios**:

1. **Given** the studio renders, **When** it shows configuration, **Then** it does **not** present the
   cutaway/product-media stitching (no product-media data exists; the AI "we picked shots that match
   what they said" matching is T8) — neither greyed-out nor with fabricated matches.
2. **Given** the studio renders, **When** it shows configuration, **Then** it does **not** present a
   music-track library or a multi-brand-kit selector backed by data that does not exist (FR-019).
3. **Given** the studio renders, **When** it shows the preview/result, **Then** it does **not** present
   a user-editable scene/highlight timeline or fabricated "auto-stitched · N scenes" / caption data
   (highlight selection, captions, and the segmented timeline are T8 — render spec §5, §6).

---

### User Story 5 - The studio is reliable and handles its states (Priority: P2)

The studio surfaces an explicit loading state, recovers transparently from a Neon cold start on the
reads it needs, shows a clear retryable error on genuine failure, and opens/closes cleanly over the
proof — reusing the T2.1–T2.3 reliability patterns.

**Why this priority**: Essential for the studio to feel trustworthy, but secondary to configuring,
generating, and the consent gate. Reuses proven building blocks (`withDbRetry`, the shared
`<ErrorState>`).

**Independent Test**: Simulate a slow/transient read and a persistent failure around opening the studio
/ generating; confirm the loading state, transparent recovery, and the shared error state with retry;
confirm the studio opens and closes back to the proof without breaking the chrome.

**Acceptance Scenarios**:

1. **Given** the studio is opening or generating, **When** a read is in flight, **Then** a loading state
   is shown using Pressroom tokens (the press-run animation covers the generate wait).
2. **Given** a transient cold-start failure, **When** the studio's read runs, **Then** it is retried
   transparently (`withDbRetry`) and the studio renders on recovery, no error surfaced.
3. **Given** a failure that persists past the retry policy, **When** the read/generate fails, **Then**
   the shared `<ErrorState>` is shown with a retry affordance and no raw error text.
4. **Given** the studio is open, **When** the owner closes it, **Then** they return to the proof detail
   with the chrome intact.

---

### Edge Cases

- **Consent revoked between open and generate**: covered by US3 — the render is blocked at generate time
  on the current effective consent.
- **Reaching the studio for a non-granted proof directly** (crafted URL, not via "Make a clip"): the
  studio must not render a clip path; it shows the same honest consent-required state (the gate is
  enforced at the studio, not only at the entry button).
- **Reaching the studio for a missing or cross-workspace proof id**: the same tenant-isolation not-found
  behaviour as the proof detail (T2.3) — never another workspace's proof, no leak.
- **No real media for the proof** (every fixture: video/audio/photo carry no media file): the stub does
  not need the source media; it returns the sample. The studio never fabricates the customer's footage
  or a per-proof preview that implies real rendered media.
- **Generate activated repeatedly**: re-generating returns the same honest sample without error or
  duplicate fabricated metrics.
- **Reduced motion**: the press-run animation settles instantly (no animation) under `prefers-reduced-
  motion`; the result is still presented.
- **Text/photo proof vs video/audio**: the studio's supported configuration is the same regardless of
  type in this slice (the type-specific template families are T8); nothing implies a spoken render of a
  text/photo proof (render spec §1 — never synthesize a voice).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The studio MUST be reachable **only from the proof detail's "Make a clip"** action
  (wiring the action that was inert in T2.3), at `/app/proof/[id]/studio`, rendered **as an overlay over
  the proof** inside the existing T1 AppChrome — without modifying the chrome, rail, top bar, switcher,
  or command palette, and with a close affordance back to the proof.
- **FR-002**: The studio MUST read the proof it acts on via the **workspace-scoped** read used by the
  proof detail (the T2.3 `getProof`), wrapped in `withDbRetry`; a missing or cross-workspace id yields
  the same honest not-found behaviour as the detail (tenant isolation, no leak). No proof content is
  hardcoded.
- **FR-003**: The studio MUST be a **configure-and-generate** surface with **no video editor** (Principle
  VIII): no timeline, track, or scrubber the user edits. The user's actions are limited to choosing
  supported configuration and activating Generate; the system performs assembly.
- **FR-004 (Q3→A)**: The studio MUST expose exactly **two** configuration controls plus Generate: the
  **clip format** — a selectable control drawn from the render contract's owned `Format` aspect set
  (9×16 / 1×1 / 4×5 / 16×9), defaulting to the vertical default — and the **editable hook** (FR-005).
  It MUST NOT render music, brand-kit, cutaway, or scene controls (FR-011). Screen-04's template-style
  presets (Raw review / UGC / Quote card …) are a T8 template-family concern and are **not** the format
  control here.
- **FR-005**: The studio MUST expose an **editable hook** — the **brand-authored** marketing line that
  teases the clip — pre-filled with a sensible, **non-fabricated** default (a brand-side placeholder or
  the proof's own words clearly framed as a starting point, **not** an AI-generated suggestion). The
  hook MUST be visually and semantically distinct from the customer's quote and never presented as the
  customer's words (render spec §7.4). The AI hook-suggestion machinery is T8 and is not built here.
- **FR-006**: The studio MUST provide a **Generate** action that, in this slice, **stubs the render**:
  it plays the signature **press-run** animation (a clip fills bottom-up like ink; ≤ celebrate timing;
  honours `prefers-reduced-motion`) and returns a **pre-made sample clip** from object storage. The real
  render engine (Remotion template family + pipeline) is **T8** and is not built here.
- **FR-007 (honest stub, FR-019 — Q2→A)**: The generated result MUST be **explicitly labelled a
  sample / preview** that stands in for the real render until the engine ships, with copy that makes the
  stand-in unmistakable (the merchant is previewing the *experience*, not a render of their customer).
  It MUST NOT be presented as a render of the customer's actual words/voice/footage, MUST NOT show a
  fabricated transcript/caption/scene as theirs, and MUST NOT vary deceptively by configuration (the
  stub returns the same honest sample regardless of config; this limitation is surfaced, not hidden).
  The press-run plays, then the labelled sample reveals.
- **FR-008 (consent re-check, P-VII)**: At **generate time**, the studio MUST re-read the proof's
  **current effective consent** and **block the render** when it is not "granted" (revoked or awaiting),
  producing **no** clip and showing an honest "consent required" state (not a raw error). The gate MUST
  be enforced at the studio itself (not only at the entry button), so a directly-reached studio for a
  non-granted proof also cannot render.
- **FR-009 (persistence — derived asset; Q1→B)**: Persistence is **split out** to the prior schema
  sub-slice **T2.4a**, which creates the `derived_asset` table (with the `consentId` FK + revocation
  cascade), seeds it, and lights up the dashboard/detail clip markers. **This studio slice does NOT
  change the schema.** On a successful (consent-passed) Generate, the studio **writes a `derived_asset`
  row** into the table T2.4a created — referencing the source proof and the governing consent, pointing
  at the stubbed sample clip — so the dashboard "clips this month" / latest-clip and the detail
  "Generated assets" reflect it through T2.4a's reads.
- **FR-010 (P-VII)**: The clip the studio persists MUST reference the **consent** it was made under
  (`consentId`), so the **revocation cascade built in T2.4a** withdraws it when the proof's consent is
  revoked — no orphaned clip outlives its consent. The studio never writes a `derived_asset` for a proof
  whose consent is not "granted" at generate time (FR-008).
- **FR-011 (honest port, A-11 / FR-019)**: Screen 04's controls that depend on data Weavova does not own
  or on the T7/T8 pipeline MUST NOT be rendered with invented values:
  - **FR-011a**: The **cutaways / product-media** stitching (the "we picked shots that match what they
    said" b-roll) MUST NOT be rendered — there is no product-media data and the transcript-driven
    matching is T8.
  - **FR-011b**: A **music-track library** and a **multiple-brand-kit** selector MUST NOT be rendered
    with non-existent data (no music or brand-kit fixtures exist); the brand applied is the Pressroom
    default.
  - **FR-011c**: A user-editable **scene/highlight timeline**, **caption** data, and a fabricated
    **"auto-stitched · N scenes"** count MUST NOT be rendered (highlight selection, captions, and the
    segmented timeline are T8 — render spec §3, §5, §6).
- **FR-012**: The studio MUST NOT display any metric Weavova does not own end-to-end (views, reach,
  engagement, warmth/sentiment) — consistent with the T2.1–T2.3 data-ownership rule (FR-019).
- **FR-013**: The studio MUST reuse the T2.1–T2.3 reliability pattern: its reads are wrapped in
  `withDbRetry`; a transient cold start is retried transparently behind a loading state; a genuine
  failure shows the **shared `<ErrorState>`** (with retry, no raw error text).
- **FR-014**: The studio MUST present an explicit **loading state** (on-token), and the **press-run
  animation** MUST cover the generate wait.
- **FR-015**: The studio MUST be **responsive** across the Pressroom breakpoints (480 / 1024 / 1280 +
  1240 max): the configuration panel and preview reflow without horizontal scroll or overlap; on narrow
  viewports the overlay remains usable.
- **FR-016**: The studio MUST be **keyboard-accessible**: opening from "Make a clip", the format and hook
  controls, Generate, and the close affordance are reachable and operable by keyboard with visible
  focus; the overlay traps/returns focus appropriately and closes on the standard affordance.
- **FR-017**: All product **microcopy** MUST match screen 04's wording where it specifies it, MUST be
  honest about the stub and absent data, and MUST avoid "amazing"/"awesome" and emoji (P-XI).
- **FR-018**: The slice MUST NOT build the real render engine (T8), transcription/caption editing,
  highlight selection, the cutaway/product-media library, a music library, multiple brand kits,
  publishing/distribution, or the batch studio. It MUST NOT introduce a **new dependency** unless
  genuinely required (and if so, it MUST be flagged and justified), MUST keep the canonical ProofCard
  byte-unchanged if referenced, and MUST keep the auth/session seam unchanged.

### Key Entities *(include if feature involves data)*

- **Proof**: the single consented testimonial the clip is made from (type, words, customer, source,
  effective consent). The studio acts on one proof, read workspace-scoped (T2.3). (Existing, T0.3.)
- **Consent**: versioned, revocable; the **effective** state is re-checked at generate (P-VII). The clip
  may only be rendered/persisted while consent is "granted". (Existing, T0.3.)
- **Clip configuration (transient)**: the merchant's choices this slice supports — the **format** and the
  **editable hook** — a subset of the render contract's `RenderInput`. Carried into generate; persisted
  only if Q1 chooses persistence. (New, this slice — shape from `docs/` §4.)
- **Derived asset / clip**: the generated clip record — the table with the **`consentId` FK + revocation
  cascade**. The **table is created and seeded by T2.4a** (Q1→B); this studio slice **writes a row** into
  it on a consent-passed Generate. It backs the dashboard "clips this month" / latest-clip and the detail
  "Generated assets" (lit by T2.4a's reads).
- **Sample clip (stub)**: the pre-made clip returned by the stubbed Generate, from object storage —
  presented honestly as a stand-in for the real render, **not** a per-proof rendered asset. (Stub.)
- **NOT modelled here**: product-media / cutaways, a music-track library, multiple brand kits, the
  transcript/caption/highlight timeline — all T7/T8; not fabricated (FR-011, FR-019).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a granted proof, an owner opens the studio, configures (format + hook), and generates
  a clip in under 30 seconds on the seeded data, entirely from "Make a clip" — without any timeline
  editing.
- **SC-002**: 0 timeline/track/scrubber editing controls are present (Principle VIII) — the user only
  configures and generates.
- **SC-003**: 100% of generated results are clearly labelled as a sample/preview standing in for the
  real render; 0 results present fabricated customer words/voice/footage/captions as the customer's
  (the governing law / FR-019), verifiable across all four proof types.
- **SC-004**: 0 clips are rendered (or persisted, if Q1 = persist) for any proof whose effective consent
  is not "granted" at generate time, including when consent is revoked after the studio opens (P-VII).
- **SC-005**: 0 fabricated controls/values appear — no cutaway/product-media matches, no music library,
  no multi-brand-kit selector, no scene/highlight timeline, no "auto-stitched · N scenes" count, no
  reach/views/warmth — verifiable by inspection (FR-011, FR-012).
- **SC-006**: On a transient cold-start failure the studio recovers without the user seeing an error; an
  error state appears only on persistent failure, and a retry from it succeeds; the studio opens and
  closes back to the proof with the chrome intact.
- **SC-007**: The studio renders without horizontal scroll, overlap, or unreachable controls at each
  breakpoint (≤480, 1024, 1280, 1240px max), and is fully keyboard-operable.
- **SC-008**: Generating a clip (consent-passed) increments the dashboard's "clips this month" and
  surfaces it on the proof detail (via T2.4a's reads), and revoking the proof's consent withdraws it
  (T2.4a's cascade) — verifiable by observing with no code edit.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: The clip's *review beat* is the customer's real words; the hook is
  clearly the brand's framing, separated from their quote (render spec §3, §7.4). The studio chrome
  stays quiet; the proof stays loud. The stub never dresses up fabricated words as the customer's.
- **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4, Neon + Drizzle, R2 for the
  sample clip. No new dependency unless genuinely required (flagged — FR-018). Heavy render stays **off
  Vercel**, stubbed → sample clip until T8.
- **Pressroom tokens (P-IV)**: Token utilities only; the press-run is the signature motion. Persimmon
  reserved for the primary action ("Make a clip" / "Generate") and the verified mark.
- **Port, don't redesign (P-V)**: Ported from screen 04. The **A-11 port-completeness rule** governs:
  the supported config (format, hook, generate) renders; the pipeline/un-owned controls (cutaways, music
  library, multi-brand, scene/highlight timeline, AI suggestions) are **not** rendered with fabricated
  values; undesigned states (consent-required, not-found, loading, error) are surfaced as derived
  states, not invented. Screen-04 ambiguities are raised as Q1–Q3, not guessed (P-XII).
- **Fixtures-first (P-VI)**: The studio reads the existing fixtures via the T0.3 query layer
  (workspace-scoped `getProof`). If Q1 = persist, the `derived_asset` table is added **with the schema
  written before** the screens that read it (the dashboard/detail markers already exist, waiting).
- **Consent (P-VII)**: Consent is re-checked at generate; no clip from non-consented proof; if persisted,
  the clip carries the `consentId` and the revocation cascade withdraws it. **This is the slice where the
  consent→derived-asset cascade modelled at T0.3 first does real work** (if Q1 = persist).
- **No editor (P-VIII)**: Explicitly honoured — a configure-and-generate surface (format picker + hook +
  generate), **not** a timeline/track/scrubber. The system assembles; the human configures and approves.
- **Scope (P-IX, P-XI)**: A single vertical slice (T2.4) — the studio surface + stubbed generate (+
  persistence iff Q1). The real engine, transcription, cutaways, music, brand kits, publishing, and batch
  studio are out of scope. No speculative additions.
- **Microcopy (P-XI)**: Matches screen 04, is honest about the stub and absent data, avoids
  "amazing"/"awesome" and emoji.

## Assumptions

- **A-01 (opened from "Make a clip", consent-gated)**: The only entry is the proof detail's "Make a clip"
  (granted-only, wired here from its T2.3 inert state). The studio route is `/app/proof/[id]/studio`
  (CLAUDE.md sitemap — an overlay over the proof). Direct/crafted access still enforces consent +
  tenant isolation at the studio.
- **A-02 (render stubbed → sample clip from R2)**: Per CLAUDE.md Phase 1, Generate runs the press-run
  animation and returns a pre-made sample clip from R2 behind the same UI the real engine swaps into at
  T8. A sample clip asset is assumed available in R2 (or a clearly-marked placeholder stands in).
- **A-03 (no-editor is literal)**: No timeline/track/scrubber editing. Screen 04's preview scrubber and
  "auto-stitched · N scenes" are render *output* chrome, not user editing controls, and depend on the T8
  pipeline — not rendered as editable here (FR-011c).
- **A-04 (config = a subset of `RenderInput`)**: The studio configures only the owned, merchant-facing
  fields that don't require the pipeline — **format** and the brand-authored **hook** (render spec §4).
  Transcript/captions, highlight, reframe, cutaways, music licensing, and consent-display resolution are
  **resolved upstream by the T7/T8 pipeline** (render spec §4 note, §5) and are not built here.
- **A-05 (hook is brand-authored, not AI, not the customer's)**: The hook field is editable brand
  copy with a non-fabricated default; the LLM hook-suggestion (render spec §11.2) is T8. The hook is
  never rendered as the customer's words (render spec §7.4).
- **A-06 (no product-media / music / brand-kit data)**: The schema/fixtures carry no product-media,
  music, or brand-kit tables (only workspace/source/proof/consent). So cutaways, a music library, and a
  multi-brand-kit selector have **no backing data** and are not rendered (FR-011, FR-019). The Pressroom
  brand is the only brand.
- **A-07 (sample differs from fixtures; config doesn't change the sample)**: Screen 04's sample (Lumen /
  Maria L. / "repurchased three times" / cutaway grid) is export content; our studio renders against OUR
  seeded proof, and the **stub returns the same sample regardless of configuration** — surfaced honestly
  (FR-007), since a real per-config render is T8.
- **A-08 (reuse T2.1–T2.3 building blocks)**: `withDbRetry`, the shared `<ErrorState>`, the loading
  pattern, and the workspace-scoped `getProof` are reused; the consent-required and not-found states are
  honest derived states (no design-reference screen for them — P-XII).
- **A-09 (DEPENDENCY — the real engine is T8)**: The Remotion template family, the transcribe → correct
  → highlight → reframe → assemble pipeline, the approval gate, transcription provider, and per-type
  templates are **T8** (render spec §5, §10). T2.4 stands in for render with the sample and stays behind
  the same UI seam so the T8 swap is mechanical.
- **A-10 (DEPENDENCY — derived_asset is built by T2.4a, this slice's prerequisite)**: T0.3 documented
  `derived_asset.consentId → consent.id` + revocation cascade as "built at T2", without creating the
  table. Per Q1→B, the sub-slice **T2.4a** creates + seeds the table, builds the cascade, and swaps the
  dashboard/detail clip markers (`clipsThisMonth`, latest clip, "Generated assets") to real reads. This
  studio slice (T2.4b) is **parked until T2.4a ships**, then writes into that table on Generate.
- **A-11 (PORT-COMPLETENESS meta-rule — carried from T2.2/T2.3)**: A faithful port does not render a
  pictured control that cannot work or whose data does not exist. The studio must feel complete for
  *configuring and generating*, not be a panel of greyed-out/ fabricated controls. This governs every
  "pictured but not-yet-functional" decision here (cutaways, music, brand library, scene timeline, AI
  suggestions).

## Clarifications

> Three screen-04 / scope ambiguities were surfaced (Principle XII + the governing data-honesty law)
> rather than guessed. **All three are now RESOLVED** (human decisions, 2026-06-16) and folded into the
> requirements/assumptions above. **Q1 → B** splits persistence into the prior schema sub-slice **T2.4a**;
> this studio slice is consequently **PARKED** until T2.4a ships, then planned/built as the UI that writes
> into T2.4a's `derived_asset` table.

### Question 1 — RESOLVED (B): persistence is split into the schema sub-slice T2.4a

**Context**: Generate's natural effect is a clip that **persists** — lighting up the dashboard's "clips
this month" / latest-clip and the detail's "Generated assets", and exercising the **consent →
derived-asset revocation cascade** T0.3 modelled but never built. That is the first schema change since
T0.3 and is constitution-critical (P-VII).

**Resolution** (human decision, 2026-06-16): **Option B — split.** A prior, focused sub-slice **T2.4a**
builds the `derived_asset` table (the `consentId` FK + revocation cascade), seeds it, and swaps the
dashboard/detail markers to real reads — schema written before the screens (P-VI), the cascade isolated
and tested on its own. **This studio slice (T2.4b) does not change the schema**; it **writes into**
T2.4a's `derived_asset` on a consent-passed Generate and re-checks consent at generate. T2.4b is
**PARKED** — planned only after T2.4a ships. Captured in **FR-009/FR-010** and **A-10**.

### Question 2 — RESOLVED (A): the sample result is explicitly labelled a sample/preview

**Resolution** (human decision, 2026-06-16): **Option A.** The press-run plays, then the result reveals
**explicitly labelled a sample / preview** standing in for the real render until the engine ships — the
merchant is previewing the experience, not a render of their customer. Never a finished-looking clip
passed off as theirs; never fabricated customer words/voice/footage/captions. Captured in **FR-007**.

### Question 3 — RESOLVED (A): the studio exposes Format + editable hook + Generate only

**Resolution** (human decision, 2026-06-16): **Option A.** The studio exposes exactly the **clip format**
(the owned render-contract aspect set — 9×16 / 1×1 / 4×5 / 16×9), the **editable hook** (brand-authored,
non-AI default), and **Generate**. Cutaways/product-media, a music library, a multi-brand-kit selector,
the scene/highlight timeline, and AI suggestions are **not rendered** — the data/pipeline they need is
T7/T8 (FR-011, FR-019). Screen-04's template-style presets are a T8 template-family concern, not the
format control. Captured in **FR-004** and **FR-011**.
