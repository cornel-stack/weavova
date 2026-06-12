# Contract — Pressroom design tokens

The token layer is the build contract for every later screen. Values are the **constitution v1.1.0
Principle IV** hexes; CSS-variable names and Tailwind utilities below are the wiring contract.

## Colour tokens (per theme — same names, theme-dependent values)

| CSS var | Tailwind utility | Daylight | Ink |
|---|---|---|---|
| `--paper` | `bg-paper` | `#F4F1E8` | `#15120E` (canvas) |
| `--card` | `bg-card` | `#FEFDF8` | `#1F1B15` |
| `--sunken` | `bg-sunken` | `#E9E5D6` | `#2A251D` (raised) |
| `--ink` | `text-ink` | `#1C1714` | `#F4EEE2` |
| `--ink-2` | `text-ink-2` | `#595046` | `#B4AB99` |
| `--ink-3` | `text-ink-3` | `#968B79` | `#7B7363` |
| `--hairline` | `border-hairline` | `#E4DAC8` | `#322B20` |
| `--rule` | `border-rule` | `#CDC1AB` | `#463D2D` |
| `--persimmon` | `bg-persimmon` / `text-persimmon` | `#B5443C` | `#CA5F51` |
| `--persimmon-deep` | `text-persimmon-deep` | `#8F342E` | _(omitted in dark)_ |
| `--persimmon-tint` | `bg-persimmon-tint` | `#F5DFD8` | `#3A261F` |
| `--on-accent` | `text-on-accent` | `#FFFFFF` | `#FFFFFF` |
| `--success` | `text-success` | `#2E6B43` | `#5FB572` |
| `--success-tint` | `bg-success-tint` | `#E3EDE3` | `#293424` |
| `--warning` | `text-warning` | `#B7791F` | `#E3A53A` |
| `--warning-tint` | `bg-warning-tint` | `#F4EBD7` | `#3E311B` |
| `--danger` | `text-danger` | `#B0331F` | `#EE7A63` |
| `--danger-tint` | `bg-danger-tint` | `#F3DED8` | `#402A21` |

Daylight values under `:root` / `[data-theme="daylight"]`; Ink values under `[data-theme="ink"]`.
In Ink, `--paper`→canvas, `--card`→#1F1B15, `--sunken`→raised. No off-token values.

## Non-colour tokens

| Group | Tokens |
|---|---|
| Radii | `--radius-pill 999px` (`rounded-pill`), `--radius-control 8px`, `--radius-clip 6px`, `--radius-modal 14px` |
| Spacing | 4px scale `4/8/12/16/24/32/48/64/96` — Tailwind default 0.25rem ramp (`1,2,3,4,6,8,12,16,24`) |
| Widths | content `1240px`, reading `680px` |
| Breakpoints | `480 / 1024 / 1280` |
| Shadow | `--shadow-clip 2px 3px 10px -4px rgba(28,23,20,.14)`, `--shadow-lift 6px 10px 26px -10px rgba(28,23,20,.26)`, `--shadow-modal 10px 18px 50px -16px rgba(28,23,20,.34)` _(from export; see plan Open item 1)_ |
| Motion | fast `120ms`, default `200ms`, celebrate `≤420ms`; `--ease cubic-bezier(0.2,0,0,1)`; honour `prefers-reduced-motion` |
| Fonts | `--font-display` Fraunces, `--font-ui` Hanken Grotesk, `--font-mono` JetBrains Mono |
| Type scale | display 2xl→xs, headings, quote, body, label, mono — sizes from export _(see plan Open item 2)_ |

## Rules

- Every component consumes tokens via Tailwind utilities or the CSS vars — never raw hexes.
- **Persimmon** utilities appear ONLY on the primary Button and the ProofCard verified/Make marks.
- Both themes render every token correctly; switching `data-theme` re-themes with no rebuild/flash.
