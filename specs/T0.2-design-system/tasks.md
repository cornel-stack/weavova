---
description: "Task list for T0.2 — Pressroom design system, /styleguide, ProofCard"
---

# Tasks: T0.2 — Pressroom design-token system, /styleguide, and the canonical ProofCard

**Input**: Design documents from `specs/T0.2-design-system/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{design-tokens,proof-card,styleguide}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2** (Principle IV tokens).
**Tests**: NOT requested for this slice (verification is via typecheck/lint/build, CI, and manual
both-theme checks on /styleguide). No test tasks are generated.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> scaffolded, or installed. Execution happens in `/speckit.implement` after human approval.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1 / US2 / US3 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one commit.

---

## Phase 1: Setup

- [ ] T001 Install the two pre-authorized dependencies: `next-themes` and `lucide-react` (and only
  these); confirm `package.json` adds nothing else outside the locked stack. → FR-026, SC-009

**Checkpoint**: deps present; no off-stack additions.

---

## Phase 2: Foundational (token layer + theming infra — BLOCKS all user stories)

- [ ] T002 Define the full colour-token layer in `src/app/globals.css`: Daylight under `:root,
  [data-theme="daylight"]` and Ink under `[data-theme="ink"]`, every token from Principle IV
  v1.1.2 (paper/card/sunken, ink/ink-2/ink-3, hairline/rule, persimmon/-deep/-tint, on-accent,
  success/-tint, warning/-tint, danger/-tint). Remove the T0.1 hard-coded `background:#f7f2e8`. No
  off-token values. → FR-001, SC-001
- [ ] T003 Map tokens into the Tailwind v4 theme in `globals.css` via `@theme inline`: colours →
  `bg-*`/`text-*`/`border-*`; radii `--radius-pill/control/clip/modal` → `rounded-*`; widths
  (1240/680); breakpoints (480/1024/1280); shadows `--shadow-clip/lift/modal`; font families
  `--font-display/ui/mono`. → FR-004, FR-006, FR-007
- [ ] T004 Define the type-scale tokens in `globals.css` and map to text utilities: `--text-display-2xl…xs`,
  `--text-heading-lg/md/sm`, `--text-quote`, `--text-body`, `--text-body-sm`, `--text-label`,
  `--text-mono`, `--text-mono-sm` — size/line-height per Principle IV v1.1.2, correct family per
  role. → FR-003
- [ ] T005 Wire **JetBrains Mono** via `next/font/google` as `--font-mono` in `src/app/layout.tsx`
  (alongside Fraunces `--font-display` and Hanken Grotesk `--font-ui`); apply all three variable
  classes on `<html>`. → FR-002, SC-002
- [ ] T006 Add motion tokens + reduced-motion handling in `globals.css`: durations 120/200/≤420ms,
  `--ease cubic-bezier(0.2,0,0,1)`; disable transitions under `@media (prefers-reduced-motion:
  reduce)`. → FR-008
- [ ] T007 Create `src/components/theme-provider.tsx` (Client) wrapping `next-themes`
  (`attribute="data-theme"`, `themes=["daylight","ink"]`, `defaultTheme="daylight"`,
  `enableSystem={false}`, `disableTransitionOnChange`); wrap the app in `layout.tsx` and add
  `suppressHydrationWarning` to `<html>` for no flash-of-wrong-theme. → FR-009, FR-010

**Checkpoint**: every token resolves as a Tailwind utility; both themes wired; Daylight paints with
no flash. User stories can begin.

---

## Phase 3: User Story 1 — Token system, visible on /styleguide (Priority: P1) 🎯 MVP

**Goal**: /styleguide renders the full palette, type scale, buttons, and consent chips from tokens.
**Independent Test**: open `/styleguide`; palette swatches show exact hexes, three fonts render, the
four button variants and three chips are present per the Pressroom rules (quickstart §1,2,4,5).

- [ ] T008 [US1] Create the internal `src/app/styleguide/page.tsx` (Server Component) shell — a
  section-based layout, reachable directly, and NOT linked from the landing (`/`). → FR-012, SC-007
