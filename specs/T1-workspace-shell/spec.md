# Feature Specification: T1 — Workspace shell (rail, top bar, switcher, command palette) + stub session

**Feature Branch**: `T1-workspace-shell`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "Slice T1 — The workspace shell (rail, top bar, workspace switcher, command palette) + the stub session. The persistent chrome every authenticated screen lives inside, and the 'who am I / which workspace' context the whole app scopes to."

## Overview

This slice builds the persistent **chrome** every authenticated screen lives inside — a left
navigation **rail** and a **top bar** — plus the **command palette** (⌘K) and **workspace
switcher** overlays, all ported faithfully from the `/design-reference` workspace screens. The
spine screens (T2) render INSIDE this shell.

Folded in is the deferred **stub-session foundation**: a `getSession()` returning a hardcoded
signed-in stub user (there is no users table yet — that's T6) and a `getCurrentWorkspace()`
returning the seeded demo workspace from the T0.3 database. **These two helpers are the single seam
real Auth.js replaces at T6** — every screen scopes through them, and no workspace id is hardcoded
across components. This is fixtures-first: the app is built on this one seam, so real auth lands
with no UI rework.

This slice ships the shell + the two overlays + **placeholder** section routes for each rail
destination, so navigation and the palette work end-to-end. The real section pages (Dashboard, Proof
inbox, etc.) are T2+ and are NOT built here.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The workspace shell, scoped through the stub session (Priority: P1)

A developer opens `/app`. The persistent shell renders — the left rail and the top bar — scoped to
the demo workspace resolved through `getCurrentWorkspace()` and the stub `getSession()` user. Every
rail destination routes to a placeholder page that renders inside the same shell.

**Why this priority**: The shell + the session/workspace seam is the foundation every later screen
depends on. With just this, the spine (T2) can be built inside the chrome, and the seam is the one
place T6 swaps in real auth. It is the MVP.

**Independent Test**: Open `/app`; confirm the rail (Weavova wordmark + the section links) and the
top bar (workspace block, search/⌘K trigger, theme toggle, user-menu stub) render, scoped to the
demo workspace. Click each rail link and confirm it routes to a placeholder page inside the shell,
with the active destination highlighted.

**Acceptance Scenarios**:

1. **Given** the app, **When** the developer opens `/app`, **Then** the rail and top bar render,
   and the top bar shows the current workspace (the seeded demo workspace) resolved via
   `getCurrentWorkspace()` and the stub user via `getSession()` — not a hardcoded id in the
   component.
2. **Given** the shell, **When** the developer clicks a rail destination (Dashboard, Proof,
   Requests, Campaigns, Library, Showcase, Brand, Consent), **Then** the app routes to that
   section's placeholder page, rendered inside the shell, with the active link marked.
3. **Given** any screen, **When** it needs the current workspace, **Then** it obtains it through the
   resolver (one seam) — no component hardcodes the workspace id.

---

### User Story 2 - The command palette (⌘K) (Priority: P1)

A developer presses ⌘K (or the search trigger). A centered overlay opens, fully keyboard-navigable;
typing filters grouped results; arrow keys move the selection; Enter activates; Esc closes.
Navigating to a section actually routes there inside the shell.

**Why this priority**: The palette is the global navigation/action surface and a signature
interaction (ported from screen 14). It must work end-to-end so the whole app is keyboard-driveable.

**Independent Test**: Press ⌘K; confirm the overlay opens focused on the input. Use Up/Down to move
through grouped results, Enter to navigate to a section (the app routes there, the overlay closes),
and Esc to dismiss. Confirm it traps focus and restores focus on close.

**Acceptance Scenarios**:

1. **Given** the shell, **When** the developer presses ⌘K (or clicks the search trigger), **Then** a
   centered command-palette overlay opens with the input focused.
2. **Given** the open palette, **When** the developer types, **Then** results filter; results are
   grouped (at minimum a "Go to" group for the product sections, plus a few core actions).
3. **Given** the open palette, **When** the developer uses Up/Down to select a result and presses
   Enter, **Then** the app navigates to that section inside the shell and the palette closes; **When**
   the developer presses Esc, **Then** the palette closes and focus returns to the trigger.

---

### User Story 3 - The workspace switcher (Priority: P2)

A developer opens the workspace switcher from the top-bar workspace block. An overlay (ported from
screen 24) shows the current demo workspace; a "new workspace" affordance may be present but is inert
for now.

**Why this priority**: The switcher establishes the multi-workspace shape the app scopes to, but
with one seeded workspace it is the smallest of the three; full multi-workspace switching arrives
with real workspaces at T6.

**Independent Test**: Open the switcher; confirm it shows the current demo workspace (name + badge);
the "new workspace" affordance is visible but does nothing; Esc / outside-click closes it.

**Acceptance Scenarios**:

1. **Given** the shell, **When** the developer activates the workspace block / switcher trigger,
   **Then** the switcher overlay opens showing the current demo workspace.
2. **Given** the open switcher, **When** the developer views it, **Then** the "new workspace"
   affordance is present but inert (no-op) in this slice.
3. **Given** the open switcher, **When** the developer presses Esc or clicks outside, **Then** it
   closes and focus is restored.

---

### Edge Cases

- **No workspace in the DB** (seed not run): the resolver should fail gracefully (a clear empty/error
  state) rather than crash; in normal operation T0.3 has seeded the demo workspace.
- **Build without `DATABASE_URL`**: because the shell reads the workspace from the T0.3 DB, the
  `/app` shell is dynamic (force-dynamic + the lazy db client) so `next build` / CI are green without
  a database — consistent with T0.3.
- **Mobile / narrow viewport**: the rail adapts (a collapsible drawer or an icon rail) so the chrome
  stays usable at the small breakpoint.
- **Keyboard**: ⌘K opens the palette; Up/Down/Enter/Esc operate it; rail links, switcher, and
  user-menu are reachable and operable by keyboard; overlays trap focus and restore it on close.
- **Active route**: the rail marks the current section.
- **Theme**: the shell and both overlays render correctly in Daylight and Ink.
- **Overlay dismissal**: Esc and outside-click close the palette and switcher; the body scroll is
  managed while an overlay is open.

## Requirements *(mandatory)*

### Stub session + current-workspace seam (the folded-in foundation)

- **FR-001**: A `getSession()` helper MUST return a **hardcoded stub signed-in user** (e.g. display
  name + initials; there is NO users table — that is T6). It is server-side and is the single seam
  T6 replaces with real Auth.js.
- **FR-002**: A `getCurrentWorkspace()` helper MUST return the **seeded demo workspace** from the
  T0.3 database (via the existing Drizzle query layer / lazy client). It is the single workspace
  seam every screen scopes through.
- **FR-003**: No component MAY hardcode the workspace id; all workspace scoping MUST go through
  `getCurrentWorkspace()`. `getSession()` / `getCurrentWorkspace()` are the ONLY place T6 changes to
  introduce real auth — no UI rework.

### The /app shell (ported chrome)

- **FR-004**: An `/app` route-group layout MUST render the **workspace shell**, ported faithfully
  from the chrome around the `/design-reference` workspace screens (the rail + top bar shared across
  screens **05–13** and the Global chrome). Layout and structure are ported; all values come from the
  v1.1.x Pressroom tokens.
- **FR-005**: The shell MUST include a **left navigation rail**: the Weavova wordmark and links to
  the sections — Dashboard, Proof (inbox), Requests, Campaigns, Library, Showcase, Brand, Consent —
  in the design-reference order/labels, with the active destination marked.
- **FR-006**: The shell MUST include a **top bar** with: the current workspace + switcher trigger;
  the command-palette / search trigger ("Search or jump… ⌘K"); the theme toggle (from T0.2); and a
  **user-menu stub** (the stub user from `getSession()`).
- **FR-007**: The shell chrome MUST stay quiet (Principle II) — it frames content and never competes
  with the proof that later screens render inside it.

### Workspace switcher (screen 24)

- **FR-008**: A **workspace switcher** overlay MUST be ported from `/design-reference` screen 24,
  showing the **current demo workspace** (name + badge). A "new workspace" affordance MAY be present
  but MUST be inert (no-op) in this slice.
- **FR-009**: The switcher MUST open from the top-bar workspace block, close on Esc / outside-click,
  trap focus while open, and restore focus on close.

### Command palette (screen 14 / Global)

- **FR-010**: A **command palette** MUST be ported from `/design-reference` screen 14, opening as a
  **centered overlay** on **⌘K** (and from the search trigger), with the input focused.
- **FR-011**: The palette MUST be **fully keyboard-navigable**: typing filters; Up/Down move the
  selection; Enter activates; Esc closes; focus is trapped while open and restored on close.
- **FR-012**: Results MUST be **grouped** — at minimum a "Go to" group navigating to each product
  section, plus a few **core actions**. Activating a navigation result MUST route to that section
  inside the shell. (Richer proof search arrives with the inbox at T2.)

### Placeholder section routes

- **FR-013**: Each rail destination MUST have a **placeholder page** under `/app`
  (`/app`, `/app/proof`, `/app/requests`, `/app/campaigns`, `/app/library`, `/app/showcase`,
  `/app/brand`, `/app/consent`) that renders **inside the shell** with minimal placeholder content
  (a title + a "coming in a later tier" note), so navigation and the palette work end-to-end.
- **FR-014**: This slice MUST NOT build the real section content (Dashboard, Proof inbox, Proof
  detail, Clip studio, or any T2+ page). The placeholders are replaced later.

### Scope / quality guards

- **FR-015**: The shell read of the current workspace MUST keep the build green without a
  `DATABASE_URL` (the `/app` shell is dynamic + the db client is lazy, per T0.3).
- **FR-016**: This slice MUST add **no dependency outside the locked stack** (the command palette and
  focus management are built with React; `next-themes` and `lucide-react` already exist).
- **FR-017**: The **T0.2 ProofCard and other existing components MUST remain unchanged**; the
  hardcoded styleguide and the `/styleguide/data` proof-of-path keep working.

### Key Entities *(data)*

- **StubSession** (not a table): `{ user: { name, initials, email? } }` — a hardcoded stub from
  `getSession()`; the users table is T6.
- **Workspace** (existing T0.3 table): `id`, `name`, `slug`, `createdAt`. `getCurrentWorkspace()`
  returns the seeded demo workspace; the shell shows its name/badge.
- **Nav destination** (config, not a table): the rail/palette entries — label, route, icon — for the
  eight sections.

## Success Criteria *(mandatory)*

- **SC-001**: `/app` renders the rail and top bar, scoped to the demo workspace resolved through the
  stub session / current-workspace helper (not a hardcoded id scattered across components).
- **SC-002**: The workspace switcher (from screen 24) opens and shows the current demo workspace.
- **SC-003**: ⌘K opens the command palette (from screen 14), keyboard-navigable (Up/Down/Enter/Esc),
  and navigating to a section actually routes there inside the shell.
- **SC-004**: Every rail destination routes to a placeholder page rendered inside the shell, with the
  active destination marked.
- **SC-005**: The shell and overlays work in both Daylight and Ink, are responsive at the breakpoints
  (the rail adapts on mobile), use only the v1.1.x tokens, and are keyboard-accessible.
- **SC-006**: typecheck, lint, and build pass with zero errors; CI is green (without a
  `DATABASE_URL` secret). The T0.2 ProofCard and other components remain unchanged.
- **SC-007**: No dependency outside the locked stack is added.

## Constitution Alignment *(mandatory)*

- **Port, don't redesign (P-V)**: The rail + top bar are ported from the chrome around screens
  05–13, the switcher from screen 24, and the palette from screen 14 — named reference screens, no
  redesign. Layout is ported; values come from the tokens.
- **Customer is the headline (P-II)**: The shell is quiet chrome — it frames the screens that render
  inside it and never competes with the proof. This slice adds no proof surface; the restraint is
  the point.
- **Fixtures-first (P-VI)**: `getSession()` + `getCurrentWorkspace()` are the single seam the whole
  app scopes through; T6 swaps them for real Auth.js with no UI rework. The workspace comes from the
  T0.3 fixtures/DB.
- **Locked stack (P-III)**: No new dependency — the palette and focus trap are built with React;
  theming/icons reuse `next-themes`/`lucide-react`.
- **Coding conventions (P-X)**: Server Components by default (the shell layout, the resolver, the
  placeholder pages); Client Components only where interactivity requires (palette, switcher,
  user-menu, theme toggle). kebab-case files, PascalCase components, TS strict, Tailwind classes only,
  no hand-written `localStorage`/`sessionStorage` (theme persistence stays with `next-themes`).
- **Never-do (P-XI)**: `/design-reference` and `/docs` untouched; no real people; microcopy avoids
  "amazing"/"awesome" and emoji; the slice stays scoped (placeholders, not real section content).
- **Ambiguity handling (P-XII)**: Where the chrome's behaviour isn't fully specified by the export
  (e.g. exact mobile-rail behaviour), the decision is taken against the named reference screen rather
  than invented; open questions reference the screen by name.

## Assumptions

- **Shell is dynamic**: because `getCurrentWorkspace()` reads the T0.3 DB, the `/app` layout is
  `force-dynamic` and the db client stays lazy, so `next build` / CI are green without a
  `DATABASE_URL` (mirrors T0.3).
- **Stub user persona**: `getSession()` returns a hardcoded stub user consistent with the
  design-reference (e.g. "Maya K." / initials "MK"); it is a placeholder, not real data, and is
  replaced at T6.
- **No new dependency for the palette**: the command palette, keyboard navigation, and focus
  trapping are implemented with React + native event handling (no `cmdk` or modal library), to honor
  the locked stack. (If a dedicated palette library is ever wanted, it must be proposed first.)
- **Rail destinations** map to the eight `/app` routes (`/app`, `/app/proof`, `/app/requests`,
  `/app/campaigns`, `/app/library`, `/app/showcase`, `/app/brand`, `/app/consent`); the
  design-reference order/labels are followed (Dashboard, Proof, Campaigns, Showcase, Library,
  Requests, Brand kits, Consent).
- **No auth gate yet**: with no real auth (T6), `/app` is reachable directly; the stub session always
  resolves a signed-in user. An auth gate/redirect is T6.
- **Placeholder pages** carry minimal content (a section title + a "coming in a later tier" note),
  rendered inside the shell — never the real section UI.
- **Palette content**: a "Go to" group for the eight sections plus a few core actions (e.g. open the
  palette's own actions); richer proof search is deferred to the inbox at T2.
- **Switcher "new workspace"** is inert; real workspace creation/switching is T6.
- **Theme toggle** in the top bar reuses the T0.2 `ThemeToggle`.
