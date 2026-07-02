# Contract — Bootstrap on sign-in (`events.signIn`)

The single behavioral contract of this slice. Placement: `src/auth.ts`, inside the
`NextAuth(() => ({ ... }))` config, `events.signIn`. Replaces the current `events.createUser`.

## Signature (behavioral, not code)

```
on signIn({ user }):
  if !user.id: return                       // defensive; adapter always supplies id on DB strategy
  bootstrapWorkspaceIfNeeded(user)          // fire-per-sign-in, idempotent, self-healing
```

## `bootstrapWorkspaceIfNeeded(user)` — steps

1. **Guard (membership existence):**
   `SELECT membership.id FROM membership WHERE user_id = user.id LIMIT 1`.
   - If a row exists → **return** (no-op). Covers: seeded Lumen owner, returning users, and the
     account-linking case (2nd provider → same `user.id` → membership found).
2. **Derive** (only when zero memberships):
   - `firstName = user.name?.trim().split(/\s+/)[0]`
   - `name = firstName ? "${firstName}'s workspace" : "${email.split('@')[0]}'s workspace"`
   - `base = (email.split('@')[0] || 'workspace').toLowerCase().replace(/[^a-z0-9]+/g,'-')`
   - `workspaceId = crypto.randomUUID()`; `slug = "${base}-${user.id}"`  (deterministic)
3. **Atomic create:**
   ```
   getDb().batch([
     insert workspace  { id: workspaceId, name, slug, onboardedAt: null },
     insert membership { userId: user.id, workspaceId, role: 'owner' }
       .onConflictDoNothing(),
   ])
   ```
4. **Idempotent failure handling:** wrap the batch in try/catch.
   - Unique-violation (race loser, or re-fire) → **swallow** (treat as success; the workspace already
     exists and resolves on the next `getCurrentWorkspace()`).
   - Any other error → log; do not throw out of the event (the sign-in completes). No workspace exists
     yet → `getCurrentWorkspace()` throws to the error boundary → user retries → bootstrap re-attempts.

## Guarantees (map to FRs & invariants)

| Guarantee | Mechanism | Ref |
|---|---|---|
| Fires for magic-link **and** Google | `events.signIn` is provider-agnostic; `user.id` present on DB strategy | FR-001 |
| Fires only for zero-membership users | step-1 guard | FR-005 |
| Exactly one workspace + owner membership | step-3 batch | FR-002 |
| Atomic (no orphan) | single `db.batch` = one neon-http transaction | FR-003 / INV-1 |
| Idempotent under concurrency | deterministic `slug` + `workspace_slug_unique` aborts duplicate batch | FR-004 / INV-2 |
| Self-healing for stranded users | fires every sign-in, guarded on membership existence | FR-005 |
| Account-linking safe | guard keys on `user.id`, not provider | FR-006 |
| Seeded owner untouched | seeded membership → step-1 no-op | FR-008 / INV-3 |
| No usable half-state on failure | atomic batch + retry-next-sign-in | FR-013 |
| Wizard seam | `onboardedAt: null` at create | FR-012 / INV-4 |

## Non-goals (explicitly not in this contract)

- No name-entry prompt, no wizard configuration, no team invite, no workspace switcher.
- No edit to `src/lib/session.ts`; no read of `onboarded_at` anywhere this slice.
