# Implementation Plan: T0.1 — Walking Skeleton (scaffold, CI, themed deploy)

**Branch**: `T0.1-walking-skeleton` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T0.1-walking-skeleton/spec.md`

> **PLANNING ONLY GUARD (this command).** This document is the technical plan. No application
> code is written, nothing is scaffolded, nothing is installed by this command. Execution happens
> later, in `/speckit.tasks` → `/speckit.implement`, only after human approval.

## Summary

Stand up a single Next.js 15 (App Router) application at the repository root that renders one
themed landing at "/" — warm paper background (`#F7F2E8`), the "Weavova" wordmark, and the tagline
"The customer is the headline.", both set in Fraunces — and prove the full commit → CI → live-URL
path before any product feature exists. The two brand fonts (Fraunces display, Hanken Grotesk UI)
are wired via `next/font/google` as `--font-display` / `--font-ui`. A GitHub Actions workflow runs
type-check + lint on every push and pull request. Scaffolding must preserve the existing
`CLAUDE.md`, `design-reference/`, `docs/`, and `.specify/`. JetBrains Mono, the full colour-token
system, dark mode, the spacing scale, and the styleguide are deferred to T0.2.

The central technical risk is that `create-next-app` refuses to initialize into a non-empty
directory containing files it does not allowlist (`CLAUDE.md`, `design-reference/`, `.specify/`,
`specs/`, `.claude/`). The plan resolves this by generating into a temporary directory and merging
the generated app files into the repo root, never touching the protected paths (see research.md).

## Technical Context

**Language/Version**: TypeScript 5.x in `strict` mode; React 19; Node.js 20 LTS (CI pins 20).

**Primary Dependencies**: Next.js 15 (App Router); Tailwind CSS v4 (`@tailwindcss/postcss`);
`next/font/google` for Fraunces + Hanken Grotesk. Dev tooling: ESLint (`eslint-config-next`),
TypeScript. No dependency outside the constitution's locked stack is added (no Auth.js, Neon,
Drizzle, R2, Inngest, or Resend in this slice).

**Storage**: N/A — this slice has no database, schema, or fixtures (deferred to T0.3).

**Testing**: No unit-test framework is added in this slice (tests are optional per the spec).
Verification is via `tsc --noEmit` (type-check), `next lint` (lint), `next build` (build), the CI
workflow, and manual confirmation of the rendered landing. A test runner arrives in a later tier.

**Target Platform**: Vercel (the locked-stack host) for the live URL; modern evergreen browsers for
the static landing.

**Project Type**: Web application — a single Next.js app at the repository root (explicitly NOT a
monorepo; the render worker that would justify one is deferred to T8).

**Performance Goals**: Not a focus for this slice. The landing is static and must load and remain
legible without client interactivity; no performance budgets are set here.

**Constraints**: Preserve `CLAUDE.md`, `design-reference/`, `docs/`, `.specify/` (and `.claude/`,
`.git/`) during scaffolding. Locked stack only. TypeScript `strict`. Tailwind classes only — no
inline styles, no CSS modules (one minimal `globals.css` for the Tailwind import, the paper
background, and the font-variable wiring is permitted as the global stylesheet, not a CSS module).
No `localStorage` / `sessionStorage`. Daylight (light) theme only.

**Scale/Scope**: One route ("/"), zero data entities, one CI workflow, one updated README.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` v1.0.1. Re-checked after design below.*

| Gate (principle) | Verdict | Justification |
|---|---|---|
| Customer is the headline (P-II) | PASS | The only rendered content is the wordmark + the verbatim tagline; no competing chrome. No proof surface exists yet, so the law holds trivially. |
| Locked stack (P-III) | PASS | Next.js 15 / React 19 / TS strict / Tailwind v4 only. No new dependency outside the locked stack (FR-011). Heavy render absent — nothing runs off-Vercel. |
| Pressroom tokens (P-IV) | PASS (scoped) | Uses only the single paper value `#F7F2E8` and the two brand fonts (Fraunces, Hanken Grotesk). Persimmon is NOT used (no primary action / verified mark on this page). The full colour-token system, spacing scale, JetBrains Mono, and dark mode are deferred to T0.2 by spec. |
| Port, don't redesign (P-V) | PASS (N/A) | No `/design-reference` screen is ported; the skeleton landing is not a catalogued screen. Only constitution/CLAUDE values are used; no layout is invented beyond centring two text elements. |
| Fixtures-first (P-VI) | N/A | This slice reads no data; the fixture/schema contract begins at T0.3. |
| Consent (P-VII) | N/A | No proof or derived assets exist. |
| No editor (P-VIII) | N/A | No studio/format surface. |
| SDD scope (P-IX, P-XI) | PASS | One vertical slice within tier T0; out-of-scope items (DB, auth, storage, jobs, email, token system, product UI) explicitly excluded. |
| Coding conventions (P-X) | PASS | Server Components by default (the landing is a Server Component); kebab-case files / PascalCase components; TS strict; Tailwind classes only; no `localStorage`/`sessionStorage`; no Zod/Drizzle needed (no data). |
| Never-do rules (P-XI) | PASS | Scaffolding preserves `/design-reference` and `/docs` (never modified); spec/plan precede implementation; no features beyond the slice; no off-stack dependency; microcopy is only the wordmark + tagline (no "amazing"/"awesome", no emoji). |
| Ambiguity handling (P-XII) | PASS | Open questions (fonts, deploy, CI provider) were resolved in the spec's Assumptions rather than guessed silently. |