- [ ] T009 [US1] Build `src/components/ui/swatch.tsx` and render the **palette** section on
  /styleguide: every Daylight and Ink colour token as a labelled swatch with name + exact hex
  (v1.1.2), reading the current theme's value. → FR-013, FR-001, SC-001
- [ ] T010 [US1] Render the **type-scale** section on /styleguide: display 2xl→xs, heading lg/md/sm,
  quote, body, body-sm, label, mono, mono-sm — each labelled in its correct family (Fraunces /
  Hanken Grotesk / JetBrains Mono). → FR-013, FR-003, SC-002
- [ ] T011 [US1] Build `src/components/ui/button.tsx` with variants: persimmon **PRIMARY**
  (`bg-persimmon`/`text-on-accent`), solid-ink **STRONG SECONDARY**, ink-hairline-outline **QUIET**,
  **DANGER** — persimmon on the primary only. Render all four on /styleguide. → FR-014, SC-004
- [ ] T012 [US1] Build `src/components/ui/chip.tsx` for consent states granted=success,
  awaiting=warning, revoked=danger (status + status-tint tokens); render the three on /styleguide.
  → FR-015, SC-005

**Checkpoint**: the token system is proven on /styleguide (Daylight).

---

## Phase 4: User Story 2 — The canonical ProofCard (Priority: P1)

**Goal**: the ProofCard ("the clipping"), ported faithfully from the export, on /styleguide.
**Independent Test**: text-proof variant leads with the Fraunces quote; media-proof leads with a
neutral-placeholder thumbnail; consent dot reflects state; unreviewed stamp + verified mark show;
hover "Make" appears only when consent is granted (quickstart §6).

- [ ] T013 [US2] Define `src/lib/proof.ts`: `ProofType` (text|video|photo|audio), `ConsentState`
  (granted|awaiting|revoked), and `ProofCardProps` (id, customerName, proofType, quote, transcript,
  source, consentState, thumbnail?, capturedAt, reviewed, verified) per data-model.md — the T0.3
  proof-entity contract. → FR-022 (P-VI)
- [ ] T014 [US2] **Port** the canonical ProofCard into `src/components/proof-card.tsx` from the
  export's **`wv-clip` markup** in `/design-reference` screens **01 Dashboard** and **02 Proof
  inbox** — lift the structure faithfully (PORT, do not redesign, P-V): warm `bg-card`, 1px
  `border-hairline`, `rounded-clip` (6px), `--shadow-clip`; **proof-forward** (P-II) — the verbatim
  `quote` in `font-display` (Fraunces) for text proof, or the `thumbnail` for media proof, as the
  largest/warmest element; quiet meta row (initials avatar + `customerName`, lucide source glyph at
  1.5px stroke + `source` in mono, consent dot coloured by `consentState`, `capturedAt` in mono).
  → FR-016, FR-017, FR-018, SC-006
- [ ] T015 [US2] Add the ProofCard states ported from `wv-clip` (`wv-cornerstamp`, verified mark,
  hover `wv-clip--hover` "Make"): "Unreviewed" corner stamp when `reviewed === false`; persimmon
  "verified real customer" mark when `verified === true`; persimmon **"Make"** action revealed on
  hover (`--shadow-lift`) ONLY when `consentState === "granted"`, suppressed otherwise (card reads
  as needing consent). Make is visual-only this slice. → FR-019, FR-020, SC-006 (P-VII)
- [ ] T016 [US2] Render the ProofCard on /styleguide with hardcoded props in two variants:
  text-proof (granted, verified, unreviewed) and media-proof (awaiting, **neutral placeholder**
  thumbnail — no real identifiable people). → FR-021, FR-023, SC-006

**Checkpoint**: the canonical clipping renders both variants, proof-dominant and consent-aware.

---

## Phase 5: User Story 3 — Daylight / Ink theming with no flash (Priority: P2)

**Goal**: a theme toggle switches Daylight↔Ink with no flash and persists across reloads.
**Independent Test**: toggle to Ink — whole /styleguide (palette/type/buttons/chips/ProofCard)
switches with no flash; reload persists Ink; toggle back (quickstart §3).

- [ ] T017 [US3] Build `src/components/theme-toggle.tsx` (Client) using a lucide icon (1.5px
  stroke) to switch Daylight↔Ink via `next-themes`; place it on /styleguide. → FR-010, SC-003
