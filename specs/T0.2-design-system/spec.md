# Feature Specification: T0.2 — Pressroom design-token system, /styleguide, and the canonical ProofCard

**Feature Branch**: `T0.2-design-system`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "Slice T0.2 — The Pressroom design-token system, a /styleguide, and the canonical ProofCard. Build the COMPLETE Pressroom design system so every later screen is assembled from tokens, and prove it with a /styleguide page and the single most-reused component — the ProofCard ('the clipping')."

## Overview

T0.1 shipped a skeleton with only the paper colour and two fonts. This slice builds the **complete
Pressroom design system** — every colour, font, type-step, radius, spacing step, shadow, width,
breakpoint, and motion token from the constitution's Principle IV — as a Tailwind v4 theme plus CSS
variables, so every later screen is assembled from tokens rather than ad-hoc values. It proves the
system with two artifacts: an internal **/styleguide** page that renders the system in both themes,
and the **canonical ProofCard** ("the clipping") — the single most-reused component in the product.

Getting these right sets the look for everything after T0.2. This slice introduces no data layer;
the ProofCard is rendered from hardcoded props whose shape anticipates the T0.3 proof entity.

**Pre-authorized stack additions for this slice** (explicitly approved by the human, so not a
Principle III deviation): `next-themes` (Daylight/Ink switching with no flash-of-wrong-theme) and
`lucide-react` (line icons at 1.5px stroke).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The complete token system, visible on /styleguide (Priority: P1)

A developer opens the internal **/styleguide** page and sees the entire Pressroom system rendered
from tokens: the full palette as labelled swatches with hex values, the type scale in all three
fonts, the button variants, and the consent-state chips. This is the living reference that proves
every token exists and is wired correctly.

**Why this priority**: The token system is the foundation every later screen depends on. Proving it
on a single page is the smallest thing that demonstrates the system is complete and correct. It is
the MVP — with just this, every future slice can be built from tokens.

**Independent Test**: Open /styleguide and confirm each palette swatch shows its name and the exact
constitution hex; the type scale renders in Fraunces, Hanken Grotesk, and JetBrains Mono; the four
button variants and the three consent chips are present and styled per the Pressroom rules.

**Acceptance Scenarios**:

1. **Given** /styleguide is open, **When** the developer views the palette section, **Then** every
   Daylight colour and every Ink colour from Principle IV (including the dark status colours) is
   shown as a labelled swatch with its exact hex value.
2. **Given** /styleguide is open, **When** the developer views the type section, **Then** the
   display scale (2xl→xs), headings, quote, body, label, and mono styles render in the correct
   families (Fraunces / Hanken Grotesk / JetBrains Mono).
3. **Given** /styleguide is open, **When** the developer views the buttons, **Then** there is a
   persimmon PRIMARY, a solid-ink STRONG SECONDARY, an ink-hairline-outline QUIET secondary, and a
   danger button — and persimmon appears on the primary only.
4. **Given** /styleguide is open, **When** the developer views the chips, **Then** consent states
   render as granted (success), awaiting (warning), and revoked (danger).
5. **Given** the app, **When** the developer looks at the landing ("/"), **Then** /styleguide is
   NOT linked from it (internal/dev route only).

---

### User Story 2 - The canonical ProofCard (Priority: P1)

A developer sees the canonical **ProofCard** ("the clipping") on /styleguide in both a text-proof
and a media-proof variant, ported faithfully from the proof card as it appears in /design-reference
screens **01 Dashboard** and **02 Proof inbox**. The proof itself (the verbatim quote or the
thumbnail) is the largest, warmest element; the card chrome stays quiet.

**Why this priority**: The ProofCard is the single most-reused component in the product and the
first place Principle II ("the customer is the headline") becomes concrete. Every spine screen
reuses it, so it must be canonical before those screens are built.

