# Contract — App shell (rail, top bar, palette, switcher)

Ported faithfully from the `/design-reference` chrome (screens 05–13 + Global), screen 14 (palette),
and screen 24 (switcher). All values from v1.1.x Pressroom tokens. The shell stays **quiet** (P-II).

## Layout (`src/app/app/layout.tsx`, Server, force-dynamic)

Resolves `getSession()` + `getCurrentWorkspace()` and renders
`<AppChrome user={user} workspace={ws}>{children}</AppChrome>`. Dynamic + lazy client → build green
without `DATABASE_URL`.

## Rail (`app-rail.tsx`, Client)

- The Weavova wordmark + the eight nav links (from `src/lib/nav.ts`, design-reference order).
- Active destination marked via `usePathname()` (token active state — NOT persimmon).
- lucide icons at 1.5px stroke. Adapts at the small breakpoint (collapsible drawer / icon rail).

## Top bar (`app-top-bar.tsx`, Client)

- Current workspace block (name + static "Pro workspace" badge) → opens the **workspace switcher**.
- Search / **⌘K** trigger ("Search or jump… ⌘K", `font-mono` for the key hint) → opens the palette.
- The T0.2 **theme toggle**.
- A **user-menu** stub (initials avatar from `getSession()`).

## Command palette (`command-palette.tsx`, Client — cmdk)

- `cmdk` `Command.Dialog` centered overlay; token-styled (`bg-card`, `border-hairline`,
  `rounded-modal`, `--shadow-modal`) to match screen 14.
- Opens on **⌘K** / Ctrl+K and from the search trigger; input focused.
- **Groups**: "Go to" (the eight sections) + "Actions" (a few core actions). Typing filters
  (cmdk). Up/Down move selection; Enter activates (a "Go to" item `router.push(href)` + closes); Esc
  closes; focus trapped (cmdk) + restored to the trigger on close.
- Persimmon NOT used. Microcopy clean.

## Workspace switcher (`workspace-switcher.tsx`, Client — dependency-free popover)

- Ported from screen 24: shows the current demo workspace (name + badge). A "new workspace"
  affordance is present but **inert** (no-op) this slice.
- Opens from the workspace block; Esc / outside-click closes; focus restored.

## Acceptance

- `/app` renders rail + top bar scoped via the resolver (SC-001); switcher opens + shows the demo
  workspace (SC-002); ⌘K palette keyboard-navigable + navigates inside the shell (SC-003); every rail
  destination routes to a placeholder inside the shell, active marked (SC-004); both themes +
  responsive + keyboard-accessible, tokens only (SC-005).
