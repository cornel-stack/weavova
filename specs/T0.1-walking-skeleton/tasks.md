---
description: "Task list for T0.1 — Walking Skeleton"
---

# Tasks: T0.1 — Walking Skeleton (scaffold, CI, themed deploy)

**Input**: Design documents from `specs/T0.1-walking-skeleton/`
**Prerequisites**: plan.md, spec.md, research.md, contracts/home-surface.md, quickstart.md
**Tests**: NOT requested for this slice (the spec does not request tests; verification is via
typecheck / lint / build / CI / manual). No test tasks are generated.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> scaffolded, or installed. Execution happens in `/speckit.implement` after human approval.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task).
- **[Story]**: US1 / US2 / US3 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths and traces to the FR/SC (or constitution principle) it satisfies.
- Each task is sized to be a single, self-contained commit.

---

## Phase 1: Setup (project initialization)

- [ ] T001 Non-destructively scaffold the Next.js 15 app: run `create-next-app@latest` (flags
  `--typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-git`) into
  a TEMP directory, then copy ONLY the generated app files into the repo root — `src/`, `public/`,
  `next.config.ts`, `tsconfig.json`, `postcss.config.mjs`, `eslint.config.mjs`, `package.json`,
  `package-lock.json`, `next-env.d.ts`. Do NOT copy the generated `README.md` or `.gitignore`. Do
  NOT let create-next-app run in the repo root. Delete the temp dir after. → FR-001, FR-002, FR-003
  (research.md R1/R2)
- [ ] T002 Install dependencies at the repo root (`npm install`, producing `package-lock.json`) and
  confirm only locked-stack packages are present (Next.js, React, Tailwind v4, ESLint, TypeScript —
  no Auth.js/Neon/Drizzle/R2/Inngest/Resend). → FR-011
- [ ] T003 Verify the scaffold preserved protected paths: `git status` + `git diff` show
  `CLAUDE.md` unchanged except the existing SPECKIT marker pointer, and `design-reference/`,
  `docs/`, `.specify/`, `.claude/` untouched (no deletions, no content replacement). → FR-002,
  SC-007

**Checkpoint**: a clean Next.js app sits at the repo root; references are intact.

---

## Phase 2: Foundational (blocking prerequisites — MUST finish before any user story)

- [ ] T004 In `tsconfig.json` confirm/enforce `"strict": true` and the path alias `"@/*" → "./src/*"`.
  → FR-003 (P-X)
- [ ] T005 Wire Tailwind v4: ensure `postcss.config.mjs` uses `@tailwindcss/postcss` and
  `src/app/globals.css` begins with `@import "tailwindcss";`. Do NOT add a colour-token system,
  `@theme` block, or spacing scale (deferred to T0.2). → FR-004 (research.md R3)
- [ ] T006 Wire the two brand fonts in `src/app/layout.tsx`: load `Fraunces`
  (`variable: "--font-display"`) and `Hanken_Grotesk` (`variable: "--font-ui"`) from
  `next/font/google` (`subsets: ["latin"]`, `display: "swap"`), apply both variable classes on
  `<html>`, and in `src/app/globals.css` set the document body to `font-family: var(--font-ui)`. Do
  NOT load JetBrains Mono. → FR-004a, SC-001a (research.md R4)
- [ ] T007 Create the repo `.gitignore` excluding `node_modules`, `.next`, and `.env*`. → FR-006
- [ ] T008 In `package.json` add a `typecheck` script (`tsc --noEmit`) and confirm `dev`, `build`
  (`next build`), `start`, and `lint` (`next lint`) scripts exist. → FR-007, FR-010

**Checkpoint**: strict TS, Tailwind, fonts, ignore rules, and scripts are in place — pages and CI
can now be built.

---

## Phase 3: User Story 1 — Themed landing renders (Priority: P1) 🎯 MVP

**Goal**: "/" shows warm paper, the "Weavova" wordmark, and the tagline in Fraunces — nothing else.
**Independent Test**: `npm run dev`, open "/", confirm background + wordmark + tagline in Fraunces,
no other content (quickstart §1).

- [ ] T009 [P] [US1] In `src/app/globals.css` set the page background to the Pressroom paper value
  `#F7F2E8` (single value, no token layer). → FR-004
- [ ] T010 [P] [US1] Implement `src/app/page.tsx` as a Server Component (no `"use client"`)
  rendering the "Weavova" wordmark and the tagline "The customer is the headline.", both in Fraunces
  via `var(--font-display)`, visually centred, with NO other elements, navigation, data, or
  persimmon accent. → FR-004, FR-004a, FR-005 (contracts/home-surface.md)

**Checkpoint**: the MVP landing renders locally and is on-brand.

---

## Phase 4: User Story 2 — Every commit is verified by CI (Priority: P1)

**Goal**: push/PR runs typecheck + lint + production build and reports pass/fail.
**Independent Test**: push a commit / open a PR and confirm the workflow runs all three steps and
reports a status; a deliberate error turns it red (quickstart §5–6).

- [ ] T011 [US2] Create `.github/workflows/ci.yml`: triggers `on: [push, pull_request]`; one
  `verify` job on `ubuntu-latest`; `actions/checkout`; `actions/setup-node` Node 20 with
  `cache: npm`; steps `npm ci` → `npm run typecheck` → `npm run lint` → `npm run build`; the job
  fails if any step fails. → FR-007, FR-008, SC-002, SC-005 (research.md R6)