**Independent Test**: On /styleguide, confirm the text-proof ProofCard leads with the quote in
Fraunces and the media-proof ProofCard leads with a thumbnail; both show customer name, source
glyph, consent dot, captured date, and (when unreviewed) the corner stamp; hovering reveals the
persimmon "Make" action when consent is granted.

**Acceptance Scenarios**:

1. **Given** a text-proof ProofCard, **When** it renders, **Then** the verbatim quote is set in
   Fraunces and is the dominant element of the card; the card is the warm card colour with a 1px
   hairline, 6px (clipping) radius, and the soft single-direction shadow.
2. **Given** a media-proof ProofCard, **When** it renders, **Then** a thumbnail (neutral
   placeholder — no real identifiable person) is the dominant element, with the customer name,
   source glyph, consent dot, and captured date as quiet supporting metadata.
3. **Given** a ProofCard with `consentState = granted`, **When** the developer hovers it, **Then** a
   persimmon "Make" action appears; **Given** `consentState` is awaiting or revoked, **When**
   hovered, **Then** the "Make" action does NOT appear and the card reads as needing consent.
4. **Given** a ProofCard with `reviewed = false`, **When** it renders, **Then** the "Unreviewed"
   corner stamp is shown; **Given** `reviewed = true`, **Then** no stamp is shown.
5. **Given** a ProofCard with `verified = true`, **When** it renders, **Then** the persimmon
   "verified real customer" mark is shown (the only other place persimmon is allowed).
6. **Given** the consent dot, **When** the card renders, **Then** the dot colour reflects the
   consent state (granted = success, awaiting = warning, revoked = danger).

---

### User Story 3 - Daylight / Ink theming with no flash (Priority: P2)

A developer toggles between the **Daylight** (default) and **Ink** themes. The switch is instant
with no flash-of-wrong-theme on load, and the chosen theme persists across reloads. Both themes
pull entirely from the token set, so /styleguide (palette, type, buttons, chips, ProofCard) renders
correctly in each.

**Why this priority**: The system must be theme-aware to be the real foundation, and "no flash" is a
visible quality bar. It is P2 because the Daylight system (US1/US2) is independently usable first;
Ink + the toggle is the next increment.

**Independent Test**: Toggle to Ink and confirm the whole /styleguide (including the ProofCard and
every swatch) switches with no flash; reload and confirm the theme persists; switch back to Daylight
and confirm the same.

**Acceptance Scenarios**:

1. **Given** the default state, **When** the app first paints, **Then** Daylight is applied with no
   flash of the wrong theme.
2. **Given** /styleguide, **When** the developer activates the theme toggle, **Then** every section
   (palette swatches with their Ink hexes, type, buttons, chips, ProofCard) switches to Ink with no
   flash.
3. **Given** the Ink theme is selected, **When** the developer reloads the page, **Then** Ink is
   still applied (the choice persists) and there is no flash of Daylight first.

---

### Edge Cases

- **Consent not granted**: when `consentState` is awaiting or revoked, the persimmon "Make" action
  is suppressed and the card communicates that it needs consent — consistent with Principle VII
  (never offer to generate a clip from non-consented proof).
- **Media proof without a thumbnail**: a neutral placeholder is shown; never a real identifiable
  person and never stock/AI-glossy imagery.
- **Reduced motion**: the hover "Make" reveal and theme transition respect
  `prefers-reduced-motion`.
- **No-JS / first paint**: the theme must not flash the wrong theme before hydration; the styleguide
  content is legible without client interactivity (the theme toggle is the only interactive part).
- **Long quote / long customer name**: the card keeps the proof dominant and truncates or wraps
  supporting metadata gracefully without breaking the layout.
- **Tokens match the export**: the constitution's Principle IV colour values were reconciled to the
  /design-reference exports at v1.1.0, so the token system and the screens we port use the same
  values — there is no token discrepancy to reconcile at build time.

## Requirements *(mandatory)*

### Functional Requirements

**Token system**

