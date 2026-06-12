# Phase 0 — Research: T1 Workspace shell

Constrained by the locked stack (+ the authorized `cmdk`), the protected-files rule, and the
constitution v1.1.2. No code written here.

---

## R1. Route segment + dynamic shell (CI green without a DB)

**Decision**: Put the authenticated app under the `src/app/app/` segment with a shared
`layout.tsx` that is **`export const dynamic = "force-dynamic"`**. The layout reads the workspace via
the **lazy** db client (T0.3), so it never connects at build time.

- `force-dynamic` on the layout makes the whole `/app/*` subtree dynamic → nothing prerenders → no
  DB at build → `next build` / CI green without `DATABASE_URL` (mirrors `/styleguide/data`).
- At runtime (with `DATABASE_URL`) the shell resolves the real demo workspace.

**Rationale**: green CI + secret-free build while the shell still reads real data at runtime.
**Alternatives**: a route group `(app)` — rejected (the URL must be `/app/...`); prerender the shell —
rejected (needs a DB + secret at build).

## R2. The session/workspace seam (the one place T6 changes)

**Decision**: Centralize in `src/lib/session.ts` (server-only):

- `getSession()` → a **hardcoded stub** `{ user: { name: "Maya K.", initials: "MK", email } }`
  (no users table; that is T6). Marked clearly as the auth seam.
- `getCurrentWorkspace()` → calls a new `getDefaultWorkspace()` in `src/db/queries.ts` (Drizzle only)
  that returns the seeded demo workspace row; this is the single workspace seam.
- Components receive the workspace/user **as props** from the `/app` layout; **no component hardcodes
  the workspace id** and none import the db directly. T6 changes only these two functions.

**Rationale**: a clean, centralized seam satisfies Fixtures-first (P-VI) and makes the T6 swap a
two-function change with no UI rework. **Alternatives**: resolve the workspace ad-hoc in each screen
(rejected — scatters the id, violates FR-003); a React context seeded client-side (rejected — the
resolver is server data).

## R3. Command palette — cmdk, styled with Pressroom tokens

**Decision**: Use **`cmdk`** for the palette. cmdk provides the combobox/listbox keyboard
accessibility (typeahead filtering, Up/Down roving focus, Enter activate, ARIA roles); **we provide
the look** with Pressroom token classes to match screen 14.

- Render `Command.Dialog` (centered overlay) styled `bg-card` / `border-hairline` /
  `rounded-modal` / `--shadow-modal`; `Command.Input` as the "Search or jump…" field (`font-ui`);
  `Command.Group` headings as `text-label` kickers; `Command.Item` rows with token hover/active;
  `Command.Empty` for no results.
- **Groups**: a **"Go to"** group (the eight sections from `src/lib/nav.ts`) and an **"Actions"**
  group (a few core actions). Activating a "Go to" item calls `router.push(href)` and closes.
- **⌘K**: a `keydown` listener (⌘K / Ctrl+K) toggles open; the search trigger in the top bar also
  opens it. cmdk's `Command.Dialog` handles focus-trap + Esc; we restore focus to the trigger on
  close.
- Persimmon is NOT used in the palette (no primary action / verified mark) — chrome stays quiet.

**Rationale**: cmdk is the authorized, purpose-built primitive; token styling keeps it on-brand and
faithful to screen 14. **Alternatives**: hand-rolled combobox (rejected — the human authorized cmdk;
a11y is hard to get right by hand); a heavier modal/menu kit (rejected — unnecessary).

## R4. Switcher + user-menu — dependency-free popovers

**Decision**: Build the **workspace switcher** and the **user-menu** as small token-styled popovers
with plain React (a button + an absolutely-positioned panel), Esc + outside-click to close, and
focus restore. The switcher shows the current demo workspace (name + a static "Pro workspace" badge,
chrome text for now) and an **inert** "new workspace" affordance (screen 24). The user-menu shows the
stub user (no real actions yet).

**Rationale**: these are simple dropdowns; no library is warranted (keeps the stack minimal). cmdk is
reserved for the palette where its combobox a11y earns its place. **Alternatives**: a popover library
(rejected — unnecessary dependency); cmdk for the switcher too (rejected — overkill for a static
list).

## R5. Rail active-state + mobile

**Decision**: The rail is a Client Component using `usePathname()` to mark the active destination.
The nav items come from `src/lib/nav.ts` (shared with the palette). At the small breakpoint the rail
**adapts** — collapses to a drawer (or an icon rail) so the chrome stays usable on mobile, per the
design-reference chrome. lucide icons at 1.5px stroke for the rail glyphs.

**Rationale**: active-state needs the current path (client); one nav config keeps rail + palette in
sync. **Alternatives**: server-computed active state (rejected — needs the path on the client
anyway); duplicating nav entries (rejected — drift).

## R6. Server/Client split

**Decision**: Server: the `/app` `layout.tsx` (resolver + props), the placeholder pages, the seam.
Client: a single `AppChrome` that owns palette/switcher open state + the ⌘K listener and renders the
rail, top bar, palette, and `{children}`. This keeps interactivity in one client island and the data
resolution on the server.

**Rationale**: minimal client surface (P-X: Server by default), one place for the ⌘K/overlay state.
**Alternatives**: many small client islands each wiring ⌘K (rejected — duplicated listeners/state).

---

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| Where the app shell lives / build without DB | `src/app/app/` segment, `force-dynamic` layout + lazy client (R1) |
| The auth/workspace seam | `src/lib/session.ts`: getSession (stub) + getCurrentWorkspace → getDefaultWorkspace query (R2) |
| Palette implementation | `cmdk`, token-styled to screen 14; ⌘K listener; router.push (R3) |
| Switcher / user-menu | dependency-free token popovers (R4) |
| Rail active-state + mobile | usePathname; nav config; rail adapts at small breakpoint (R5) |
| Server/Client boundary | server layout/pages/seam; one client `AppChrome` island (R6) |

No blocking `NEEDS CLARIFICATION` remain.
