# Phase 0 — Research: T0.2 Design-token system, /styleguide, ProofCard

All decisions are constrained by the constitution v1.1.0 (Principle IV is the token source), the
locked stack + the two pre-authorized additions (`next-themes`, `lucide-react`), and the
"preserve protected files" requirement. No code is written here.

---

## R1. Token wiring — Tailwind v4 theme + two themes

**Decision**: Define the raw token *values* as CSS custom properties in `globals.css`, scoped per
theme, then map them into the Tailwind v4 theme so utilities resolve the runtime variable.

- Daylight values under `:root` (and `[data-theme="daylight"]`); Ink values under
  `[data-theme="ink"]`. Each block sets `--paper`, `--card`, `--sunken`, `--ink`, `--ink-2`,
  `--ink-3`, `--hairline`, `--rule`, `--persimmon`, `--persimmon-deep` (Daylight only),
  `--persimmon-tint`, `--on-accent`, `--success`, `--success-tint`, `--warning`, `--warning-tint`,
  `--danger`, `--danger-tint` — exactly the v1.1.0 hexes.
- Map to utilities with `@theme inline { --color-paper: var(--paper); … }` so `bg-paper`,
  `text-ink`, `border-hairline`, `bg-persimmon`, `text-on-accent`, etc. are generated and remain
  theme-reactive (the `inline` form resolves the variable at use-site, so swapping `data-theme`
  re-themes everything with no rebuild).
- Radii → `@theme { --radius-pill: 999px; --radius-control: 8px; --radius-clip: 6px;
  --radius-modal: 14px; }` → `rounded-pill` / `rounded-control` / `rounded-clip` / `rounded-modal`.
  (Matches Principle IV and the export exactly.)
- Spacing → Tailwind v4's default spacing ramp is 0.25rem-based, so `1/2/3/4/6/8/12/16/24` already
  yield `4/8/12/16/24/32/48/64/96px`. No custom spacing tokens needed; the named steps are covered.
- Widths → `--container-content: 1240px`, `--container-reading: 680px` (or arbitrary `max-w-[...]`
  via a token var). Breakpoints `480 / 1024 / 1280` configured as Tailwind v4 `--breakpoint-*`.
- Motion → `--ease-pressroom: cubic-bezier(0.2,0,0,1)` and duration tokens (`120ms`, `200ms`,
  `420ms`); wrap motion in `@media (prefers-reduced-motion: reduce)` to disable transitions.

**Rationale**: One declaration of values per theme + one `@theme` mapping keeps tokens the single
source and makes theming a `data-theme` swap with no per-component theme logic.
**Alternatives**: per-component dark: variants (rejected — duplicates values, drifts from tokens);
hardcoded hexes (rejected — violates P-IV).

## R2. Theming — next-themes (Daylight default, no flash, persisted)

**Decision**: Wrap the app in a `next-themes` provider (a small Client Component) configured:
`attribute="data-theme"`, `themes={["daylight","ink"]}`, `defaultTheme="daylight"`,
`enableSystem={false}`, `disableTransitionOnChange`. Add `suppressHydrationWarning` to `<html>` in
`layout.tsx`.

- **No-flash**: next-themes injects a tiny blocking script in `<head>` that sets `data-theme`
  before first paint from the persisted value (or the default), so the correct theme paints
  immediately.
- **Persistence**: handled internally by next-themes (its own storage key) — satisfies the "no
  hand-written `localStorage`/`sessionStorage`" convention (the spec explicitly carved this out).
- **Default**: Daylight, deterministic (`enableSystem=false`) per the spec ("Daylight (default)").

**Rationale**: next-themes is the pre-authorized, purpose-built solution for exactly the no-flash +
persistence requirement. **Alternatives**: hand-rolled theme context + storage (rejected — would
require hand-written storage and a custom no-flash script; next-themes is approved).

## R3. Fonts — add JetBrains Mono

**Decision**: In `layout.tsx`, add `JetBrains_Mono` from `next/font/google` as
`variable: "--font-mono"` (subset latin, display swap), alongside the existing Fraunces
(`--font-display`) and Hanken Grotesk (`--font-ui`); apply all three variable classes on `<html>`.
Map `--font-display`/`--font-ui`/`--font-mono` into `@theme` so `font-display` / `font-ui` /
`font-mono` utilities exist.

**Rationale**: Completes the three-family system (Principle IV) using the locked `next/font`
approach. **Alternatives**: `<link>` to Google Fonts (rejected — not self-hosted, off-approach).

## R4. Icons — lucide-react

**Decision**: Use `lucide-react` for the ProofCard source glyph and generic glyphs, rendered at
`strokeWidth={1.5}` and sized via token spacing. Consent state is shown as a coloured dot (token
status colour); lucide icons carry the source/UI glyphs.

**Rationale**: Pre-authorized; tree-shakeable line icons matching the 1.5px Pressroom stroke.
**Alternatives**: inline SVGs (rejected — lucide is approved and consistent).

## R5. ProofCard port (from screens 01 Dashboard / 02 Proof inbox)