- **FR-001**: The full Pressroom palette MUST be defined as design tokens (Tailwind v4 theme + CSS
  variables) using the EXACT hex values from constitution Principle IV — all Daylight colours and
  all Ink colours, including the Ink status colours (ink-3, rule, success, warning, danger) and the
  persimmon-deep omission in dark. No off-token colour values may be introduced.
- **FR-002**: All three brand fonts MUST be wired: **JetBrains Mono** (`--font-mono`) added in this
  slice alongside **Fraunces** (`--font-display`) and **Hanken Grotesk** (`--font-ui`), via
  `next/font/google`.
- **FR-003**: The full type scale MUST be defined as tokens: display 2xl→xs, headings, quote, body,
  label, and mono — mapped to the correct families (display/quote = Fraunces, UI/body/label =
  Hanken Grotesk, mono = JetBrains Mono).
- **FR-004**: Radii tokens MUST be defined: pill `999`, control `8`, clipping `6`, modal `14`.
- **FR-005**: The 4px spacing scale MUST be defined as tokens: 4, 8, 12, 16, 24, 32, 48, 64, 96.
- **FR-006**: The soft single-direction shadow MUST be defined as an elevation token (no gradients,
  glow, or blur).
- **FR-007**: Width tokens (content `1240`, reading `680`) and the breakpoints (`480 / 1024 / 1280`)
  MUST be defined.
- **FR-008**: Motion tokens MUST be defined: fast `120ms`, default `200ms`, celebrate `≤420ms`, and
  the easing `cubic-bezier(0.2,0,0,1)`; motion MUST respect `prefers-reduced-motion`.

**Theming**

- **FR-009**: The app MUST support two themes — **Daylight** (default) and **Ink** — via
  `next-themes`, both pulling entirely from the token set.
- **FR-010**: A theme toggle MUST switch between Daylight and Ink with NO flash-of-wrong-theme on
  load or on switch.
- **FR-011**: The selected theme MUST persist across reloads.

**/styleguide page**

- **FR-012**: An internal **/styleguide** route MUST exist and MUST NOT be linked from the landing
  ("/") or any public surface.
- **FR-013**: /styleguide MUST render, and remain correct in both themes: (a) the palette as
  labelled swatches with hex values; (b) the type scale; (c) the buttons; (d) the consent chips;
  (e) the ProofCard (text and media variants).
- **FR-014**: The button variants MUST follow the Pressroom rules: persimmon **PRIMARY**; solid-ink
  **STRONG SECONDARY**; ink-hairline-outline **QUIET** secondary; **danger** for destructive.
  Persimmon MUST NOT appear on any button other than the primary.
- **FR-015**: The consent chips MUST render the three states: granted = success, awaiting = warning,
  revoked = danger.

**ProofCard ("the clipping")**

- **FR-016**: A canonical **ProofCard** component MUST be ported faithfully from the proof card in
  /design-reference screens **01 Dashboard** and **02 Proof inbox** — a warm card with a 1px
  hairline, the 6px clipping radius, and the soft single-direction shadow. Layout and structure are
  ported; colour/type values come from the constitution tokens (FR-001).
- **FR-017**: The ProofCard MUST be proof-forward: for a text proof the verbatim quote (in Fraunces)
  is the largest, warmest element; for a media proof the thumbnail is the dominant element. Card
  chrome and metadata stay quiet (Principle II).
- **FR-018**: The ProofCard MUST display the supporting metadata as quiet elements: customer name, a
  source glyph (line icon), a consent dot whose colour reflects consent state, and the captured
  date.
- **FR-019**: The ProofCard MUST show an "Unreviewed" corner stamp when `reviewed = false`, and the
  persimmon "verified real customer" mark when `verified = true`.
- **FR-020**: The ProofCard MUST reveal a persimmon **"Make"** action on hover ONLY when
  `consentState = granted`; when consent is awaiting or revoked, the Make action is suppressed and
  the card reads as needing consent. (The Make action is visual-only in this slice; the studio is
  T2.)
