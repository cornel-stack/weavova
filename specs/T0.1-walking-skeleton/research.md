# Phase 0 — Research: T0.1 Walking Skeleton

All decisions below are constrained by the constitution's locked stack (v1.0.1, Principle III) and
the "preserve existing files" requirement (FR-002). No code is written here — this records the
concrete choices the implementation will follow.

---

## R1. Non-destructive scaffold (the key risk)

**Problem**: `create-next-app` aborts when the target directory contains files outside its internal
allowlist. The repo root already holds `CLAUDE.md`, `design-reference/`, `docs/`, `.specify/`,
`specs/`, `.claude/`, `README.md`, and `.git/`. `CLAUDE.md`, `design-reference/`, `.specify/`,
`specs/`, and `.claude/` are NOT allowlisted, so an in-place `create-next-app .` would refuse.

**Decision**: Generate into a temporary directory, then merge the generated app into the repo root.

- Run `create-next-app` in an empty temp dir (e.g. `../weavova-scaffold-tmp` or `$(mktemp -d)`),
  producing a clean project named to match.
- Copy the generated files into the repo root, **explicitly skipping** anything that would touch a
  protected path. Concretely, copy: `src/`, `public/`, `next.config.ts`, `tsconfig.json`,
  `postcss.config.mjs`, `eslint.config.mjs`, `package.json`, `package-lock.json`, `next-env.d.ts`.
- **Do not** copy the generated `README.md` over the existing one (the existing README is updated in
  place per FR-009). **Do not** copy the generated `.gitignore` blindly — merge its entries into a
  repo `.gitignore` that guarantees `node_modules`, `.next`, and `.env*` (FR-006).
- Delete the temp dir afterward.
- **Verify** with `git status` / a diff that `CLAUDE.md`, `design-reference/`, `docs/`, `.specify/`,
  and `.claude/` are unchanged (SC-007).

**Alternatives considered**:
- *In-place `create-next-app .`* — rejected: refuses due to non-allowlisted files; `--force`-style
  overwrite would risk the protected files.
- *Fully manual scaffold* (hand-write every config) — rejected: error-prone and more likely to
  drift from the canonical Next 15 + Tailwind v4 layout; harder to keep on the locked stack.
- *Temp-dir generate + merge* — chosen: gets the canonical scaffold while guaranteeing the
  protected files are never in `create-next-app`'s path.

---

## R2. Scaffold options

**Decision**: TypeScript, Tailwind, ESLint, App Router, `src/` directory, import alias `@/*`. This
maps to the non-interactive flags:

```
npx create-next-app@latest <tmp> \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-npm --no-git
```

- `--no-git` because the repo already has `.git/`.
- App Router (`--app`) and `--src-dir` satisfy FR-001/FR-003 and the constitution's Server-Component
  default (P-X).
- `--import-alias "@/*"` satisfies the alias requirement (FR-003).