**Decision**: Port the `wv-clip` anatomy faithfully into `src/components/proof-card.tsx`:

- **Container**: warm `card` surface, 1px `hairline` border, `rounded-clip` (6px), the soft
  single-direction shadow (R7). On hover it lifts subtly (token motion).
- **Proof region (dominant)**: for `proofType="text"`, the verbatim `quote` in **Fraunces**
  (`font-display`), large and warm — the headline of the card; for media (`video`/`photo`/`audio`),
  a **thumbnail** (neutral placeholder) is dominant, with the `transcript`/caption secondary.
- **Quiet meta row**: an initials avatar + `customerName`; a **source glyph** (lucide) + source
  label in `font-mono`; a **consent dot** coloured by `consentState` (granted=success,
  awaiting=warning, revoked=danger); the **captured date** (`capturedAt`) in `font-mono`.
- **Corner stamp**: an "Unreviewed" stamp when `reviewed === false`.
- **Verified mark**: the persimmon "verified real customer" mark when `verified === true`.
- **Hover "Make"**: a persimmon action revealed on hover **only when `consentState === "granted"`**;
  when not granted, it is suppressed and the card reads as needing consent.

The component is token-only, so it is theme-aware automatically. Visual-only "Make" (studio is T2).

**Rationale**: Faithful port (P-V) with the proof as the largest/warmest element (P-II) and consent
gating (P-VII). **Alternatives**: a redesigned card (rejected — P-V); persimmon on metadata
(rejected — P-IV reservation).

## R6. Persimmon reservation + consent gating

**Decision**: Persimmon (`bg-persimmon`/`text-persimmon`) appears in exactly two places: the
**primary** Button variant, and the ProofCard's **verified mark** + **"Make"** action. The Button
component encodes variants so only `primary` uses persimmon; `strong` = solid `ink`, `quiet` =
transparent with `hairline` border + `ink` text, `danger` = `danger`. The ProofCard derives
`canMake = consentState === "granted"` and only renders the persimmon Make when true.

**Rationale**: Encodes Principle IV's scarcity rule and Principle VII's consent gate in the
components, so misuse is hard. **Alternatives**: ad-hoc button classes (rejected — easy to leak
persimmon).

## R7. Shadow + type-scale exact values (Open items)

**Decision**: Source the exact shadow and type-scale values from the /design-reference export (the
authoritative visual source per the v1.1.0 reconciliation), and **propose recording them into
Principle IV** so the constitution stays the single source.

- **Shadow** (from the export, ink-based, single-direction):
  - `--shadow-clip: 2px 3px 10px -4px rgba(28,23,20,0.14)` (the ProofCard elevation)
  - `--shadow-lift: 6px 10px 26px -10px rgba(28,23,20,0.26)` (hover/lifted)
  - `--shadow-modal: 10px 18px 50px -16px rgba(28,23,20,0.34)` (modals — defined now, used later)
  - `rgba(28,23,20)` = `ink #1C1714`. No glow/blur/gradient — matches Principle IV.
- **Radii / easing** confirmed identical to Principle IV in the export (`r-pill 999`, `r-control 8`,
  `r-clip 6`, `r-modal 14`, `ease cubic-bezier(0.2,0,0,1)`).
- **Type scale**: extract the concrete display 2xl→xs / heading / quote / body / label / mono sizes
  and line-heights from the export's corresponding elements during implementation; map to `--text-*`
  tokens. Families per Principle IV: display/quote = Fraunces, UI/body/label = Hanken, mono =
  JetBrains.

**Rationale**: These visual specifics are not numerically pinned in Principle IV; the export is the
faithful source. Recording them back into the constitution closes the gap.
**Alternatives**: invent a scale/shadow (rejected — not faithful, not token-sourced).

## R8. /styleguide placement

**Decision**: `src/app/styleguide/page.tsx` — a Server Component composing the sections (palette via
`Swatch`, type scale, `Button` variants, `Chip` consent states, `ProofCard` text + media). The
theme toggle (`ThemeToggle`, Client) sits on the page. The route is **not** linked from the landing
(`/`) or any public surface; it is reachable directly as an internal/dev reference.

**Rationale**: Internal reference page, mostly static, with a single interactive toggle.
**Alternatives**: a route group/guard (unnecessary — no auth yet; simply unlinked).

---

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| How tokens wire into Tailwind v4 + 2 themes | CSS vars per theme + `@theme inline` mapping (R1) |
| Theming / no-flash / persistence | next-themes, data-theme, default Daylight (R2) |
| Third font | JetBrains Mono via next/font as `--font-mono` (R3) |
| Icons | lucide-react at 1.5px stroke (R4) |
| ProofCard structure | ported `wv-clip` anatomy from screens 01/02 (R5) |
| Persimmon scarcity + Make gating | encoded in Button + ProofCard (R6) |
| Exact shadow + type-scale values | from the export; proposed for Principle IV (R7 — Open items) |
| /styleguide placement | internal route, unlinked from landing (R8) |

No blocking `NEEDS CLARIFICATION` remain; the two Open items (shadow + type-scale) are flagged for
the human and proposed for the constitution.