- **FR-021**: Any face/thumbnail in this slice MUST use a NEUTRAL placeholder — no real identifiable
  people, no stock or AI-glossy imagery.
- **FR-022**: A **ProofCard props type** MUST be defined anticipating the T0.3 proof entity, with at
  least: `id`, `customerName`, `proofType` (text | video | photo | audio), `quote`/`transcript`,
  `source`, `consentState` (granted | awaiting | revoked), `thumbnail?`, `capturedAt`, `reviewed`,
  `verified`. The shape MUST be chosen so T0.3's schema/fixtures slot in without rework.
- **FR-023**: On /styleguide, the ProofCard MUST be rendered with hardcoded props in both a
  text-proof and a media-proof variant (no data layer in this slice).

**Scope guards**

- **FR-024**: Persimmon MUST remain reserved to the primary action and the "verified real customer"
  mark — nowhere else (Principle IV).
- **FR-025**: This slice MUST NOT build the ClipCard, the nav chrome / command palette, any other
  product screens, the database/schema/fixtures, auth, R2, or jobs.
- **FR-026**: The only new dependencies MUST be the pre-authorized `next-themes` and `lucide-react`;
  no other dependency outside the locked stack.

### Key Entities *(include if feature involves data)*

- **ProofCard props (anticipates the T0.3 `proof` entity)**: `id`; `customerName`; `proofType`
  (text | video | photo | audio); `quote` (for text proof) / `transcript` (for media proof);
  `source` (e.g. Shopify, Stripe, Instagram, Calendly, Square); `consentState` (granted | awaiting |
  revoked); `thumbnail?` (optional media reference; neutral placeholder in this slice); `capturedAt`
  (the captured date); `reviewed` (boolean → corner stamp); `verified` (boolean → "verified real"
  mark). This is a UI props type only in this slice; the real entity and persistence arrive at T0.3,
  and this shape is the contract they must satisfy.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: /styleguide renders the full palette in BOTH Daylight and Ink with the correct
  Principle IV hex values for every swatch.
- **SC-002**: The three fonts render correctly and are visually distinct: Fraunces (display/quote),
  Hanken Grotesk (UI/body), JetBrains Mono (mono).
- **SC-003**: The theme toggle switches Daylight↔Ink with no flash-of-wrong-theme, and the choice
  persists across a reload.