**Rationale**: These are exactly the locked-stack defaults; no extra dependency is introduced.
**Alternatives**: Pages Router (rejected — constitution mandates App Router); Turbopack flags are
left at the scaffold default (not relevant to this slice's acceptance).

---

## R3. Tailwind v4 wiring

**Decision**: Use the Tailwind v4 PostCSS setup that create-next-app emits for Next 15:
`postcss.config.mjs` referencing `@tailwindcss/postcss`, and `src/app/globals.css` beginning with
`@import "tailwindcss";`. No `tailwind.config.*` content model is added in this slice (v4 is
zero-config by default); the colour-token system and `@theme` customisation are deferred to T0.2.

**Rationale**: Matches the locked "Tailwind v4" choice and keeps this slice minimal.
**Alternatives**: Tailwind v3 (`tailwind.config.js` + `@tailwind` directives) — rejected, off the
locked version.

---

## R4. Brand fonts via `next/font/google`

**Decision**: In `src/app/layout.tsx`, load both brand fonts and expose them as CSS variables:

- `Fraunces` → `variable: "--font-display"` (display; used for the wordmark and tagline).
- `Hanken_Grotesk` → `variable: "--font-ui"` (UI default for the document body).
- Apply both variable classes on `<html>` (or `<body>`), set the body font to `--font-ui`, and set
  the wordmark/tagline elements to `--font-display`.
- `subsets: ["latin"]`, `display: "swap"`.

This satisfies FR-004a / SC-001a. **JetBrains Mono is intentionally NOT loaded** (deferred to T0.2).

**Rationale**: `next/font/google` is part of the locked styling approach ("Fonts via
`next/font/google`", CLAUDE.md §3) and self-hosts the fonts at build time (no runtime network call,
good for the deploy). **Alternatives**: `<link>` to Google Fonts (rejected — not self-hosted, extra
runtime request, off the locked approach); wiring all three families now (rejected — JetBrains Mono
is deferred by the amended spec).

---

## R5. Warm paper background (without the T0.2 token system)

**Decision**: Apply `#F7F2E8` as the page background once, in `globals.css` on `body` (or a Tailwind
arbitrary value `bg-[#F7F2E8]` on the root element). Do not introduce CSS custom properties for the
colour palette, a `@theme` block, or any other token — those are the T0.2 colour-token system.

**Rationale**: Keeps the themed look on-brand while honouring the spec's deferral of the token
system. **Alternatives**: defining `--color-paper` and a token layer now (rejected — that is
explicitly T0.2 scope).

---

## R6. Continuous integration (GitHub Actions)

**Decision**: `.github/workflows/ci.yml` with:

- Triggers: `on: [push, pull_request]` (FR-007).
- One `verify` job on `ubuntu-latest`, Node 20 via `actions/setup-node` with `cache: npm`.
- Steps: `actions/checkout` → `npm ci` → `npm run typecheck` → `npm run lint` → `npm run build`.
- A `typecheck` script (`tsc --noEmit`) is added to `package.json`; `lint` is the scaffold's
  `next lint`; `build` is `next build`. The job fails if any step exits non-zero (FR-008,
  SC-005/SC-006), and the production build is enforced in CI (SC-002).

**Rationale**: Matches the spec's CI assumption (GitHub Actions, no secrets, no external services).
Running `next build` in CI is required: a workflow that runs only type-check + lint can go green
while the production build fails, which then breaks the Vercel deploy — the exact failure this
slice exists to kill. A separate `typecheck` script makes the strict-TS gate explicit and reusable
locally.
**Alternatives**: typecheck + lint only (rejected — leaves the build unguarded until deploy, the
core risk); other CI providers (rejected — GitHub Actions is the stated assumption).

---

## R7. Live deploy (Vercel)

**Decision**: Deployment is Vercel zero-config import of the repository (a one-time human step in
the Vercel dashboard). The code deliverable must guarantee: `next build` is green, the landing is a
static/Server-Component page with no platform-incompatible code (no heavy/long-running server work,
no FFmpeg, no Node-only binaries — all deferred to the T8 worker). No `vercel.json` is required for
a standard Next.js app.

**Rationale**: Vercel is the locked host and auto-detects Next.js; nothing in this slice needs
custom build/runtime config. **Alternatives**: adding a `vercel.json` (rejected — unnecessary for
zero-config Next.js); deploying elsewhere (rejected — off the locked stack).

---

## Resolved unknowns summary

| Unknown | Resolution |
|---|---|
| How to scaffold without clobbering protected files | Temp-dir generate + selective merge (R1) |
| Which scaffold options | TS, Tailwind, ESLint, App Router, `src/`, `@/*` (R2) |
| Tailwind version wiring | v4 PostCSS + `@import "tailwindcss"` (R3) |
| How fonts are wired | `next/font/google` Fraunces/Hanken → `--font-display`/`--font-ui` (R4) |
| How the paper background is applied | single `#F7F2E8` on body, no token system (R5) |
| CI shape | GitHub Actions, Node 20, `npm ci` → typecheck → lint → build, on push/PR (R6) |
| Deploy mechanism | Vercel zero-config import; code must build green (R7) |

No `NEEDS CLARIFICATION` markers remain.
