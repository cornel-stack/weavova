# Implementation Plan: T0.2 — Pressroom design-token system, /styleguide, and the canonical ProofCard

**Branch**: `T0.2-design-system` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T0.2-design-system/spec.md`

> **PLANNING ONLY GUARD (this command).** This document is the technical plan. No application/
> component code is written, nothing is scaffolded, nothing is installed by this command. Execution
> happens later in `/speckit.tasks` → `/speckit.implement`, only after human approval.

## Summary

Build the complete **Pressroom design-token system** as a Tailwind v4 theme + CSS variables, sourced
from the reconciled constitution **v1.1.0** (Principle IV) — every Daylight and Ink colour (incl.
status tints and `on-accent`), the three font families (adding **JetBrains Mono** / `--font-mono`),
the type scale, radii, the 4px spacing scale, the soft single-direction shadow, widths, breakpoints,
and motion tokens. Add **Daylight + Ink theming** via `next-themes` (default Daylight, no
flash-of-wrong-theme, persisted). Prove the system with an internal **/styleguide** page (not linked
from the landing) rendering the palette, type, buttons, consent chips, and the **canonical
ProofCard** ("the clipping") — ported faithfully from /design-reference screens 01 Dashboard / 02
Proof inbox, proof-forward per Principle II, with a `ProofCard` props type shaped to be the T0.3
`proof` entity contract.

Only two new dependencies, both pre-authorized: `next-themes` and `lucide-react`. This slice builds
on the T0.1 scaffold already on `main`; the T0.1 landing's hard-coded `background:#f7f2e8` in
`globals.css` is replaced by the token-driven `paper #F4F1E8`.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19; Next.js 15 (App Router); Node 20 (CI).

**Primary Dependencies**: Next.js 15, Tailwind CSS v4 (`@tailwindcss/postcss`), `next/font/google`
(Fraunces, Hanken Grotesk, **JetBrains Mono**). **New (pre-authorized)**: `next-themes`,
`lucide-react`. No other dependency is added.

**Storage**: N/A — no DB/schema/fixtures (T0.3). The ProofCard renders from hardcoded props.

**Testing**: No unit-test framework added (tests optional per spec); verification via
`typecheck` / `lint` / `build`, CI, and manual checks on /styleguide in both themes.

**Target Platform**: Vercel; modern evergreen browsers.

**Project Type**: Web application — single Next.js app at repo root.

**Performance Goals**: Not a focus; /styleguide is a static-ish reference page (the theme toggle is
the only interactive piece). No-flash theming is the one hard quality bar.

**Constraints**: All visual values come from the tokens (constitution v1.1.0 Principle IV); no
off-token values. Persimmon reserved to the primary action and the "verified real customer"/"Make"
marks. Tailwind classes + the global stylesheet for tokens only — no CSS modules, no inline styles.
Server Components by default; Client Components only where interactivity requires (theme
provider/toggle, hover). No hand-written `localStorage`/`sessionStorage` (theme persistence is
`next-themes`). Preserve `CLAUDE.md` (marker-only), `design-reference/`, `docs/`, `.specify/`.