- **SC-004**: The four button variants follow the Pressroom rules, and persimmon appears only on the
  primary button (and nowhere else on the page except the ProofCard's verified/Make marks).
- **SC-005**: The consent chips show granted (success), awaiting (warning), and revoked (danger).
- **SC-006**: The ProofCard matches the /design-reference clipping in both themes; the proof (quote
  or thumbnail) is the visually dominant element; the consent dot reflects state; the unreviewed
  stamp and verified mark appear per their flags; the hover "Make" action appears only when consent
  is granted.
- **SC-007**: /styleguide is reachable directly but is not linked from the landing.
- **SC-008**: typecheck, lint, and build pass with zero errors; CI is green; the page is responsive
  at `480 / 1024 / 1280`, theme-aware, and keyboard-accessible (the toggle and any interactive
  element are reachable and operable by keyboard).
- **SC-009**: No dependency outside the locked stack plus the two pre-authorized additions is added.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: The ProofCard is the first concrete expression of the law —
  the verbatim quote (Fraunces) or the thumbnail is the largest, warmest element; name, source,
  consent dot, date, and stamp are quiet supporting metadata. FR-017 makes this testable.
- **Pressroom tokens (P-IV)**: This slice IS the token system. All values come EXACTLY from
  Principle IV; persimmon stays reserved to the primary action and the "verified real customer"
  mark (FR-024). No off-token values (FR-001).
- **Port, don't redesign (P-V)**: The ProofCard is ported faithfully from screens 01 Dashboard and
  02 Proof inbox (named) — including its colours, since the constitution's tokens were reconciled to
  the export at v1.1.0. The /styleguide is an internal token reference, not a catalogued product
  screen, so it composes ported tokens/components rather than inventing a new product layout.
- **Fixtures-first (P-VI)**: No data layer here; the ProofCard renders from hardcoded props, but the
  props type (FR-022) is shaped to be the contract the T0.3 `proof` schema/fixtures satisfy without
  rework.
- **Consent is sacred (P-VII)**: The consent dot and chips make consent visible; the persimmon
  "Make" action is suppressed unless consent is granted (FR-020), so the UI never offers to generate
  from non-consented proof.
- **No editor (P-VIII)**: Not applicable — no studio/format surface; the "Make" action is visual
  only and leads nowhere in this slice.
- **Coding conventions (P-X)**: Server Components by default; the theme provider/toggle and any
  hover-interactive piece are Client Components only where interactivity requires it. Tokens are
  defined via the Tailwind v4 theme and the global stylesheet (not CSS modules, not inline styles).
  kebab-case files, PascalCase components, TypeScript strict, no `localStorage`/`sessionStorage`
  written by hand (theme persistence is handled by `next-themes`).
- **Never-do (P-XI)**: `/design-reference` and `/docs` are not modified; the two new dependencies
  are pre-authorized; the placeholder uses no real people; microcopy avoids "amazing"/"awesome" and
  emoji.
- **Ambiguity handling (P-XII)**: The export-vs-constitution token discrepancy was surfaced and
  resolved by reconciling the constitution TO the design-reference (v1.1.0), so tokens and ported
  screens agree; the ProofCard is tied to named reference screens.

## Assumptions

- **The design-reference is the authoritative colour source, now reconciled INTO the
  constitution.** An audit of all 66 export screens found the warm tokens split 50-vs-16, where the
  50 core/product screens use the refined palette (paper `#F4F1E8`, card `#FEFDF8`, sunken
  `#E9E5D6`, persimmon `#B5443C`, persimmon-deep `#8F342E`, persimmon-tint `#F5DFD8`) and the 16
  peripheral screens (Authentication, Logos, System) still carry the older values. The constitution
  (Principle IV) and CLAUDE.md §5 were updated to the 50-screen values at **v1.1.0**; neutrals and
  status colours were already unanimous and unchanged. The constitution **remains the single source
  of truth for the build** — it now simply matches the screens we port. FR-001 ("exact Principle IV
  hex values") and the export therefore agree; there is no remaining discrepancy to resolve.
- **/styleguide route**: served at `/styleguide` as an internal/dev route. There is no auth yet, so
  it is reachable directly but is deliberately unlinked from the landing and any public surface.
- **Pre-authorized dependencies**: `next-themes` and `lucide-react` are approved for this slice and
  are the only additions beyond the locked stack. Icons use lucide's 1.5px stroke.
- **Neutral placeholder**: media thumbnails and any "face" use a neutral, non-identifiable
  placeholder (e.g. an initials/monogram tile or a generic shape), never a real person or AI-glossy
  image.
- **"Make" action is visual-only** in this slice — it appears on hover (consent permitting) but
  performs no navigation or generation; the clip studio is T2.
- **Hardcoded ProofCard data**: the text-proof and media-proof examples on /styleguide use
  hardcoded props that conform to the FR-022 props type; no fixtures, schema, or DB are introduced
  (those are T0.3).
- **Dark-mode status colours**: the Ink status colours (ink-3 `#7B7363`, rule `#463D2D`, success
  `#5FB572`, warning `#E3A53A`, danger `#EE7A63`) added to the constitution in v1.0.1 are included;
  persimmon-deep is intentionally omitted in dark.
- **Theme persistence** is handled by `next-themes` (not hand-written storage), satisfying the
  no-`localStorage`/`sessionStorage`-by-hand convention.
