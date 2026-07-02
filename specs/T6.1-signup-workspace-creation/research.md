# Phase 0 — Research: T6.1 Signup → Workspace Creation

All four gaps have determinate answers grounded in the T6 code; no open `NEEDS CLARIFICATION`. The
four product decisions were settled by the requester and are recorded here as carried, not re-opened.

## Settled decisions (carried, not re-opened)

| # | Decision | Adopted |
|---|---|---|
| S1 | Auto-create, no name prompt | Yes — zero-friction; wizard renames later. |
| S2 | Default name | `"{firstName}'s workspace"`, else `"{email local-part}'s workspace"`. |
| S3 | Add the "not yet onboarded" flag | Yes — `workspace.onboarded_at` (one additive migration). |
| S4 | Empty states | VERIFY existing (all confirmed present), do not build/port. |

---

## D1 — Where the bootstrap hooks into the T6 Auth.js seam

**Decision:** `events.signIn` in the `NextAuth(() => ({ ... }))` config, replacing the current
`events.createUser`.

**Rationale:**
- `events.signIn` fires once per successful **sign-in event**, for **all** providers — the Resend
  magic-link (email) flow and Google OAuth alike. With `session.strategy: "database"` + the Drizzle
  adapter, the event's `user` is the adapter user and carries `user.id`, which is the anchor for the
  membership-existence query.
- It fires on **every** sign-in, not once-per-user-lifetime like `events.createUser`. That is exactly
  what makes the bootstrap **self-healing**: a user who exists but has zero memberships (a prior
  partial create, or a row predating the hook) is repaired on their next sign-in.
- It is the semantically correct channel for a **write side-effect**.

**Alternatives considered:**
- `callbacks.signIn` — its contract is an *authorization* decision (return `true`/`false` to allow/deny
  the sign-in). Overloading it with a workspace write conflates auth-gating with provisioning; rejected.
- `callbacks.session` — runs on **every** `auth()` call (every authenticated request), not just at
  sign-in. It would self-heal but at a large multiple of the necessary frequency and would couple every
  read path to a potential write; rejected.
- Keep `events.createUser` — fires only when the adapter creates the user row. Cannot repair a stranded
  membership-less user and is not a superset of the needed trigger; this is the gap we are closing.
- Lazy self-heal inside `getCurrentWorkspace()` — would edit a frozen core (P-V) and couple the read
  seam to provisioning. Rejected; the throw stays as the honest last-resort and remains effectively
  unreachable for a just-signed-in user.

---

## D2 — Idempotency & the concurrent-double-create race (the central correctness concern)

**Decision:** A **deterministic per-user workspace slug** created **inside a single `db.batch([...])`**,
relying on the existing `workspace.slug` UNIQUE index to make a concurrent duplicate abort atomically;
the loser catches the unique-violation and treats it as success.

**Mechanics:**
- `slug = base(email) + "-" + user.id` where `base` is the lowercased, `[^a-z0-9]+ → "-"` normalized
  email local-part. Using the **full** `user.id` (not the current truncated 8-char slice) makes the
  slug a deterministic function of the user — the same user always maps to the same slug.
- The bootstrap: `SELECT membership LIMIT 1`; if none, `getDb().batch([ insert workspace {id,
  name, slug, onboardedAt:null}, insert membership {userId, workspaceId:id, role:'owner'} ])`.
- Two concurrent first sign-ins for the same new user both pass the membership check, then both attempt
  the batch. neon-http runs each batch as a **single transaction**, so the second batch (same slug)
  aborts **in full** on the `workspace_slug_unique` violation — no orphan workspace, no orphan
  membership. The loser catches the error and returns; its workspace already exists and resolves.
- Belt-and-suspenders: `membership` already has `unique(userId, workspaceId)`; the membership insert
  keeps `onConflictDoNothing()` so a re-fire after a committed create is a clean no-op.

