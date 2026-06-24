# Research — T6 Real authentication + workspaces

Decisions resolved during planning. Settled spec constraints (Auth.js v5, Drizzle adapter, two
providers, link-by-verified-email, owner/member, middleware gate) are NOT re-litigated here — only the
implementation choices they imply. Genuinely new product decisions are escalated to the plan's
**Outstanding clarifications** (C1, C2), not decided here.

## D1 — Auth provider packages

- **Decision**: `next-auth@beta` (Auth.js v5) + `@auth/drizzle-adapter`. Use the **built-in Resend
  provider** (`next-auth/providers/resend`) and the **built-in Google provider**.
- **Rationale**: keeps net new dependencies at **+2** (both the locked-stack auth choice). The Resend
  provider talks to the Resend REST API through the framework — no separate `resend` SDK; Google needs
  no SDK. Avoids the Nodemailer provider (which would add `nodemailer`).
- **Alternatives**: Nodemailer email provider (+1 dep, SMTP config) — rejected; custom Email provider
  with a hand-rolled `sendVerificationRequest` calling Resend via `fetch` (no dep, more code) — rejected
  in favour of the maintained built-in.

## D2 — Session strategy: database sessions

- **Decision**: `session: { strategy: "database" }` via the Drizzle adapter (`session` table).
- **Rationale**: the magic-link flow already requires the adapter (verification tokens in the DB), so
  the DB is in the request path regardless; database sessions are the natural, lower-surprise default
  and keep revocation server-side. Vercel middleware now runs full Node.js (Fluid Compute), so reading
  a DB-backed session in `middleware.ts` is supported.
- **Alternatives**: JWT sessions — fewer DB reads per request, but splits the source of truth and
  complicates server-side revocation; not needed at this scale. Revisit only if middleware latency
  becomes a measured problem.

## D3 — Account linking by verified email

- **Decision**: `allowDangerousEmailAccountLinking: true` on the **Google** provider; the magic-link
  (Resend) provider links by email inherently. Same verified email → one `user` (FR-003).
- **Rationale**: both providers only ever surface a **verified** email — Google asserts `email_verified`
  and magic-link proves control of the mailbox — so the usual phishing risk of the flag (an attacker
  pre-creating an account on an unverified email) does not apply here.
- **Security note (flagged) — STANDING INVARIANT**: the flag's name is a deliberate warning. The
  safety rests entirely on **every configured provider yielding a VERIFIED email**. If a provider that
  does NOT verify email is ever added, `allowDangerousEmailAccountLinking` MUST be removed (or linking
  gated on verification) or it becomes an account-takeover vector. This invariant is recorded **in code**
  as a comment beside the flag in `src/auth.ts` (T010) so a future provider change triggers a re-think.
  Re-evaluate whenever a provider is added or changed.
- **Alternatives**: manual linking UI (account-settings "connect Google") — heavier, and account
  settings is a T9 surface; rejected for v1.

## D4 — Workspaceless-user provisioning

- **Decision**: on user creation (Auth.js `events.createUser`, or a `signIn` guard), if the user has no
  `membership`, provision a personal `workspace` + an `owner` `membership`. So `getCurrentWorkspace()`
  **always** resolves for an authenticated user.
- **Rationale**: keeps the seam total (no throw path for "authenticated but no workspace"), which is
  what lets `error.tsx` stay the DB-failure catch-all (plan §6). Full onboarding is a later tier; this
  is the minimum honest behaviour the spec's edge case calls for.
- **Alternatives**: an explicit "setting up / create workspace" screen — deferred to onboarding (T-later);
  for T6 the auto-provision keeps the demo + any real sign-in coherent.

## D5 — Backfill strategy for the already-deployed shared DB

- **Decision**: ownership of content needs **no backfill** — every content row already has
  `workspaceId`. Only a demo **user + membership(owner)** must be added. Provide an **idempotent**
  path: the updated seed creates them; for prod, an `onConflictDoNothing` insert of (user, membership)
  achieves the same without a destructive reseed.
- **Rationale**: the multi-tenant `workspaceId` scoping predates T6 (added through T2.2), so the
  "orphaned fixtures" risk is limited to the missing person↔workspace link. Minimises prod risk on the
  shared Neon DB (project memory: preview/prod share a DB).
- **Alternatives**: full destructive reseed in prod — rejected (drops real/seeded state unnecessarily);
  a data migration in `0004` — heavier than needed and couples DDL to demo data.

## D6 — `getSession()` shape preservation (P-V)

- **Decision**: preserve the exact `{ user: { name, initials, email } }` return shape; derive
  `initials` from the real `name` (fallback to email local-part). Keep the `Workspace` return type of
  `getCurrentWorkspace()` identical.
- **Rationale**: this is what makes `layout.tsx`, `dashboard-body.tsx`, `UserMenu`, and the chrome
  byte-stable — they consume the shape, not the source. The swap is invisible to every consumer.
- **Alternatives**: widen the session shape to expose role/avatar now — rejected (YAGNI for T6; would
  ripple into the chrome and break byte-stability for no current need).
