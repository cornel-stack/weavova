# Implementation Plan: T1 — Workspace shell (rail, top bar, switcher, command palette) + stub session

**Branch**: `T1-workspace-shell` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T1-workspace-shell/spec.md`

> **PLANNING ONLY GUARD (this command).** This document is the technical plan. No component code is
> written, nothing is scaffolded or installed by this command. Execution happens in
> `/speckit.tasks` → `/speckit.implement`, only after human approval.

**Precondition verified**: branch `T1-workspace-shell` was created from `main` (HEAD `24d9a10`,
which the annotated tag **v0.0.1** points at). `main` contains the T0.3 foundations the shell builds
on (db client/queries, schema, the ProofCard, tokens, theme provider).

## Summary

Build the persistent **workspace shell** — a left rail + a top bar — that every authenticated screen
renders inside, plus the **command palette** (⌘K) and **workspace switcher** overlays, ported
faithfully from the `/design-reference` chrome (screens 05–13 + Global), screen 14 (palette), and
screen 24 (switcher). Fold in the **session/workspace seam**: `getSession()` (a hardcoded stub user)
and `getCurrentWorkspace()` (the seeded T0.3 demo workspace) — the single place T6 swaps for real
Auth.js, with no workspace id hardcoded in components. Ship **placeholder** pages for the eight rail
destinations so navigation and the palette work end-to-end; the real section content is T2+.

**One authorized stack addition**: `cmdk` (headless command-menu primitive) for the palette's
keyboard/combobox accessibility — styled **entirely with Pressroom tokens** to match screen 14. The
workspace switcher and the user menu stay **dependency-free** (a simple token-styled popover). The
`/app` shell is **dynamic** + the db client **lazy**, so CI builds green without a `DATABASE_URL`.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19; Next.js 15 (App Router); Node 20 (CI).

**Primary Dependencies**: Next 15, Tailwind v4, `next-themes`, `lucide-react`, Drizzle + Neon (all
existing). **New (authorized)**: `cmdk`. No other dependency.

**Storage**: Neon Postgres (read-only here) — `getCurrentWorkspace()` reads the seeded `workspace`
row via the existing Drizzle query layer / lazy client.

**Testing**: No unit-test framework (tests optional per spec); verification via the rendered `/app`
shell, palette/switcher interaction, typecheck/lint/build, and CI.

**Target Platform**: Vercel (the `/app` segment is dynamic); evergreen browsers.

**Project Type**: Web application — single Next.js app at repo root.

**Performance Goals**: Not a focus; the shell reads one workspace row.

**Constraints**: Port chrome from the named reference screens; all values from v1.1.x tokens; shell
chrome stays quiet (P-II); Server Components by default, Client only where interactive; Tailwind
classes only; no hand-written `localStorage`/`sessionStorage` (theme persistence stays with
`next-themes`); the session/workspace seam is centralized and the ONLY place T6 changes; the T0.2
ProofCard and other components are unchanged; preserve `CLAUDE.md` (marker only), `design-reference/`,
`docs/`, `.specify/`.

**Scale/Scope**: one `/app` layout, 8 placeholder routes, a rail, a top bar, the cmdk palette, a
switcher popover, a user-menu popover, the session seam.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` **v1.1.2**. Re-check after design.*

| Gate (principle) | Verdict | Justification |
|---|---|---|
| Port, don't redesign (P-V) | PASS | Rail + top bar ported from the chrome around screens 05–13 + Global; switcher from screen 24; palette from screen 14. Layout/structure ported; values from the tokens. cmdk supplies behaviour only — the look is ours, matching screen 14. |
| Customer is the headline (P-II) | PASS | The shell is quiet chrome — it frames content and adds no proof surface. The restraint is the deliverable. |
| Fixtures-first (P-VI) | PASS | `getSession()` + `getCurrentWorkspace()` are the single seam every screen scopes through; T6 swaps them for Auth.js with no UI rework. The workspace comes from the T0.3 DB. |
| Locked stack (P-III) | PASS | Only `cmdk` added (explicitly authorized). The switcher/user-menu are dependency-free; theming/icons reuse `next-themes`/`lucide-react`. |
| Coding conventions (P-X) | PASS | Server Components by default (the `/app` layout, the resolver, the placeholder pages); Client Components only for the chrome interactivity (rail active-state, top-bar triggers, palette, switcher, user-menu). Tailwind classes only; kebab-case files, PascalCase components, TS strict; no hand-written web storage. |
| Never-do (P-XI) | PASS | `/design-reference` and `/docs` untouched; no real people; microcopy avoids "amazing"/"awesome"/emoji; the slice stays scoped (placeholders, not real section content); ProofCard unchanged. |
| Ambiguity handling (P-XII) | PASS | Undecided chrome behaviour (e.g. exact mobile-rail) is taken against the named screen; the cmdk-vs-handrolled decision was surfaced and is now authorized. |

**Result: PASS.** No violations. The `/app`-dynamic + lazy-client measure (R5) keeps CI green
without a DB — a build-correctness note, not added complexity. Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/T1-workspace-shell/
├── spec.md
├── plan.md              # this file
├── research.md          # route group, session seam, cmdk theming, switcher popover, dynamic shell
├── data-model.md        # StubSession + getCurrentWorkspace contract + nav config (no new tables)
├── quickstart.md        # /app shell → palette → switcher → placeholders → gates
└── contracts/
    ├── session-seam.md   # getSession / getCurrentWorkspace (the T6 seam)
    └── app-shell.md      # rail / top bar / palette / switcher UI contract
