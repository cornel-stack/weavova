# Contract — /styleguide page

Route: `/styleguide` (`src/app/styleguide/page.tsx`). Internal/dev reference. **Not linked** from
the landing (`/`) or any public surface. Server Component composing the sections; the theme toggle
is the only Client element.

## Sections (all correct in BOTH Daylight and Ink)

1. **Theme toggle** — switches Daylight↔Ink; no flash; choice persists across reloads.
2. **Palette** — every Daylight and Ink colour token as a labelled `Swatch` with its name and exact
   hex (constitution v1.1.0). Swatches read the current theme's value.
3. **Type scale** — display 2xl→xs, headings, quote, body, label, mono — each labelled, rendered in
   the correct family (Fraunces / Hanken Grotesk / JetBrains Mono).
4. **Buttons** — `Button` variants: persimmon **PRIMARY**, solid-ink **STRONG SECONDARY**,
   ink-hairline-outline **QUIET**, **DANGER**. Persimmon appears on the primary only.
5. **Consent chips** — `Chip` for granted (success), awaiting (warning), revoked (danger), using the
   status + status-tint tokens.
6. **ProofCard** — the text-proof and media-proof variants (see proof-card.md).

## Rules / acceptance

- Reachable directly at `/styleguide`; NOT linked from the landing (SC-007).
- Every section renders correctly in both themes; the toggle is no-flash and persists (SC-003).
- The three fonts are visually distinct (SC-002); palette hexes match v1.1.0 (SC-001).
- Buttons follow Pressroom rules; persimmon only on primary (SC-004). Chips show the three states
  (SC-005). ProofCard matches the clipping, proof-dominant, consent-aware, hover Make (SC-006).
- Responsive at `480 / 1024 / 1280`; keyboard-accessible; no "amazing"/"awesome"/emoji microcopy.
