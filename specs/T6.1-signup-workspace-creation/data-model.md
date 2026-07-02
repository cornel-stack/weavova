# Phase 1 — Data Model: T6.1 Signup → Workspace Creation

**One additive column. No other schema change. One additive migration (`drizzle/0011_*.sql`).**

## Changed entity

### `workspace` (add one column)

| Field | Type | Null? | Default | Notes |
|---|---|---|---|---|
| id | uuid | no | `defaultRandom()` | unchanged |
| name | text | no | — | unchanged; set to the derived default at bootstrap (see naming rule) |
| slug | text | no | — | unchanged; **unique** — the idempotency key. Bootstrap writes a deterministic per-user slug. |
| default_name_display | enum | yes | — | unchanged (T7.1) |
| default_show_face | boolean | yes | — | unchanged (T7.1) |
| created_at | timestamptz | no | `defaultNow()` | unchanged |
| **onboarded_at** | **timestamptz** | **yes** | **none** | **NEW.** `NULL` = not yet onboarded; a set timestamp = onboarding complete. Read by the future onboarding wizard; inert this slice. |

**Migration (additive, safe on live table):**

```sql
ALTER TABLE "workspace" ADD COLUMN "onboarded_at" timestamp with time zone;
```

Generated via `npx drizzle-kit generate` after adding `onboardedAt` to the `workspace` table in
`src/db/schema.ts`. No `NOT NULL`, no default → existing rows become `NULL` (= not onboarded), which is
the correct honest meaning for every pre-existing workspace except the seed.

## Read-only / unchanged entities

- **`users`** (`user` table): read `id`, `name` (nullable), `email` (not-null unique) to derive the
  workspace name. No change.
- **`membership`**: read (existence check) + insert (owner row). Existing
  `unique(userId, workspaceId)` + `index(userId)` are reused. No change. Enum `membership_role` (owner,
  member, …) unchanged; the bootstrap writes `owner`.

## Invariants

- **INV-1 (atomicity):** a `workspace` row created by the bootstrap always has a matching owner
  `membership` row, and vice versa — both are written in one `db.batch([...])` (single neon-http
  transaction; all-or-nothing).
- **INV-2 (one workspace per bootstrap):** a user with zero memberships yields exactly one workspace +
  one owner membership; concurrent/duplicate first sign-ins do **not** produce a second workspace
  (deterministic `slug` + `workspace_slug_unique` abort the duplicate batch).
- **INV-3 (no-op for existing members):** a user with ≥1 membership triggers no insert (seeded owner,
  returning users, account-linking users).
- **INV-4 (onboarded meaning):** bootstrapped workspace → `onboarded_at IS NULL`; seeded workspace →
  `onboarded_at` set. The wizard reads this to decide whether to offer configuration.

## Deterministic slug rule (idempotency key)

```
base = (email.split("@")[0] || "workspace").toLowerCase().replace(/[^a-z0-9]+/g, "-")
slug = `${base}-${user.id}`            // full user.id — deterministic per user
```

Same user ⇒ same slug ⇒ a duplicate concurrent insert violates `workspace_slug_unique` and the whole
batch aborts (no partial rows). (Differs from the current hook, which truncates to `user.id.slice(0,8)`;
the full id removes any residual collision ambiguity and makes the determinism explicit.)

## Naming rule (display `name`)

```
firstName = user.name?.trim().split(/\s+/)[0]
name = firstName ? `${firstName}'s workspace` : `${email.split("@")[0]}'s workspace`
```

Always non-empty (email is not-null). Plain copy (P-XVII). The wizard renames later.