- [ ] T018 [US3] Verify theming end-to-end: every /styleguide section (palette swatches with Ink
  hexes, type, buttons, chips, ProofCard) re-themes; no flash on toggle or first paint; the chosen
  theme persists across a reload. → FR-010, FR-011, SC-003

**Checkpoint**: both themes are correct, no-flash, persisted.

---

## Phase 6: Polish & Definition of Done

- [ ] T019 [P] Persimmon-reservation audit: persimmon appears ONLY on the primary Button and the
  ProofCard verified/Make marks — nowhere else (grep `persimmon` usages + visual check on
  /styleguide in both themes). → FR-024 (P-IV)
- [ ] T020 [P] Run `npm run typecheck`, `npm run lint`, `npm run build` — all green. → SC-008
- [ ] T021 [P] /styleguide responsive at `480 / 1024 / 1280`; keyboard-accessible (theme toggle and
  the ProofCard "Make" action are focusable/operable); `prefers-reduced-motion` respected. → SC-008
- [ ] T022 [P] Protected-files check: `git diff` shows `CLAUDE.md` changed only by the approved
  token records + the marker; `design-reference/`, `docs/`, `.specify/` untouched; microcopy has no
  "amazing"/"awesome"/emoji. → P-XI
- [ ] T023 [P] Off-stack dependency check: only the locked stack plus `next-themes` and
  `lucide-react`. → FR-026, SC-009
- [ ] T024 Push the feature branch; confirm CI (typecheck + lint + build) is green. → SC-008

**Checkpoint**: Definition of Done met — STOP and report; do not advance to T0.3 until the human
says to proceed (P-IX).

---

## Dependencies & Execution Order

- **Setup (T001)** → first; deps must exist before the provider/icons are wired.
- **Foundational (T002–T007)** → depends on Setup; BLOCKS all user stories. T002 before T003/T004
  (mapping/type tokens reference the vars); T007 (provider) before any both-theme rendering.
- **US1 (T008–T012)** → depends on Foundational. T008 (route shell) first; T009–T012 are
  independent component+section tasks (different files) → parallelizable after T008.
- **US2 (T013–T016)** → depends on Foundational; T013 (types) before T014; T014 before T015 (states
  extend the card); T016 (styleguide render) after T015. Independent of US1.
- **US3 (T017–T018)** → depends on Foundational (provider) and benefits from US1/US2 existing to
  re-theme; T017 before T018.
- **Polish (T019–T024)** → after all user stories.

## Parallel Opportunities

- US1: `T009`, `T010`, `T011`, `T012` (different files/sections) after `T008`.
- Polish: `T019`–`T023` are independent checks.
- Across stories: US1 and US2 component sets are largely independent once Foundational is done.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 — the token system proven on /styleguide (Daylight).
- Then US2 (ProofCard) → US3 (theming toggle) → Polish/DoD.
- Commit after each task (one commit each). Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001, T023 | FR-026, SC-009 |
| T002, T009 | FR-001, SC-001 |
| T003 | FR-004, FR-006, FR-007 |
| T004, T010 | FR-003, SC-002 |
| T005 | FR-002, SC-002 |
| T006 | FR-008 |
| T007, T017, T018 | FR-009, FR-010, FR-011, SC-003 |
| T008 | FR-012, SC-007 |
| T011 | FR-014, SC-004 |
| T012 | FR-015, SC-005 |
| T013 | FR-022 (P-VI) |
| T014 | FR-016, FR-017, FR-018, SC-006 (P-II, P-V) |
| T015 | FR-019, FR-020, SC-006 (P-VII) |
| T016 | FR-021, FR-023, SC-006 |
| T019 | FR-024 (P-IV) |
| T020, T021, T024 | SC-008 |
| T022 | P-XI |

## Notes

- 24 atomic tasks; 0 test tasks (not requested).
- ProofCard (T014/T015) ports the export's `wv-clip` markup from /design-reference screens 01/02 —
  port faithfully, never redesign (P-V).
- Out of scope (do NOT add): the ClipCard, nav chrome / command palette, other product screens, the
  database/schema/fixtures, auth, R2, jobs. Persimmon stays reserved (primary + verified/Make).
