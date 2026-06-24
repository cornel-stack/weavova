# Data model — T6 Real authentication + workspaces

**Migration**: `drizzle/0004_*` — **additive only**. No existing table or column is altered; existing
content rows keep their `workspaceId`. Declared in `src/db/schema.ts` so drizzle-kit generates `0004`.

## New tables

### Auth.js adapter tables (`@auth/drizzle-adapter` standard shapes)

The adapter owns these shapes; we declare them so they live in our Drizzle schema and the migration is
generated. Standard columns (abbreviated — use the adapter's canonical definitions):

- **`user`** — `id` (uuid/text pk), `name` (text, null), `email` (text, unique), `emailVerified`
  (timestamptz, null), `image` (text, null).
- **`account`** — per-provider identity: `userId → user (cascade)`, `type`, `provider`,
  `providerAccountId`, OAuth token columns; PK `(provider, providerAccountId)`.
- **`session`** — `sessionToken` (unique), `userId → user (cascade)`, `expires`. *(Used by the
  database session strategy — D2.)*
- **`verification_token`** — `identifier`, `token`, `expires`; PK `(identifier, token)`. *(Magic-link.)*

> `email` is the **account-linking key** (FR-003). Google links into an existing `user` by verified
> email via `allowDangerousEmailAccountLinking` (research D3); magic-link links by email inherently.

### `membership` (app-level — the new owned relationship)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk (`defaultRandom`) | |
| `userId` | uuid → `user.id` (`onDelete: cascade`) | the member |
| `workspaceId` | uuid → `workspace.id` (`onDelete: cascade`) | the tenant |
| `role` | `membership_role` enum (`'owner' \| 'member'`) | **FR-018**; ships now |
| `createdAt` | timestamptz, `defaultNow()` | |

- **Unique** `(userId, workspaceId)` — a user belongs to a workspace once (idempotent provisioning /
  backfill via `onConflictDoNothing`).
- **Index** `(userId)` — `getCurrentWorkspace()` resolves the session user's workspace by `userId`.
- New enum: `membership_role = pgEnum('membership_role', ['owner','member'])` (mirrors the existing
  enum pattern in `schema.ts`).

### `workspace` — UNCHANGED

Already `(id, name, slug unique, createdAt)`. No change. (Ownership is now *expressed* via `membership`;
content rows keep pointing at `workspace.id` as before.)

## Role semantics (v1 enforcement — FR-018)

| Capability | owner | member |
|---|---|---|
| Read all workspace surfaces | ✓ | ✓ |
| Create clip (generate / batch) | ✓ | ✓ |
| Destructive (delete, detach, consent withdrawal) | ✓ | ✗ |
| Workspace / billing settings | ✓ | ✗ (T9 anyway) |
| Member management / invites | ✓ | ✗ (deferred, FR-019) |

v1 ships only **owner** memberships (no way to create a member until invites land), so member-gating is
defined but dormant. Stored now so multi-member is additive (FR-018).

## Seed / backfill (FR-007, research D5)

- Existing content rows: **no change** — already `workspaceId`-scoped to Lumen.
- Add: one demo **`user`** (email = C1 outcome) + one **`membership`** `(user, Lumen, role: owner)`.
- Idempotent: `insert ... onConflictDoNothing` on `(userId, workspaceId)`; safe to re-run on the shared
  DB without a destructive reseed.

## Entity relationships

```
user ──< membership >── workspace ──< proof ──< consent
                              │           └──< derived_asset >── consent  (made-under)
                              ├──< source
                              ├──< brand_asset >──< proof_brand_asset >── proof
                              └──< brand_kit
user ──< account            (provider identities, linked by verified email)
user ──< session            (database sessions)
```

Only the `user`/`account`/`session`/`verification_token`/`membership` boxes and the `user──<membership`
and `membership>──workspace` edges are new. Everything from `workspace` rightward is unchanged.