**Result: PASS — no violations. Complexity Tracking is empty.**

## Project Structure

### Documentation (this feature)

```text
specs/T0.1-walking-skeleton/
├── spec.md              # Feature specification (input)
├── plan.md              # This file (/speckit.plan output)
├── research.md          # Phase 0 output — scaffold/tooling decisions
├── data-model.md        # Phase 1 output — N/A (no entities this slice)
├── quickstart.md        # Phase 1 output — runnable validation guide
└── contracts/
    └── home-surface.md  # Phase 1 output — UI contract for "/"
```

### Source Code (repository root) — PLANNED, created later by /speckit.implement

```text
weavova/
├── CLAUDE.md                     # PRESERVED (marker block updated to point at this plan)
├── design-reference/             # PRESERVED, read-only — never modified
├── docs/                         # PRESERVED, read-only — never modified
├── .specify/                     # PRESERVED
├── .claude/                      # PRESERVED
├── specs/                        # PRESERVED (this feature lives here)
├── .github/
│   └── workflows/
│       └── ci.yml                # NEW — typecheck + lint + build on push & PR
├── public/                       # NEW — Next default (kept minimal; brand logos are a later tier)
├── src/
│   └── app/
│       ├── layout.tsx            # NEW — wires Fraunces/Hanken via next/font; sets html/body, font vars
│       ├── page.tsx              # NEW — Server Component: wordmark + tagline in Fraunces
│       └── globals.css           # NEW — `@import "tailwindcss"`; paper background; --font-display/--font-ui
├── next.config.ts                # NEW
├── tsconfig.json                 # NEW — strict; paths "@/*" → ./src/*
├── postcss.config.mjs            # NEW — Tailwind v4 PostCSS plugin
├── eslint.config.mjs             # NEW — eslint-config-next (flat config)
├── package.json                  # NEW — scripts: dev, build, start, lint, typecheck
├── package-lock.json             # NEW — generated by install (install is a later step, not this command)
├── next-env.d.ts                 # NEW — generated by Next
├── .gitignore                    # NEW — node_modules, .next, .env*
└── README.md                     # UPDATED IN PLACE — description + locked stack + run commands
```

**Structure Decision**: Single Next.js application at the repository root with the App Router under
`src/app`. This matches the locked stack and the "single app, not a monorepo" constraint. All new
files are additive except `README.md` (updated in place) and the `CLAUDE.md` SPECKIT marker block
(pointer updated to this plan, per the Spec Kit agent-context step). No protected path is moved,
deleted, or restyled.

## Phase 0 — Outline & Research

See [research.md](./research.md). It resolves every unknown:

1. **Non-destructive scaffold** — how to run `create-next-app` without it refusing on / clobbering
   the protected files: generate into a temp directory, then copy only the generated app files into
   the repo root, merging `.gitignore` and leaving `CLAUDE.md`/`design-reference/`/`docs/`/
   `.specify/`/`.claude/`/`specs/` untouched.
2. **Scaffold flags** — TypeScript, Tailwind, ESLint, `src/` dir, `@/*` alias, App Router.
3. **Tailwind v4 wiring** — PostCSS plugin + `@import "tailwindcss"` in `globals.css`.
4. **Brand fonts** — `next/font/google` for Fraunces + Hanken Grotesk exposed as CSS variables.
5. **Warm paper background** — applied minimally without introducing the T0.2 token system.
6. **CI** — GitHub Actions running `typecheck` + `lint` + `build` (`next build`) on push and PR,
   Node 20, `npm ci`. The production build is enforced in CI so a build failure blocks the commit.
7. **Live deploy** — Vercel zero-config import (the human connection step) and what the code must
   guarantee (build green, no platform-incompatible code).

**Output**: research.md with all NEEDS CLARIFICATION resolved (there were none outstanding after the
spec's Assumptions; research records the concrete decisions).

## Phase 1 — Design & Contracts

- **Data model** → [data-model.md](./data-model.md): no entities in this slice (N/A; schema begins
  at T0.3).
- **Contracts** → [contracts/home-surface.md](./contracts/home-surface.md): the UI contract for the
  "/" surface — exact required content, the font/background guarantees, and what must be absent.
- **Quickstart** → [quickstart.md](./quickstart.md): runnable validation scenarios mapping to the
  spec's Success Criteria (dev render, build, lint, type-check, CI red/green, preserved files,
  deploy).
- **Agent context**: the `CLAUDE.md` SPECKIT marker block is updated to point at this plan file.

**Output**: data-model.md, contracts/home-surface.md, quickstart.md, updated CLAUDE.md marker.

## Phase 2 — Task planning approach (NOT executed here)

`/speckit.tasks` will turn this plan into an ordered task list, expected to group as: (1) Setup —
non-destructive scaffold into temp + merge, install deps, verify protected files untouched;
(2) Foundational — `tsconfig` strict + `@/*` alias, Tailwind v4 wiring, font wiring in `layout.tsx`,
`.gitignore`; (3) US1 — the themed "/" page; (4) US2 — the CI workflow (typecheck + lint + build) + `typecheck` script;
(5) US3 — README + Vercel-deployability check; (6) Polish/DoD — build/lint/typecheck green,
responsive/legible at `480/1024/1280`, preserved-files diff check. No tasks are produced by this
command.

## Complexity Tracking

No constitution violations — this section is intentionally empty.