- [ ] T012 [US2] Validate CI behaviour: push clean code and confirm green; on a scratch branch
  introduce a deliberate type/lint error and confirm the check turns red; revert and confirm green.
  → SC-005, SC-006

**Checkpoint**: the commit → verified rail is proven, build included.

---

## Phase 5: User Story 3 — Deployable to a live URL (Priority: P2)

**Goal**: the app builds clean and deploys unmodified to a live URL serving the same landing.
**Independent Test**: `npm run build` green, then deploy/preview and confirm the live URL matches
local (quickstart §8).

- [ ] T013 [US3] Update `README.md` IN PLACE (do not replace wholesale) to include a one-line
  Weavova description, the locked technology stack, and the run commands (`npm run dev` / `build` /
  `lint` / `typecheck`). → FR-009
- [ ] T014 [US3] Confirm Vercel-deployability: `npm run build` is green and the app contains no
  platform-incompatible code (no heavy/long-running server work, no FFmpeg/Node-only binaries; the
  Vercel connect/import is a one-time human step). → FR-012, SC-008 (research.md R7)

**Checkpoint**: the skeleton is documented and ready to deploy to a live URL.

---

## Phase 6: Polish & Cross-Cutting Concerns (Definition of Done)

- [ ] T015 [P] Run `npm run typecheck`, `npm run lint`, and `npm run build` locally — all exit 0
  with zero errors. → SC-002, SC-003, SC-004, FR-010
- [ ] T016 [P] Verify the "/" render: paper background `#F7F2E8`; wordmark + tagline in Fraunces;
  `--font-display` (Fraunces) and `--font-ui` (Hanken Grotesk) present and applied; confirm NONE of
  the deferred items appear (no JetBrains Mono, colour-token system, dark mode, spacing scale,
  styleguide). → SC-001, SC-001a
- [ ] T017 [P] Confirm the landing is legible/responsive at the `480 / 1024 / 1280` breakpoints and
  remains legible with JavaScript disabled. → Definition of Done, Edge Cases
- [ ] T018 [P] Re-confirm protected files preserved: `git diff -- CLAUDE.md` shows only the SPECKIT
  marker pointer change; `design-reference/`, `docs/`, `.specify/` unchanged. → FR-002, SC-007
- [ ] T019 [P] Constitution spot-check: no persimmon on the page (no primary action / verified
  mark); microcopy is only the wordmark + tagline (no "amazing"/"awesome", no emoji); the page is a
  Server Component; no `localStorage`/`sessionStorage`. → P-IV, P-X, P-XI

**Checkpoint**: Definition of Done met — STOP and report; do not advance to T0.2 until the human
says to proceed (P-IX).

---

## Dependencies & Execution Order

- **Setup (T001–T003)** → no dependencies; T001 first, then T002, then T003.
- **Foundational (T004–T008)** → depends on Setup; BLOCKS all user stories. T004–T008 are largely
  independent but T005 and T006 both touch `globals.css`, so run T005 before T006.
- **US1 (T009–T010)** → depends on Foundational. T009 (globals.css) and T010 (page.tsx) are
  different files → parallelizable.
- **US2 (T011–T012)** → depends on Foundational (needs the `typecheck`/`lint`/`build` scripts from
  T008). Independent of US1; T012 depends on T011.
- **US3 (T013–T014)** → depends on Foundational; T014's build check is most meaningful after US1
  exists. T013 (README) is independent of US1/US2.
- **Polish (T015–T019)** → depends on all desired user stories being complete.

## Parallel Opportunities

- Within US1: `T009` and `T010` (different files) can run together.
- Polish checks `T015`–`T019` are independent verifications and can run together.
- Most Foundational tasks are independent (exception: T005 before T006 — shared `globals.css`).

## Implementation Strategy

- **MVP** = Phase 1 + Phase 2 + Phase 3 (US1): a real app rendering the themed landing locally.
- **Then** US2 (CI rail) → US3 (README + deployability) → Polish/DoD.
- Commit after each task (each task is one-commit-sized). Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-001, FR-002, FR-003 |
| T002 | FR-011 |
| T003, T018 | FR-002, SC-007 |
| T004 | FR-003 |
| T005 | FR-004 |
| T006 | FR-004a, SC-001a |
| T007 | FR-006 |
| T008 | FR-007, FR-010 |
| T009 | FR-004 |
| T010 | FR-004, FR-004a, FR-005 |
| T011 | FR-007, FR-008, SC-002, SC-005 |
| T012 | SC-005, SC-006 |
| T013 | FR-009 |
| T014 | FR-012, SC-008 |
| T015 | SC-002, SC-003, SC-004, FR-010 |
| T016 | SC-001, SC-001a |
| T017 | DoD, Edge Cases |
| T019 | P-IV, P-X, P-XI |

## Notes

- 19 atomic tasks; 0 test tasks (not requested).
- Out of scope (do NOT add): database/Drizzle/schema/fixtures, auth, R2, Inngest, Resend, JetBrains
  Mono, the colour-token system, dark mode, the spacing scale, the styleguide, and any product UI.
