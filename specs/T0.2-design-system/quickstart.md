# Quickstart — Validate T0.2

Runnable validation scenarios, each mapped to a Success Criterion. Run after `/speckit.implement`.

## Prerequisites

- Deps installed (`npm install`), including `next-themes` and `lucide-react`.

## 1. Palette in both themes — SC-001

```bash
npm run dev
# open http://localhost:3000/styleguide
```

**Expect**: every Daylight and Ink colour token shown as a labelled swatch with its exact v1.1.0
hex. Toggle to Ink (§3) and confirm the Ink hexes/values render.

## 2. Three fonts — SC-002

On /styleguide, confirm the type scale renders Fraunces (display/quote), Hanken Grotesk (UI/body),
and JetBrains Mono (mono) — visually distinct.

## 3. Theme toggle: no flash + persists — SC-003

- Activate the toggle → whole page (palette, type, buttons, chips, ProofCard) switches to Ink with
  no flash.
- Reload → Ink still applied, no flash of Daylight first.
- Toggle back to Daylight → same.

## 4. Buttons follow Pressroom rules — SC-004

Confirm persimmon PRIMARY, solid-ink STRONG SECONDARY, ink-hairline QUIET, DANGER — and persimmon
appears on the primary only (and on the ProofCard verified/Make marks, nowhere else).

## 5. Consent chips — SC-005

Confirm chips for granted (success), awaiting (warning), revoked (danger).

## 6. ProofCard — SC-006

- text-proof variant: quote in Fraunces is the dominant element; unreviewed stamp + verified mark
  show; hovering reveals the persimmon "Make" (consent granted).
- media-proof variant: thumbnail (neutral placeholder) dominant; warning consent dot; hovering does
  NOT reveal "Make" (consent awaiting).
- Toggle themes → the ProofCard renders correctly in both.

## 7. Not linked from the landing — SC-007

Open `/` and confirm there is no link to /styleguide.

## 8. Green gates + a11y/responsive — SC-008

```bash
npm run typecheck && npm run lint && npm run build
```

**Expect**: all exit 0. CI green on push. /styleguide responsive at `480 / 1024 / 1280`; the theme
toggle and the ProofCard Make action are keyboard-focusable and operable.

## 9. No off-stack dependency — SC-009

```bash
node -e "const p=require('./package.json');const a=Object.keys({...p.dependencies,...p.devDependencies});console.log(a.filter(d=>!/^(next|react|react-dom|typescript|@types|@tailwindcss|tailwindcss|eslint|@eslint|next-themes|lucide-react)/.test(d)))"
```

**Expect**: `[]` — only the locked stack plus `next-themes` and `lucide-react`.

## Definition of done

Full token system in both themes · three fonts · no-flash persisted theming · Pressroom buttons ·
consent chips · canonical ProofCard (proof-dominant, consent-aware) · /styleguide unlinked from
landing · typecheck/lint/build + CI green · responsive · keyboard-accessible · protected files
preserved.
