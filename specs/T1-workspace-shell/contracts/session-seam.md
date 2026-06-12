# Contract — Session / workspace seam

Module: `src/lib/session.ts` (server-only). The **single place T6 swaps for real Auth.js**. No
component hardcodes the workspace id; all scoping flows through these.

## Functions

| Function | Signature | Returns |
|---|---|---|
| `getSession` | `getSession(): Promise<StubSession>` | a hardcoded signed-in stub user (no users table; T6 replaces) |
| `getCurrentWorkspace` | `getCurrentWorkspace(): Promise<Workspace>` | the seeded T0.3 demo workspace (via `getDefaultWorkspace()` query) |

```text
StubSession = { user: { name: string; initials: string; email?: string } }
Workspace   = T0.3 workspace row: { id, name, slug, createdAt }
```

## Query dependency

- `src/db/queries.ts` gains `getDefaultWorkspace(): Promise<Workspace | null>` (Drizzle only) —
  returns the demo workspace (e.g. by slug `lumen`, or the first workspace). `getCurrentWorkspace()`
  wraps it and throws a clear error if absent (seed not run).

## Rules

- **Centralized**: only `getSession()` / `getCurrentWorkspace()` know "who am I / which workspace".
  T6 changes only these two functions; UI is untouched.
- **No hardcoded id**: components receive the workspace as props from the `/app` layout; none import
  the db or embed an id.
- **Server-only**: these run on the server (the layout resolves them); the lazy client means the
  build is green without `DATABASE_URL`.
- **Fails closed-ish**: a missing demo workspace surfaces a clear error/empty state, not a crash.
