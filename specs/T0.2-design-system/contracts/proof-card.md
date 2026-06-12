# Contract — ProofCard ("the clipping")

Ported faithfully from /design-reference screens **01 Dashboard** and **02 Proof inbox** (the
`wv-clip`). Component: `src/components/proof-card.tsx`. Props: `ProofCardProps` (see data-model.md).

## Anatomy (token-only, theme-aware)

| Region | Requirement |
|---|---|
| Container | `bg-card`, 1px `border-hairline`, `rounded-clip` (6px), `--shadow-clip`. Hover lifts to `--shadow-lift` via token motion (respect reduced-motion). |
| Proof (dominant) | `text` → verbatim `quote` in `font-display` (Fraunces), large & warm — the headline of the card. media → `thumbnail` (neutral placeholder) dominant; `transcript` secondary. |
| Customer | initials avatar + `customerName`, quiet (`text-ink-2`). |
| Source | lucide source glyph (`strokeWidth 1.5`) + `source` label in `font-mono`, quiet. |
| Consent dot | small dot coloured by `consentState`: granted=`success`, awaiting=`warning`, revoked=`danger`. |
| Captured date | `capturedAt` in `font-mono`, quiet (`text-ink-3`). |
| Corner stamp | "Unreviewed" stamp shown when `reviewed === false`; absent when `true`. |
| Verified mark | persimmon "verified real customer" mark when `verified === true`. |
| Make action | persimmon action revealed on hover ONLY when `consentState === "granted"`; otherwise suppressed and the card reads as needing consent. Visual-only this slice (studio is T2). |

## Invariants

- **P-II**: the proof (quote or thumbnail) is the largest, warmest element; all metadata is quiet.
- **P-IV**: persimmon only on the verified mark and the Make action (nowhere else on the card).
- **P-VII**: `consentState !== "granted"` ⇒ no Make action.
- **Theme-aware**: renders correctly in Daylight and Ink (token-only).
- **A11y**: the Make action is keyboard-focusable and operable; the card is not a keyboard trap; the
  consent state is conveyed by more than colour alone (dot + label/title).
- **No real people**: any face/thumbnail is a neutral placeholder.

## Styleguide usage

Rendered on /styleguide with hardcoded props in two variants:
- **text-proof**: `proofType:"text"`, non-empty `quote`, `consentState:"granted"`,
  `reviewed:false`, `verified:true` (shows quote-dominant, stamp, verified mark, hover Make).
- **media-proof**: `proofType:"video"` (or photo/audio), `thumbnail` placeholder, `transcript`,
  `consentState:"awaiting"` (shows thumbnail-dominant, warning dot, NO Make).