**Why not other guards:**
- A `unique(userId)` on `membership` — wrong: a user may legitimately hold multiple memberships once
  teams exist (post-T6.1); we must not preclude that.
- Interactive `SELECT ... FOR UPDATE` / advisory lock — **not available** on neon-http (no interactive
  transactions).
- Check-then-insert without a deterministic key — leaves a TOCTOU window that produces two distinct
  workspaces (distinct random slugs both succeed). The determinism is what closes the window.

---

## D3 — Account-linking safety (`allowDangerousEmailAccountLinking`)

**Decision:** No special-casing needed; the membership-existence guard is already correct.

**Rationale:** `allowDangerousEmailAccountLinking: true` (documented safe in `src/auth.ts` because every
configured provider yields a verified email) links a second provider to the **existing** user row —
same `user.id`. The bootstrap keys on `user.id`'s membership set, not on the provider or account row, so
a second-provider sign-in for a user who already owns a workspace finds the membership → **no-op**. This
is why the guard is `membership existence`, not `is this a new OAuth account`.

---

## D4 — Naming derivation (S2 detail)

**Decision:** `firstName = user.name?.trim().split(/\s+/)[0]`; name = `` `${firstName}'s workspace` ``
when present, else `` `${emailLocalPart}'s workspace` `` (`email.split("@")[0]`).

**Rationale:** `users.name` is nullable `text` and `users.email` is a not-null unique `text` (verified in
`src/db/schema.ts`). Google populates `name`; the Resend magic-link populates only `email`. The fallback
therefore always yields a sensible, non-empty display string. Plain copy, no emoji (P-XVII).

---

## D5 — The `onboarded_at` flag: type, meaning, seed & backfill (S3 detail)

**Decision:** `workspace.onboarded_at timestamptz NULL`. `NULL` = not yet onboarded; a set timestamp =
onboarded. Bootstrap leaves NULL; **seed sets Lumen to a fixed timestamp** (already onboarded). No
backfill of other rows.

**Rationale:**
- A nullable timestamp matches the codebase's pervasive state-marker convention (`used_at`,
  `transaction_verified_at`, `consent_captured_at`) and records *when*, which a boolean cannot.
- `ALTER TABLE "workspace" ADD COLUMN "onboarded_at" timestamptz` (nullable, no default) is a safe
  additive migration on a live table.
- Seed = onboarded so the fully-configured demo workspace is never mistaken by the future wizard for a
  brand-new one (FR-012). Existing prod workspaces created by the old `createUser` hook stay NULL —
  correct, since they genuinely never onboarded and the wizard does not yet exist. No ambiguity, no
  backfill required.
- This slice does not read the column; it is inert forward-plumbing (P-XIII — real plumbing, not a
  decorative flag).

---

## D6 — Byte-stability of the workspace-resolution seam (FR-009)

**Decision:** Do **not** edit `src/lib/session.ts`. Do **not** add `onboarded_at` to
`getCurrentWorkspace()`'s SELECT.

**Rationale:** `getCurrentWorkspace()` selects an explicit column list; adding a table column leaves that
SELECT — and thus the returned `Workspace` shape — unchanged, so all consumers (layout, dashboard,
proof, studio, requests, brand, consent, warmth actions) stay byte-stable. The new user's membership
resolves the new workspace through the identical `membership ⨝ users ⨝ workspace` join used by the
seeded owner. The wizard will add the column to a read later; not now.

---

## D7 — Empty-state verification inventory (S4 detail)

**Decision:** VERIFY (not build). All surfaces a new user reaches already render an honest empty state
or honest defaults (confirmed at spec time). Inventory and expected states are in
`contracts/empty-state-verification.md`. Any surface found to assume seeded data is a flag-and-surface
event (P-XIII), not a silent redesign in this slice.

---

## No open clarifications

Every gap resolved above. If, during implementation, correctness appears to require touching a frozen
core (T6 auth schema, `src/lib/session.ts`, capture/consent/verification), **stop and surface** rather
than proceed (P-V).
