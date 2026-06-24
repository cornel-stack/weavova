# Implementation Plan: Real authentication + workspaces (T6)

**Branch**: `T6-auth-workspaces` | **Date**: 2026-06-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T6-auth-workspaces/spec.md` (clarifications Q1–Q4 resolved 2026-06-25).

**Note**: Plan only. No implementation. Two NEW decisions are surfaced as clarifications (C1, C2) in
**Outstanding clarifications** below — they need Cornel's answer before `/speckit.tasks`. Everything
else is settled by the spec or resolved in [research.md](./research.md).

## Summary

Retire the stub session and put real identity behind the app. Add Auth.js v5 (NextAuth v5) + the
Drizzle adapter with **two providers** — email magic-link (Resend) and Google OAuth — linking the
**same verified email to one user**. Add a `users / accounts / sessions / verificationToken` set (the
adapter's tables) plus an app-level **`membership`** table carrying `role = owner | member`. The
existing `workspace` table stays; **proof and every derived row already carry `workspaceId`**, so the
"seam swap" is genuinely mechanical: the only behavioural change lives inside `src/lib/session.ts` —
`getSession()` and `getCurrentWorkspace()` become session-backed. Every FR-021 consumer keeps calling
the same two seam functions and stays byte-stable. Security is two-layer: a **middleware gate on
`/app/*`** plus the **already-present `workspaceId` scoping** in every query (FR-017), formalised as an
invariant. Auth UI (`/login`, `/verify`, sign-out, `/` redirect) is ported onto current Pressroom
tokens; invites are an honest "coming soon" affordance (FR-019).

**Why the swap is low-risk (the central architectural fact):** the T1–T5 fixtures-first design
already isolated identity behind `src/lib/session.ts`, and every read/write is already
`workspaceId`-scoped at the query layer (`getProofs(workspaceId)`, `getCurrentWorkspace()` everywhere,
no component imports the db or hardcodes a workspace id). T6 changes **what the seam resolves**, not
its callers. This is the P-V payoff the architecture was built for.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 15.5 App Router, React 19.
**Auth**: Auth.js v5 / NextAuth v5 (`next-auth@beta`) + `@auth/drizzle-adapter`. Providers: built-in
**Resend** provider (magic-link) + built-in **Google** provider. *(Both within the locked stack;
first-time package additions — see Dependencies.)*
**Storage**: Neon Postgres + Drizzle ORM; drizzle-kit migrations (`drizzle/`, next is `0004`).
**Session strategy**: database sessions (natural with the adapter + the Email/magic-link flow) — see
[research.md](./research.md) D2.
**Route protection**: a single `middleware.ts` gate over `/app/*` (Node runtime; Vercel middleware
runs full Node.js on Fluid Compute).
**Target Platform**: Vercel (shared Neon DB across preview/prod, per project memory).
**Project Type**: Web app (Next.js single project).
**Scale/Scope**: one merchant demo workspace + real sign-in; not multi-member yet (role column ships,
invites deferred).
**Constraints**: byte-stable seam swap (P-V); build green without `DATABASE_URL` / auth creds (lazy db
+ lazy auth config); consent model untouched (P-VII).

## Constitution Check (v1.4.0)

*GATE: re-checked post-design at the bottom.*

- [x] **Customer is the headline (P-II)**: auth surfaces show no proof; the proof surfaces are
      untouched in layout. PASS.
- [x] **Locked stack (P-III)**: Auth.js v5 + Drizzle adapter + Resend + Google — all named in the
      locked stack. Two first-time **packages** (`next-auth@beta`, `@auth/drizzle-adapter`) flagged for
      approval (Dependencies §). No Supabase Auth. PASS (pending dep ack).
- [x] **Pressroom tokens (P-IV)**: auth UI on current unified tokens; stale-palette Auth exports
      reconciled, not copied. Persimmon only on the primary action. PASS.
- [x] **Port, don't redesign (P-V)**: authenticated surfaces unchanged; swap is inside the seam. The
      FR-021 consumer list is the regression surface. PASS.
- [x] **Fixtures-first (P-VI)**: the seam was built for exactly this swap; the new membership/user
      fixture shape is the schema contract; the seed reconciles existing rows under a real owner. PASS.
- [x] **Consent (P-VII)**: untouched — `getCurrentWorkspace()` swap does not alter any consent query
      or the effective-consent gate; consent reads stay workspace-scoped through the same seam. PASS.
- [x] **No editor (P-VIII)**: N/A — no studio change. PASS.
- [x] **SDD scope (P-IX)**: one slice; invites/multi-member/onboarding/marketing all explicitly out.
      PASS.
- [x] **Coding conventions (P-X)**: TS strict, Drizzle-only migrations, Server Components default,
      Zod for the sign-in input. PASS.
- [x] **Reference Integrity (P-XI)**: no `/design-reference` or `/docs` edits. PASS.
- [x] **Port-Completeness (P-XIII)**: invites = honest "coming soon" affordance (placement = C2);
      every shipped auth control works. No dead controls. PASS (pending C2 placement).
- [x] **Owned Data Only (P-XIV)**: auth UI shows only real identity; no fabricated counts/activity.
      PASS.
- [x] **Plan-Not-Code (P-XV)** / **No-LLM-in-Render (P-XVI)**: **N/A — non-render slice.**
- [x] **Microcopy & Voice (P-XVII)**: auth copy plain; "check your email", errors, "coming soon"
      stated plainly. PASS.

No violations → Complexity Tracking empty.

## Design

### 1. Schema + migration (`drizzle/0004_*`)

**Additive only** — no existing table or column changes; existing data keeps its `workspaceId`.

New tables (see [data-model.md](./data-model.md) for columns):
- **`user`**, **`account`**, **`session`**, **`verification_token`** — the `@auth/drizzle-adapter`
  standard tables (Auth.js owns their shapes; we declare them in `src/db/schema.ts` so drizzle-kit
  generates the migration and the adapter binds to them).
- **`membership`** — `(id, userId → user, workspaceId → workspace, role: enum('owner','member'),
  createdAt)`, unique on `(userId, workspaceId)`. `role` ships now (FR-018).

`workspace` is unchanged (already has `id, name, slug, createdAt`).

**Fixture reconciliation / backfill (FR-007):**
- Existing `proof` / `derived_asset` / `brand_asset` / `brand_kit` / `consent` rows **already carry
  `workspaceId`** (the Lumen workspace). **No row backfill of ownership is needed** — ownership of
  *content* was always workspace-scoped. What's missing is a **user** and a **membership** linking a
  real person to the Lumen workspace.
- The **seed** (`src/db/seed.ts`) gains: create a demo **user** + a **membership(role: owner)** to the
  Lumen workspace, so a real sign-in lands in the demo data. *(Whose email = C1.)*
- For the **already-deployed shared DB**, the same effect is achieved by re-running the seed **or** a
  small idempotent backfill (insert the demo user + membership if absent; `onConflictDoNothing` on the
  `(userId, workspaceId)` unique). Stated explicitly so prod doesn't need a destructive reseed — see
  [quickstart.md](./quickstart.md).

### 2. Auth.js v5 wiring (`src/auth.ts` + `src/app/api/auth/[...nextauth]/route.ts`)

- `NextAuth({...})` configured with `DrizzleAdapter(getDb(), { ...tables })`, `session: { strategy:
  "database" }`, and providers:
  - **Resend** (magic-link): built-in `next-auth/providers/resend` — uses the Resend REST API via the
    framework (no separate `resend` SDK dependency), `from` = a verified Resend domain address.
  - **Google**: built-in provider, `allowDangerousEmailAccountLinking: true` so a Google sign-in whose
    **verified** email matches an existing magic-link user links to the **one** user (FR-003). The flag
    is safe *here* because both providers only ever present **verified** emails (research.md D3, with
    the security note).
- **Lazy config** so `next build` stays green without creds: the auth instance reads env at request
  time; missing `AUTH_*` only errors when an auth action actually runs (mirrors the lazy db client).
- **Workspaceless-user provisioning** (`events.createUser` or a `signIn` hook): any user with no
  membership gets a personal workspace + `owner` membership, so `getCurrentWorkspace()` always
  resolves (research.md D4). The seeded demo user already has one.

### 3. The session-seam swap (`src/lib/session.ts`) — the heart of P-V

Both functions keep their **exact signatures and return shapes**; only their bodies change:
- `getSession(): Promise<StubSession>` → reads `auth()`; maps the real user to the existing
  `{ user: { name, initials, email } }` shape (`initials` derived from `name`/email). The
  `StubSession` type is renamed in intent but the **shape is preserved** so `layout.tsx`,
  `dashboard-body.tsx`, and `UserMenu` are byte-stable.
- `getCurrentWorkspace(): Promise<Workspace>` → resolves the **session user's workspace** via
  `membership` (their single workspace in v1) instead of `getDefaultWorkspace()` (oldest row). Same
  `Workspace` return type → every caller byte-stable.
- For an authenticated user with no workspace, it **redirects** to a minimal "setting up" path rather
  than throwing (so the root `error.tsx` is not used for the auth path — see §6).

**Regression surface = the FR-021 consumer list.** Because all 11 pages + 8 action files already call
these two functions and every query already takes `workspaceId`, **no consumer body changes**. The
plan's verification step diffs those files to prove byte-stability (quickstart.md).

### 4. The two security layers (FR-008 + FR-017)

- **Layer 1 — `middleware.ts`**: matches `/app/:path*`; if no session → redirect to `/login`. One
  enforcement point; no per-page boilerplate; no flash of protected data.
- **Layer 2 — workspace-scoped reads (already present, now an invariant)**: every query takes an
  explicit `workspaceId` and filters on it (verified across `queries.ts`). The invariant: **loaders /
  Server Actions MUST resolve the workspace via `getCurrentWorkspace()` and pass its id; no raw db read
  may omit the `workspaceId` filter.** To make this hard to violate, the resolver stays the **single**
  source (`getCurrentWorkspace()`); a thin `requireWorkspace()` helper (returns the session workspace,
  or redirects) is the documented entry every loader uses. *(No query signature changes — they already
  take `workspaceId`.)*

### 5. Auth UI surfaces (ported to current tokens)

- `/login` — sign-in: Google button + magic-link email form (Zod-validated). Both providers, plain
  copy.
- `/verify` (or `/login` sent-state) — honest "magic-link sent / check your email" naming the address;
  expired/used-link error with "request a new link" (FR-002, edge cases).
- `/api/auth/[...nextauth]` — the Auth.js route handler (callbacks live here).
- **Sign-out** — added to the existing `UserMenu` (currently display-only) as a real action.
- **`/` redirect** (FR-020): unauthenticated → `/login`; authenticated → `/app`.
- **Invites "coming soon"** (FR-019, P-XIII): an honest affordance — **placement = C2** (no settings
  surface exists until T9).

### 6. The two flagged couplings (resolved)

- **`src/app/styleguide/data/page.tsx`** — **resolved: dev-only.** It is a harness, not a product
  surface, and sits outside `/app/*`. In **production** it returns `notFound()` (excluded); in
  **development** it reads `getDefaultWorkspace()` **directly** (its pre-T6 behaviour) instead of
  `getCurrentWorkspace()`, so it needs no session and the local data harness keeps working. It is
  therefore *removed from the session seam* rather than gated into `/app/*`.
- **`src/app/error.tsx`** — **resolved: unchanged, trigger narrowed.** It is a `"use client"` boundary
  that does no workspace read itself, so it never throws. Post-swap, the auth "no session" path is a
  **middleware redirect** and the "authenticated but no workspace" path is a **`getCurrentWorkspace()`
  redirect** (§3) — neither throws — so `error.tsx` stays the catch-all for genuine DB failures only,
  exactly as today. No change to the file.

### Dependencies (flagged — we were at 9 after T4)

| Package | First-time? | Why | Locked-stack? |
|---|---|---|---|
| `next-auth@beta` (Auth.js v5) | **Yes** | Real auth (the tier's purpose) | Yes — named in §3 / P-III |
| `@auth/drizzle-adapter` | **Yes** | Persist auth tables via Drizzle | Yes — the locked adapter |

- **No** `resend` SDK (the built-in Resend provider uses the REST API via the framework). **No** Google
  SDK (built-in provider). Net: **+2 packages → 11 deps**. Both are the locked-stack auth choice;
  flagged per your request for explicit ack.

### Env / infra Cornel must provision

| Var | Where | Notes |
|---|---|---|
| `AUTH_SECRET` | local + Vercel | `npx auth secret` to generate |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | local + Vercel | New **Google OAuth client** (Cloud Console). Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` + `https://<vercel-domain>/api/auth/callback/google` |
| `AUTH_RESEND_KEY` | local + Vercel | Resend API key (Resend provider) |
| `AUTH_EMAIL_FROM` | local + Vercel | magic-link "from" — must be a **verified Resend domain** sender |
| `AUTH_URL` / `AUTH_TRUST_HOST` | local (+ Vercel if needed) | v5 auto-detects on Vercel; local needs `AUTH_TRUST_HOST=true` or `AUTH_URL=http://localhost:3000` |
| `SEED_OWNER_EMAIL` *(if C1=A)* | local (+ seed runs) | the email seeded as the Lumen workspace owner |

`.env.example` gets these added (names only). DATABASE_URL + R2 already provisioned. Build/typecheck
stay green without any `AUTH_*` (lazy config).

## Outstanding clarifications *(blocking before `/speckit.tasks`)*

These are **new** decisions the plan must not invent (per your instruction):

### C1 — Which email owns the seeded demo workspace (so the demo is reachable)?

The stub was `maya@lumencandle.co` — a mailbox you don't control, so you can't magic-link into it, and
a Google sign-in as yourself would create a *different* user not attached to Lumen.

| Option | Approach | Implication |
|--------|----------|-------------|
| A *(recommended)* | Seed the demo owner as **`SEED_OWNER_EMAIL`** (env, defaulting to `amalacornel@gmail.com`); membership(owner) → Lumen | You sign in (Google or magic-link) with your own email and land directly in the demo workspace. Display name becomes your provider name (not "Maya K."). |
| B | Keep **`maya@lumencandle.co`** as the seeded user; on your first real sign-in, **attach** your user to Lumen via a one-time backfill | Preserves "Maya K." as the displayed identity, but needs an attach step for you to see the demo. |
| C | Seed user **name "Maya K." + email = your email** | Demo reachable *and* shows "Maya K." — but a Google sign-in may overwrite the name with your Google profile. |

**Recommendation**: A (env-driven owner; reachable demo). **Your choice**: ____

### C2 — Where does the "Invite teammates — coming soon" affordance live (no settings surface until T9)?

FR-019 says "in workspace settings", but `/app/settings/*` is a T9 surface.

| Option | Placement | Implication |
|--------|-----------|-------------|
| A *(recommended)* | In the **workspace switcher popover** (screen 24), under the workspace, as a labeled "Invite teammates — coming soon" row | Reuses an existing chrome surface; no new route; honest coming-state where teammates would naturally appear. |
| B | A minimal **`/app/settings/team`** stub page (just the coming-state) | Closest to "workspace settings", but introduces a settings route ahead of T9. |
| C | In the **user menu** | Simple, but invites are workspace-scoped, not user-scoped — wrong mental model. |

**Recommendation**: A (workspace switcher popover). **Your choice**: ____

## Project Structure

```text
specs/T6-auth-workspaces/
├── plan.md              # this file
├── research.md          # decisions D1–D5 (session strategy, linking, provisioning, …)
├── data-model.md        # user/account/session/verificationToken + membership + the seam contract
├── contracts/
│   ├── session-seam.md  # getSession()/getCurrentWorkspace() byte-stable contract + FR-021 list
│   └── auth-schema.md   # adapter tables + membership DDL contract
├── quickstart.md        # end-to-end validation (sign-in both providers, seam regression, security)
└── checklists/requirements.md
```

Source (new / changed):
```text
src/auth.ts                                   # NEW — NextAuth config (providers, adapter, callbacks)
src/app/api/auth/[...nextauth]/route.ts       # NEW — Auth.js route handler
src/middleware.ts                             # NEW — /app/* gate (Layer 1)
src/app/login/page.tsx                        # NEW — sign-in (both providers)
src/app/verify/page.tsx                       # NEW — check-your-email state
src/app/page.tsx (root)                       # NEW/CHANGED — / redirect (FR-020)
src/db/schema.ts                              # CHANGED (additive) — user/account/session/verificationToken + membership
src/db/seed.ts                                # CHANGED — seed demo user + membership(owner)
src/lib/session.ts                            # CHANGED — the seam swap (the only behavioural change to consumers' source)
src/lib/workspace.ts (or session.ts)          # NEW — requireWorkspace() helper (Layer 2 entry)
src/components/app/user-menu.tsx              # CHANGED — add sign-out action
src/components/app/workspace-switcher.tsx     # CHANGED (if C2=A) — invites coming-soon row
src/app/styleguide/data/page.tsx             # CHANGED — dev-only + getDefaultWorkspace() direct
.env.example                                  # CHANGED — add AUTH_* names
drizzle/0004_*.sql                            # NEW — additive migration
```

## Complexity Tracking

No constitution violations → no entries.

## Post-Design Constitution Re-Check

Re-evaluated after the design above: still PASS on all gates. The only conditional gates are
dependency acknowledgement (P-III — 2 flagged packages) and the two placements (C1/C2) — none are
violations, they are decisions awaiting your answer. The byte-stable seam swap (P-V) is *strengthened*
by the finding that consumers already route through the seam and queries already scope by workspace.