```

### Source Code (repository root) — PLANNED, created later by /speckit.implement

```text
src/
├── app/
│   └── app/                          # the /app route segment (authenticated shell)
│       ├── layout.tsx                # NEW — Server, force-dynamic; resolves session + workspace;
│       │                             #   renders <AppChrome user ws>{children}</AppChrome>
│       ├── page.tsx                  # NEW — Dashboard placeholder
│       ├── proof/page.tsx            # NEW — Proof inbox placeholder
│       ├── requests/page.tsx         # NEW — Requests placeholder
│       ├── campaigns/page.tsx        # NEW — Campaigns placeholder
│       ├── library/page.tsx          # NEW — Library placeholder
│       ├── showcase/page.tsx         # NEW — Showcase placeholder
│       ├── brand/page.tsx            # NEW — Brand placeholder
│       └── consent/page.tsx          # NEW — Consent placeholder
├── components/
│   └── app/
│       ├── app-chrome.tsx            # NEW (Client) — holds palette/switcher state + ⌘K listener;
│       │                             #   renders rail + top bar + palette + {children}
│       ├── app-rail.tsx              # NEW (Client) — left rail; active link via usePathname
│       ├── app-top-bar.tsx           # NEW (Client) — workspace block + search/⌘K trigger +
│       │                             #   theme toggle + user-menu
│       ├── command-palette.tsx       # NEW (Client) — cmdk dialog, token-styled, grouped results
│       ├── workspace-switcher.tsx    # NEW (Client) — dependency-free popover (current ws + inert new)
│       └── user-menu.tsx             # NEW (Client) — dependency-free popover (stub user)
├── lib/
│   ├── session.ts                    # NEW — getSession() (stub user) + getCurrentWorkspace() (SEAM)
│   └── nav.ts                        # NEW — nav destinations config (label, href, icon) for rail+palette
└── db/
    └── queries.ts                    # EDIT — add getDefaultWorkspace() (Drizzle only)
package.json                          # EDIT — add cmdk
CLAUDE.md                             # marker block only → this plan
```

**Structure Decision**: the `/app` **layout is a Server Component** (`force-dynamic`) that resolves
the session + workspace once and passes them as props into a single Client `AppChrome`, which owns
all chrome interactivity (rail active-state, top-bar triggers, the ⌘K palette, the switcher). The
placeholder pages are Server Components rendered as `{children}` inside the chrome. The
**session/workspace seam lives in `src/lib/session.ts`** and is the only place T6 edits; data access
stays in `src/db/queries.ts` (Drizzle only).

## Phase 0 — Outline & Research

See [research.md](./research.md):

1. **Route segment + dynamic shell** — `src/app/app/` segment with a `force-dynamic` layout; the
   lazy db client keeps `next build` / CI green without `DATABASE_URL`.
2. **Session/workspace seam** — `getSession()` returns a hardcoded stub user; `getCurrentWorkspace()`
   calls a new `getDefaultWorkspace()` query; centralized in `src/lib/session.ts`; no id hardcoded in
   components.
3. **cmdk, token-styled** — `cmdk` supplies keyboard/combobox a11y; we style `Command.Dialog/Input/
   List/Group/Item` with Pressroom tokens to match screen 14; ⌘K via a `keydown` listener.
4. **Switcher + user-menu popovers** — dependency-free token-styled popovers with Esc/outside-click
   close + focus restore.
5. **Rail active-state + mobile** — `usePathname` for the active link; the rail adapts at the small
   breakpoint (collapsible/drawer) per the chrome.
6. **Server/Client split** — the layout/resolver/pages are Server; `AppChrome` + its children are the
   only Client components.

**Output**: research.md with decisions, rationale, alternatives.

## Phase 1 — Design & Contracts

- **Data model** → [data-model.md](./data-model.md): the `StubSession` shape, the
  `getCurrentWorkspace()` contract (returns the T0.3 `workspace` row), and the nav-destination config
  — no new tables.
- **Contracts** → `contracts/`:
  - `session-seam.md` — `getSession()` / `getCurrentWorkspace()` signatures and the T6-swap rule.
  - `app-shell.md` — the rail / top bar / command-palette / switcher UI contract (ported from the
    named screens; tokens; keyboard; both themes).
- **Quickstart** → [quickstart.md](./quickstart.md): `/app` shell → ⌘K palette → switcher →
  placeholder routing → gates, mapped to SC-001..SC-007.
- **Agent context**: the `CLAUDE.md` SPECKIT marker block is updated to point at this plan.

**Output**: data-model.md, contracts/*, quickstart.md, updated CLAUDE.md marker.

## Phase 2 — Task planning approach (NOT executed here)

`/speckit.tasks` will decompose into one-commit-sized tasks, expected to group as: (1) Setup —
install `cmdk`, the nav config, the session seam + `getDefaultWorkspace()` query; (2) Foundational —
the `force-dynamic` `/app` layout + the `AppChrome` client shell; (3) US1 — the rail + top bar +
eight placeholder routes (active-state, scoped via the resolver); (4) US2 — the cmdk command palette
(token-styled, grouped, ⌘K, keyboard, navigation); (5) US3 — the workspace switcher popover (+
user-menu); (6) Polish/DoD — typecheck/lint/build green, CI green without a DB, both themes +
responsive + keyboard, no-hardcoded-workspace-id check, protected-files / ProofCard-unchanged check.
No tasks are produced by this command.

## Complexity Tracking

No constitution violations — this section is intentionally empty. The dynamic-shell / lazy-client
measure is a build-correctness step, not added complexity.