**Scale/Scope**: One token layer, one theme provider + toggle, one /styleguide route, and the
component set it needs (Button, Chip, ProofCard, plus a styleguide-local Swatch). No other screens.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` **v1.1.0**. Re-check after design.*

| Gate (principle) | Verdict | Justification |
|---|---|---|
| Customer is the headline (P-II) | PASS | The ProofCard leads with the verbatim quote (Fraunces) or the thumbnail as the largest, warmest element; name/source/dot/date/stamp stay quiet. Enforced by the proof-card contract. |
| Locked stack (P-III) | PASS | Next 15 / React 19 / TS strict / Tailwind v4 + `next/font` only, plus the two pre-authorized additions `next-themes` and `lucide-react`. Nothing else added. |
| Pressroom tokens (P-IV) | PASS | All colours/radii/spacing/widths/breakpoints/motion/type-scale/shadow come from Principle IV (now **v1.1.1**, which records the exact type-scale and shadow values reconciled from the export). Persimmon reserved to primary + verified/Make (FR-024). The two previously-flagged gaps are resolved — see *Open items* below. |
| Port, don't redesign (P-V) | PASS | ProofCard ported from screens 01/02 (named); /styleguide is an internal token reference, not a catalogued product screen. |
| Fixtures-first (P-VI) | PASS | No data layer; the `ProofCard` props type is shaped as the contract the T0.3 `proof` schema/fixtures must satisfy without rework. |
| Consent is sacred (P-VII) | PASS | Consent dot + chips make state visible; the persimmon "Make" is suppressed unless `consentState = granted` (FR-020) — UI never offers to generate from non-consented proof. |
| No editor (P-VIII) | N/A | "Make" is visual-only; no studio/format surface. |
| Coding conventions (P-X) | PASS | Server Components default; Client only for `ThemeProvider`/`ThemeToggle`/hover. Tokens via Tailwind `@theme` + globals.css (no CSS modules/inline styles). kebab-case files, PascalCase components, TS strict. Theme persistence via `next-themes` (no hand-written web storage). |
| Never-do (P-XI) | PASS | `/design-reference` and `/docs` untouched; deps pre-authorized; thumbnails use a neutral placeholder (no real people); microcopy avoids "amazing"/"awesome" and emoji. |
| Ambiguity handling (P-XII) | PASS | Colour reconciliation resolved at v1.1.0; the type-scale/shadow value gaps are surfaced here rather than guessed silently. |

**Result: PASS.** No violations. The two previously-flagged gaps (type-scale + shadow exact values)
are now resolved and recorded in Principle IV v1.1.1 (see *Open items*); Complexity Tracking is
empty.

### Open items — RESOLVED (recorded in Principle IV at v1.1.1)

1. **Exact shadow values — RESOLVED.** The export's shadow tokens are now named elevation tokens in
   Principle IV (v1.1.1): `--shadow-clip 2px 3px 10px -4px rgba(28,23,20,.14)` (cards/clipping),
   `--shadow-lift 6px 10px 26px -10px rgba(28,23,20,.26)` (hover), `--shadow-modal 10px 18px 50px
   -16px rgba(28,23,20,.34)` (modals). Confirmed soft single-direction (no glow/blur/inset).
2. **Exact type-scale sizes — RESOLVED.** Principle IV (v1.1.1) now carries the named type scale
   (display 2xl→xs, heading lg/md/sm, quote, body, body-sm, label, mono) with size/line-height and
   family per step, reconciled from the export.

Both are recorded in the constitution, which remains the single source for the build. Build against
Principle IV v1.1.1.

## Project Structure

### Documentation (this feature)

```text
specs/T0.2-design-system/
├── spec.md
├── plan.md              # this file
├── research.md          # token-wiring, theming, font, icon, port decisions
├── data-model.md        # ProofCard props type (anticipates T0.3 proof entity)
├── quickstart.md        # validation scenarios (SC-001..SC-009)
└── contracts/
    ├── design-tokens.md # the token contract (CSS vars + Tailwind utilities + values)
    ├── proof-card.md    # the ProofCard component contract
    └── styleguide.md    # the /styleguide page contract
```

### Source Code (repository root) — PLANNED, created later by /speckit.implement

```text
src/
├── app/
│   ├── globals.css              # EXTEND: token vars (Daylight + Ink) + @theme mapping; drop the
│   │                            #   hard-coded T0.1 paper; motion/reduced-motion
│   ├── layout.tsx               # EDIT: add JetBrains Mono (--font-mono); wrap <ThemeProvider>;
│   │                            #   suppressHydrationWarning on <html>; default theme Daylight
│   ├── page.tsx                 # (unchanged — now reads paper from the token)
│   └── styleguide/
│       └── page.tsx             # NEW: internal styleguide (Server Component) composing sections
├── components/
│   ├── theme-provider.tsx       # NEW (Client): next-themes provider wrapper
│   ├── theme-toggle.tsx         # NEW (Client): Daylight/Ink toggle (lucide icon)
│   ├── proof-card.tsx           # NEW: canonical ProofCard ("the clipping")
│   └── ui/
│       ├── button.tsx           # NEW: Button variants (primary/strong/quiet/danger)
│       ├── chip.tsx             # NEW: consent-state chip (granted/awaiting/revoked)
│       └── swatch.tsx           # NEW: styleguide palette swatch (label + hex)
├── lib/
│   └── proof.ts                 # NEW: ProofType, ConsentState, ProofCardProps (the T0.3 contract)
└── (no public/ changes)

