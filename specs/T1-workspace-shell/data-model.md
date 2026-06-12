# Phase 1 — Data Model: T1

This slice introduces **no new tables**. It reads the existing T0.3 `workspace` table and defines a
hardcoded session stub + a nav config.

## StubSession (not a table — hardcoded in `src/lib/session.ts`)

```text
StubSession = {
  user: {
    name: string        // e.g. "Maya K."
    initials: string    // e.g. "MK"
    email?: string
  }
}
```

Returned by `getSession()`. There is NO users table in this slice; real users + Auth.js arrive at
T6, when `getSession()` is replaced. Nothing persists this.

## Workspace (existing T0.3 table — read only)

`getCurrentWorkspace()` returns the seeded demo workspace row (`id`, `name`, `slug`, `createdAt`),
resolved via a new `getDefaultWorkspace()` query (Drizzle). The shell shows `name` (and a static
"Pro workspace" badge — chrome text only in this slice; no tier column exists). No component receives
or hardcodes the workspace `id` directly — it flows from the resolver through the layout as props.

## Nav destinations (config — `src/lib/nav.ts`, not a table)

The eight rail/palette entries, in the design-reference order/labels:

| Label | Route | Notes |
|---|---|---|
| Dashboard | `/app` | |
| Proof | `/app/proof` | proof inbox (placeholder this slice) |
| Campaigns | `/app/campaigns` | |
| Showcase | `/app/showcase` | |
| Library | `/app/library` | |
| Requests | `/app/requests` | |
| Brand kits | `/app/brand` | |
| Consent | `/app/consent` | |

Each entry: `{ label, href, icon }` (lucide icon at 1.5px). Shared by the rail (active via
`usePathname`) and the palette's "Go to" group, so they never drift.

## Effective scope (derived)

Every `/app` screen is scoped to `getCurrentWorkspace()`'s workspace. In this slice the data shown is
placeholder, but the scoping seam is real: T2+ screens query their data by the resolved workspace id,
and T6 changes only `getSession()` / `getCurrentWorkspace()`.
