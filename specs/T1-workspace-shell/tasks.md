---
description: "Task list for T1 — Workspace shell + stub session"
---

# Tasks: T1 — Workspace shell (rail, top bar, switcher, command palette) + stub session

**Input**: Design documents from `specs/T1-workspace-shell/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{session-seam,app-shell}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Tests**: NOT requested for this slice (verification via the rendered shell, palette/switcher
interaction, typecheck/lint/build, and CI). No test tasks are generated.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> scaffolded, or installed. Execution happens in `/speckit.implement` after human approval.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1 / US2 / US3 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one commit.

---

## Phase 1: Setup

- [ ] T001 Install **cmdk** (the only new dependency — for the command palette). Confirm
  `package.json` adds nothing else outside the locked stack. → FR-016, SC-007
- [ ] T002 Create `src/lib/nav.ts`: the eight nav destinations (`label`, `href`, `icon` lucide) in
  the design-reference order/labels (Dashboard `/app`, Proof `/app/proof`, Campaigns
  `/app/campaigns`, Showcase `/app/showcase`, Library `/app/library`, Requests `/app/requests`,
  Brand kits `/app/brand`, Consent `/app/consent`). Shared by the rail and the palette. → FR-005,
  FR-012
- [ ] T003 Create the **session/workspace seam** `src/lib/session.ts` (server-only): `getSession()`
  returns a hardcoded stub user `{ user: { name, initials, email? } }`; `getCurrentWorkspace()`
  returns the seeded demo workspace via the query in T004. This is the ONLY place T6 swaps for real
  auth; no component hardcodes the workspace id. → FR-001, FR-002, FR-003 (P-VI)
- [ ] T004 Add `getDefaultWorkspace(): Promise<Workspace | null>` to `src/db/queries.ts` (Drizzle
  only) — returns the demo workspace (by slug `lumen`, or the first row); `getCurrentWorkspace()`
  wraps it and errors clearly if absent. → FR-002 (P-X)

**Checkpoint**: cmdk present; nav config + the session/workspace seam exist.

---

## Phase 2: Foundational (the /app shell — BLOCKS user stories)

- [ ] T005 Create `src/app/app/layout.tsx` (Server, **`export const dynamic = "force-dynamic"`**):
  resolve `getSession()` + `getCurrentWorkspace()` and render
  `<AppChrome user={user} workspace={ws}>{children}</AppChrome>`. force-dynamic + the lazy db client
  keep `next build` / CI green without `DATABASE_URL`. → FR-004, FR-015, SC-006
- [ ] T006 Create `src/components/app/app-chrome.tsx` (Client): the single chrome island — holds the
  palette/switcher open state + the ⌘K (⌘/Ctrl+K) keydown listener; renders the rail, the top bar,
  the command palette, and `{children}`. Receives `user` + `workspace` as props (no id hardcoded).
  → FR-006, FR-010

**Checkpoint**: the `/app` shell mounts; build is green without a DB.

---

## Phase 3: User Story 1 — The workspace shell, scoped through the stub session (Priority: P1) 🎯 MVP

**Goal**: rail + top bar render scoped to the demo workspace via the seam; every rail destination
routes to a placeholder inside the shell.
**Independent Test**: open `/app`; rail + top bar render scoped to the demo workspace; each rail link
routes to its placeholder inside the shell with the active link marked (quickstart §1,2).

- [ ] T007 [US1] Create `src/components/app/app-rail.tsx` (Client): the Weavova wordmark + the eight
  nav links from `src/lib/nav.ts`, active destination marked via `usePathname()` (token active
  state — **not persimmon**), lucide icons at 1.5px. Ported from the screens 05–13 chrome; quiet.
  → FR-005, SC-004 (P-V, P-II)
- [ ] T008 [US1] Create `src/components/app/app-top-bar.tsx` (Client): the workspace block (name +
  static "Pro workspace" badge → switcher trigger), the search / **⌘K** trigger ("Search or jump…
  ⌘K", `font-mono` key hint), the T0.2 **theme toggle**, and the user-menu trigger. Receives
  `workspace` + `user` props. Ported from the Global chrome; quiet. → FR-006 (P-V)
- [ ] T009 [US1] Create the eight placeholder pages under `src/app/app/` (`page.tsx`,
  `proof/page.tsx`, `requests/page.tsx`, `campaigns/page.tsx`, `library/page.tsx`,
  `showcase/page.tsx`, `brand/page.tsx`, `consent/page.tsx`) — Server Components, minimal content (a
  section title + a "coming in a later tier" note), rendered inside the shell. No real section UI.
  → FR-013, FR-014, SC-004
- [ ] T010 [US1] Mobile rail derivation (NOT a port — the design-reference is desktop): a **drawer**
  opened from a top-bar menu button on small viewports (the rail slides in as a quiet overlay;
  closes on selection / Esc / outside-click). Apply this ONE pattern consistently; nothing flashy.
  → FR-004, SC-005 (P-XII)

**Checkpoint**: the shell renders and navigates end-to-end (desktop + mobile), scoped via the seam.

---

## Phase 4: User Story 2 — The command palette (⌘K) (Priority: P1)

**Goal**: a token-styled cmdk palette, keyboard-navigable, that navigates inside the shell.
**Independent Test**: ⌘K opens the centered palette (input focused); Up/Down + Enter navigates to a
section inside the shell and closes; Esc closes + restores focus (quickstart §3).

- [ ] T011 [US2] Create `src/components/app/command-palette.tsx` (Client) using **cmdk**: open on
  **⌘K** / Ctrl+K and from the top-bar search trigger; `Command.Dialog` centered overlay, input
  focused; **groups** — "Go to" (the eight sections from `src/lib/nav.ts`) + "Actions" (a few core
  actions); typing filters (cmdk); Up/Down select; Enter on a "Go to" item → `router.push(href)` +
  close; Esc close; focus trapped (cmdk) + restored to the trigger. → FR-010, FR-011, FR-012, SC-003
- [ ] T012 [US2] Token-style the palette to **match /design-reference screen 14** — `bg-card`, 1px
  `border-hairline`, `rounded-modal`, `--shadow-modal`; `Command.Input` in `font-ui`; group headings
  as `text-label` kickers; `Command.Item` rows with token hover/active and lucide glyphs;
  `Command.Empty` state. It MUST NOT look like a default cmdk menu. **No persimmon** (chrome stays
  quiet). → FR-010, SC-005 (P-IV, P-V)

**Checkpoint**: ⌘K drives the whole app, on-brand.

---

## Phase 5: User Story 3 — The workspace switcher (Priority: P2)

**Goal**: a dependency-free switcher popover showing the demo workspace; a user-menu stub.
**Independent Test**: open the switcher from the workspace block → shows the demo workspace (name +
badge); "new workspace" present but inert; Esc / outside-click closes (quickstart §4).

- [ ] T013 [US3] Create `src/components/app/workspace-switcher.tsx` (Client) — a **dependency-free**
  token-styled popover (no cmdk), ported from /design-reference screen 24: opens from the workspace
  block; shows the current demo workspace (name + badge); a "new workspace" affordance present but
  **inert** (no-op); Esc / outside-click closes + restores focus. → FR-008, FR-009, SC-002 (P-V)
- [ ] T014 [US3] Create `src/components/app/user-menu.tsx` (Client) — a **dependency-free** token
  popover: the stub user (initials avatar + name from `getSession()`); no real actions yet; Esc /
  outside-click closes + restores focus. → FR-006 (P-X)

**Checkpoint**: the workspace + identity surfaces are in place.

---

## Phase 6: Polish & Definition of Done

- [ ] T015 [P] Run `npm run typecheck`, `npm run lint`, `npm run build` — all green; confirm the
  build is green **without** `DATABASE_URL` (the `/app` segment is `ƒ` dynamic). → SC-006
- [ ] T016 [P] **No-hardcoded-workspace-id** check: the workspace is resolved ONLY via the seam
  (`grep getCurrentWorkspace|getDefaultWorkspace src/lib src/db`); no workspace id literal and no
  direct db import appears in `src/components/app` or `src/app/app`. → FR-003, SC-001 (P-VI)
- [ ] T017 [P] **ProofCard / existing components unchanged**: `git diff --quiet main --
  src/components/proof-card.tsx`; `/styleguide` and `/styleguide/data` still build/render. → FR-017,
  SC-006
- [ ] T018 [P] Both themes (Daylight/Ink re-theme the shell + overlays) + responsive (the mobile
  drawer works at the small breakpoint) + keyboard-accessible (⌘K, Up/Down/Enter/Esc; rail,
  switcher, user-menu reachable; overlays trap + restore focus). → SC-005
- [ ] T019 [P] Off-stack dependency check: only `cmdk` added beyond the existing stack. → FR-016,
  SC-007
- [ ] T020 [P] Protected-files + microcopy: `design-reference/`, `docs/`, `.specify` templates/scripts
  untouched vs main; `CLAUDE.md` changed only by the SPECKIT marker; no "amazing"/"awesome", no
  emoji. → P-XI
- [ ] T021 Push the feature branch; confirm CI (typecheck + lint + build) is green **without** a
  `DATABASE_URL` secret. → SC-006

**Checkpoint**: Definition of Done met — STOP and report; do not advance to T2 until the human says
to proceed (P-IX).

---

## Dependencies & Execution Order

- **Setup (T001–T004)** → first. T002/T003/T004 before the shell; T003 (seam) wraps T004 (query).
- **Foundational (T005–T006)** → depends on Setup; BLOCKS user stories. T005 (layout) renders T006
  (`AppChrome`).
- **US1 (T007–T010)** → depends on Foundational. T007 (rail) + T008 (top bar) render inside
  `AppChrome`; T009 (placeholders) are independent pages; T010 (mobile drawer) extends the rail/top
  bar.
- **US2 (T011–T012)** → depends on Foundational (the palette mounts in `AppChrome`); T011 then T012
  (styling).
- **US3 (T013–T014)** → depends on US1's top bar (the triggers live there); T013 + T014 are different
  files (parallelizable).
- **Polish (T015–T021)** → after the user stories.

## Parallel Opportunities

- US1: the eight placeholder pages (T009) are independent.
- US3: `T013` (switcher) and `T014` (user-menu) — different files.
- Polish: `T015`–`T020` are independent checks.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 — the shell renders and navigates, scoped via the seam.
- Then US2 (palette) → US3 (switcher + user-menu) → Polish/DoD.
- Commit after each task (one commit each). Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001, T019 | FR-016, SC-007 |
| T002 | FR-005, FR-012 |
| T003 | FR-001, FR-002, FR-003 (P-VI) |
| T004 | FR-002 (P-X) |
| T005 | FR-004, FR-015, SC-006 |
| T006 | FR-006, FR-010 |
| T007 | FR-005, SC-004 (P-II, P-V) |
| T008 | FR-006 (P-V) |
| T009 | FR-013, FR-014, SC-004 |
| T010 | FR-004, SC-005 (P-XII) |
| T011 | FR-010, FR-011, FR-012, SC-003 |
| T012 | FR-010, SC-005 (P-IV, P-V) |
| T013 | FR-008, FR-009, SC-002 (P-V) |
| T014 | FR-006 (P-X) |
| T015, T021 | SC-006 |
| T016 | FR-003, SC-001 (P-VI) |
| T017 | FR-017, SC-006 |
| T018 | SC-005 |
| T020 | P-XI |

## Notes

- 21 atomic tasks; 0 test tasks (not requested).
- **cmdk is for the palette ONLY**, token-styled to screen 14 (must visually match the reference,
  not a default cmdk menu). The switcher (T013) and user-menu (T014) are dependency-free token
  popovers.
- The session/workspace seam (`src/lib/session.ts`) is the single T6 swap; the no-hardcoded-id check
  (T016) + the ProofCard-unchanged check (T017) are explicit DoD gates.
- Mobile rail = a top-bar **drawer** (one consistent quiet pattern; a derivation, not a port).
- `/app` stays `force-dynamic` + lazy client → CI builds green without a `DATABASE_URL`.
- Out of scope (do NOT build): the spine pages (Dashboard/Proof inbox/Proof detail/Clip studio, T2),
  derived states (T3), bulk/exports (T4), remaining real surfaces (T5), real auth/onboarding (T6),
  capture (T7), settings (T9). Rail links to those sections, but their pages are placeholders here.