.github/workflows/ci.yml         # UNCHANGED (typecheck + lint + build already green)
package.json                     # EDIT: add next-themes, lucide-react
CLAUDE.md                        # marker block only → points at this plan
```

**Structure Decision**: Tokens live in `globals.css` (raw CSS variables per theme) mapped into the
Tailwind v4 theme via `@theme inline`, so utilities (`bg-card`, `text-ink`, `rounded-clip`, …)
resolve the runtime, theme-dependent variable. Components are token-only and therefore
theme-agnostic. The theme provider/toggle and any hover-interactive element are the only Client
Components. The `ProofCard` props type lives in `src/lib/proof.ts` as the forward contract for T0.3.

## Phase 0 — Outline & Research

See [research.md](./research.md). Decisions to resolve:

1. **Token wiring (Tailwind v4 + two themes)** — raw values as CSS vars under a Daylight selector
   and an Ink selector; `@theme inline` maps `--color-*`, `--radius-*`, `--text-*`, `--shadow-*`,
   `--ease-*` to utilities; the 4px spacing scale maps onto Tailwind's default 0.25rem spacing.
2. **Theming with next-themes** — `attribute="data-theme"`, `themes=["daylight","ink"]`,
   `defaultTheme="daylight"`, `enableSystem=false`; `suppressHydrationWarning`; the injected
   pre-paint script gives no-flash; persistence is built in.
3. **Fonts** — add JetBrains Mono via `next/font/google` as `--font-mono`; keep Fraunces/Hanken.
4. **Icons** — `lucide-react` at `strokeWidth={1.5}` for the source glyph and generic glyphs.
5. **ProofCard port** — anatomy and structure lifted from screens 01/02 (`wv-clip`): proof region
   (quote/thumbnail), quiet meta row, consent dot, corner stamp, verified mark, hover "Make".
6. **Persimmon reservation + consent gating** — how the build enforces persimmon-only-on-primary and
   Make-only-when-granted.
7. **Shadow + type-scale values** — sourced from the export (Open items 1–2), proposed for the
   constitution.

**Output**: research.md with decisions, rationale, and alternatives; the two Open items recorded.

## Phase 1 — Design & Contracts

- **Data model** → [data-model.md](./data-model.md): the `ProofCard` props type (anticipating the
  T0.3 `proof` entity) — fields, enums (`ProofType`, `ConsentState`), and the consent→Make rule.
- **Contracts** → `contracts/`:
  - `design-tokens.md` — every token's CSS-variable name, Tailwind utility, and value (referencing
    constitution v1.1.0), for both themes.
  - `proof-card.md` — the ProofCard component contract (props, text vs media variant, proof-forward
    hierarchy, consent dot/stamp/verified/Make states, hover, theme-aware, a11y).
  - `styleguide.md` — the /styleguide page contract (sections, both themes, not linked from
    landing, the theme toggle).
- **Quickstart** → [quickstart.md](./quickstart.md): scenarios mapping to SC-001..SC-009.
- **Agent context**: the `CLAUDE.md` SPECKIT marker block is updated to point at this plan.

**Output**: data-model.md, contracts/*, quickstart.md, updated CLAUDE.md marker.

## Phase 2 — Task planning approach (NOT executed here)

`/speckit.tasks` will decompose this into one-commit-sized tasks, expected to group as: (1) Setup —
install `next-themes` + `lucide-react`; (2) Foundational — token layer in `globals.css` (both
themes) + `@theme` mapping, JetBrains Mono, `ThemeProvider` in `layout.tsx` (no-flash); (3) US1 —
token system proven on /styleguide (palette swatches, type scale, buttons, consent chips); (4) US2 —
the canonical ProofCard (props type, component, text + media variants on /styleguide); (5) US3 —
Daylight/Ink toggle + persistence verified across both; (6) Polish/DoD — typecheck/lint/build green,
CI green, responsive, theme-aware, keyboard-accessible, persimmon-reservation + protected-files
checks. No tasks are produced by this command.

## Complexity Tracking

No constitution violations. The two former Open items (shadow + type-scale exact values) are now
recorded in Principle IV v1.1.1; nothing outstanding.
