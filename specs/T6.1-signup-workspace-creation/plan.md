# Implementation Plan: T6.1 — Signup → Workspace Creation (hardening the existing bootstrap)

**Branch**: `T6.1-signup-workspace-creation` | **Date**: 2026-07-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T6.1-signup-workspace-creation/spec.md`

## Summary

A first-time sign-in must land the user in a real, owned workspace. A bootstrap already exists as an
Auth.js `events.createUser` hook in `src/auth.ts`, but it (1) is **not atomic** (two separate inserts
→ possible orphan workspace), (2) fires **only at user-row creation** (a membership-less user is
never repaired), (3) uses a **raw name**, and (4) leaves **no seam** for the future onboarding wizard.

This slice **replaces `events.createUser` with `events.signIn`** and rewrites the body as a **guarded,
idempotent, self-healing** bootstrap: on *every* successful sign-in (magic-link **and** Google), if
the user has **zero memberships**, atomically create one workspace + one owner membership via
`db.batch(...)`; otherwise no-op. Idempotency/race is guaranteed by a **deterministic per-user
workspace slug** under the existing `workspace.slug` unique constraint inside the atomic batch. One
additive migration adds `workspace.onboarded_at` (nullable) as the wizard seam. Empty states are
**verified, not built** — every rail surface a new user reaches already renders an honest empty state.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 15 App Router, React 19

**Primary Dependencies**: Auth.js / NextAuth v5 + `@auth/drizzle-adapter` (T6), Drizzle ORM on Neon
Postgres (`drizzle-orm/neon-http`), Inngest/Resend/R2 (unused by this slice). **No new dependency.**

**Storage**: Neon Postgres. Tables touched: `workspace` (add `onboarded_at`), `membership` (read +
insert), `users` (read only). One additive migration (`drizzle/0011_*.sql` via `drizzle-kit generate`).

**Testing**: `npm run build` (green gate) + `npm run lint`; manual verification per `quickstart.md`
(a new membership-less user; the seeded owner; a stranded user; both providers).

**Target Platform**: Vercel (Node runtime for the auth handlers; the bootstrap runs server-side in
the Auth.js event, request-time — consistent with the lazy `getDb()` client).

**Project Type**: Web application (single Next.js project; `src/`).

**Performance Goals**: Bootstrap adds one membership-existence `SELECT ... LIMIT 1` per sign-in event
(not per request) and, for genuinely new users only, one atomic 2-statement batch. Negligible.

**Constraints**: neon-http has **no interactive transactions** — atomicity uses `db.batch([...])`
(the pattern at `src/db/queries.ts:1867` and `src/app/c/[token]/actions.ts`). Cores frozen (P-V):
the T6 auth schema (`users`/`workspace`/`membership`), the session/workspace seam
(`src/lib/session.ts`), and capture/consent/verification cores are unchanged except the enumerated
touch points below.

**Scale/Scope**: Two files of real change (`src/auth.ts`, `src/db/schema.ts`) + one migration + one
seed line + an empty-state verification pass. No UI port.

### Enumerated touch points (nothing else changes)

| File | Change |
|---|---|
| `src/db/schema.ts` | Add `onboardedAt` nullable timestamp to the `workspace` table (additive). |
| `drizzle/0011_*.sql` | Generated additive migration: `ALTER TABLE "workspace" ADD COLUMN "onboarded_at" timestamptz` (nullable, no default). |
| `src/auth.ts` | Remove `events.createUser` body; add `events.signIn` with the guarded self-healing bootstrap (deterministic slug, `db.batch`, name derivation, `onboardedAt` left NULL). |
| `src/db/seed.ts` | Set the seeded Lumen workspace `onboardedAt` to a fixed timestamp (seed = already onboarded). |
| `specs/.../*` | Plan artifacts (this PR's docs). |

**Frozen — do NOT touch**: `src/lib/session.ts` (`getCurrentWorkspace`/`requireWorkspace` byte-stable —
their SELECT column lists do **not** add `onboarded_at`); the `membership`/`users` table shapes; every
empty-state component (verify only). STOP-and-surface if correctness appears to need a frozen change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Customer is the headline (P-II)**: N/A for created content — a new workspace has no proof.
      Empty states honestly say "no proof yet" and point to collecting real customer proof; no
      fabricated headline customer.
- [x] **Locked stack (P-III)**: reuses Auth.js v5 (NOT Supabase Auth) + Drizzle/Neon. No new
      dependency; no provider added. Heavy render N/A.
- [x] **Pressroom tokens (P-IV)**: no new UI; existing empty states already on-token. Persimmon
      unchanged.
- [x] **Port, don't redesign (P-V)**: auth/data slice — no port. The onboarding-wizard designs
      (Drive "Onboarding", screens 15/17) are **not** ported (they belong to the later wizard slice).
      T6 auth seam reused; bootstrap additive; seed + `requireWorkspace`/`getCurrentWorkspace`
      byte-stable (unchanged SELECT lists). No layout invented → no P-XII gap.
- [x] **Fixtures-first (P-VI)**: the new-workspace state is the honest zero-row case of the same
      schema the seed populates; surfaces read through the unchanged query seam.
- [x] **Consent enforcement (P-VII)**: N/A — no proof/derived asset created; consent surface renders
      its honest empty state for a new workspace.
- [x] **No editor (P-VIII)**: N/A — no studio/format surface.
- [x] **SDD scope (P-IX)**: one vertical slice — bootstrap hardening + flag + empty-state verify. The
      wizard, rename UI, invites, and workspace switching are out of scope.
- [x] **Ambiguity handling (P-XII)**: no design ambiguity; the four settled decisions are recorded in
      research.md. No guessed layouts.
- [x] **Port-completeness (P-XIII)**: honest empty states point at real capture/request flows; no dead
      controls added. `onboarded_at` is real plumbing read by the future wizard, not a decorative flag.
- [x] **Owned data only (P-XIV)**: a bootstrapped workspace is genuinely empty — no fabricated starter
      proof, counts, or metrics.
- [x] **Plan-not-code (P-XV)**: N/A — non-render slice.
- [x] **No-LLM-in-render (P-XVI)**: N/A — non-render slice.

**Definition of done (P-Governance)**: real data (an empty workspace is real zero-row data); empty
states verified across all rail surfaces; existing surfaces already responsive/on-token/keyboard-
accessible (unchanged); acceptance criteria in spec met; `npm run build` + `npm run lint` green.

**Result**: PASS (no violations; Complexity Tracking empty).

## Project Structure

### Documentation (this feature)

```text
specs/T6.1-signup-workspace-creation/
├── plan.md              # This file
├── research.md          # Phase 0 — the 4 gaps + the idempotency/race decision
├── data-model.md        # Phase 1 — workspace.onboarded_at (additive), no other schema change
├── quickstart.md        # Phase 1 — manual verification scenarios (new/seeded/stranded × 2 providers)
├── contracts/
│   ├── bootstrap-on-signin.md      # the events.signIn guarded self-healing contract
│   └── empty-state-verification.md # the surfaces to verify + expected honest state
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── auth.ts                     # events.createUser → events.signIn (the bootstrap)
├── db/
│   ├── schema.ts               # workspace.onboardedAt (additive column)
│   └── seed.ts                 # seed Lumen onboardedAt = onboarded
└── lib/session.ts              # FROZEN — verified byte-stable (no edit)
drizzle/
└── 0011_*.sql                  # additive migration (generated)
```

**Structure Decision**: Single Next.js project (existing). The change is concentrated in the T6 auth
seam (`src/auth.ts`) plus one additive schema column; no new modules or directories.

## The five things this plan resolves (traceable to the spec)

### 1. GAP 2 + the crux — sign-in-time, self-healing, idempotent bootstrap  → FR-001/004/005/006/009/013

- **Hook point:** `events.signIn` in the `NextAuth(() => ({ ... events: { signIn } }))` config.
  - Fires **after** a successful authentication, once per **sign-in event** (not per request like
    `callbacks.session`, and not once-per-lifetime like `events.createUser`).
  - **Provider-agnostic:** it fires for the Resend magic-link (email) provider *and* Google OAuth;
    with the Drizzle adapter + `session.strategy: "database"`, the event receives the adapter `user`
    with a populated `user.id` in both flows. That id is the anchor for the membership check.
  - **Why not the alternatives:** `callbacks.signIn` is the *authorization* gate (return true/false) —
    wrong channel for a write side-effect; `callbacks.session` runs on **every** `auth()` call
    (every request) — needlessly frequent and couples reads to writes. `events.signIn` is the
    canonical post-auth side-effect seam and is strictly a superset of the retired `createUser`
    trigger. See research.md D1.
- **Self-healing guard:** the body is `bootstrapWorkspaceIfNeeded(userId)`:
  1. `SELECT membership.id WHERE userId = ? LIMIT 1`.
  2. If a row exists → **return (no-op)**. This is the seeded Lumen owner and every returning user
     (and the account-linking case — see below). Lumen is untouched.
  3. If none → derive name + deterministic slug, then the atomic batch (§2).
  This fires on *every* sign-in, so a **stranded membership-less user** (a prior partial create, a row
  that predates the hook) is repaired on their next sign-in — no separate backfill needed.
- **Idempotency / race (the central correctness concern):** two concurrent first sign-ins for the
  same new user both read "no membership" and both attempt to create. The guarantee is a
  **deterministic per-user workspace slug** — `slug = base(email) + "-" + user.id` (the full id, not a
  truncated slice) — created **inside `db.batch([...])`** (atomic; §2). The `workspace.slug` UNIQUE
  index makes the *second* batch abort in full (no partial rows); the loser catches the
  unique-violation and treats it as success (the workspace now exists; its next
  `getCurrentWorkspace()` resolves it). Membership additionally carries
  `unique(userId, workspaceId)` and an `onConflictDoNothing()` as belt-and-suspenders. See
  research.md D2.
- **Account-linking safety (FR-006):** `allowDangerousEmailAccountLinking` links a 2nd provider to the
  **existing** user row (same `user.id`), so the membership check finds the existing membership →
  no-op. The bootstrap keys on the resolved single account, never per-provider. See research.md D3.

### 2. GAP 1 — atomicity via `db.batch`  → FR-003

- Create workspace + owner membership in **one** `getDb().batch([ insertWorkspace, insertMembership ])`.
  neon-http executes a batch as a single transaction — all-or-nothing, so **no orphan workspace and
  no orphan membership** can persist. This mirrors the established pattern in `src/db/queries.ts:1867`
  (`writeCapturedProof`) and `src/app/c/[token]/actions.ts` (`submitCapture`).
- The workspace `id` needed by the membership row is generated app-side (`crypto.randomUUID()`) so
  both statements can be built before the batch (no dependency on a `RETURNING` between statements).
- On unique-violation (the race loser, or a re-fire after commit): caught and treated as idempotent
  success. A genuine (non-unique) failure throws → the sign-in still completes but no workspace exists
  → `getCurrentWorkspace()` throws to the error boundary → the user retries → the bootstrap
  re-attempts (FR-013: no usable half-state; retried next sign-in).

### 3. GAP 3 — name derivation  → FR-007

- Grounded in the fields T6 actually stores (`users.name` nullable text, `users.email` not-null):
  - `firstName = user.name?.trim().split(/\s+/)[0]` → **`"{firstName}'s workspace"`** when a name exists
    (Google supplies a name).
  - Otherwise (magic-link supplies email only) → **`"{email local-part}'s workspace"`** (the part
    before `@`).
- Zero-friction: no name prompt. The future wizard renames. Copy is plain — no "amazing"/emoji (P-XVII).

### 4. GAP 4 — the additive `onboarded_at` flag + seed handling  → FR-012

- **Column:** `workspace.onboarded_at timestamptz NULL` (nullable timestamp — matches the codebase's
  strong convention of nullable-timestamp state markers: `used_at`, `transaction_verified_at`,
  `consent_captured_at`). Chosen over a boolean so the wizard also learns *when*.
- **Meaning:** `NULL` = **not yet onboarded**; a set timestamp = onboarding completed. The bootstrap
  leaves it **NULL** (a fresh workspace is un-onboarded).
- **Seed handling:** `src/db/seed.ts` sets the Lumen workspace `onboarded_at` to a fixed timestamp so
  the fully-configured demo is treated as **already onboarded** — it must never be shown to the wizard
  as brand-new (FR-012). Any pre-existing prod workspace created by the *old* `createUser` hook keeps
  `NULL` (correct — it genuinely never onboarded; the wizard doesn't exist yet). No backfill needed.
- **This slice does not read the flag** (no wizard). It is inert forward-plumbing. Migration additive
  only (`ALTER TABLE ADD COLUMN`, nullable, no default) — safe on a live table.

### 5. Empty states — VERIFY, not build  → FR-010/FR-011

Confirmed present at spec time; this slice verifies each renders honestly for a genuinely-empty new
workspace (no seeded-looking data, no error). No new design port; onboarding screens 15/17 stay with
the wizard slice.

| Surface (route) | Empty-state artifact (verified present) | Expected for a new workspace |
|---|---|---|
| Dashboard `/app` | `dashboard-body.tsx` `isEmpty` → `DashboardEmpty` | greeting + zeroed KPIs + "Request proof"; "No proof yet" panel |
| Proof inbox `/app/proof` | `inbox-data.tsx` `proofs.length===0` → `InboxEmpty` | honest no-proof empty state |
| Requests `/app/requests` | `requests-grid.tsx` `templates.length===0` | "No requests yet." |
| Library `/app/library` | `library-data.tsx` → `LibraryEmpty` | honest empty (consent-filtered zero) |
| Showcase `/app/showcase` | `showcase-data.tsx` `items.length===0` → `ShowcaseEmpty` | honest empty |
| Consent `/app/consent` | `consent-empty.tsx` / ledger empty branch | honest empty ledger |
| Brand `/app/brand` | `brand-kit-data.tsx` `kit ?? defaults` | fresh kit at Pressroom defaults, no logo |

If any surface is found to assume seeded data during verification, that is a **flag-and-surface** event
(P-XIII), not a silent redesign.

### Byte-stable confirmation — `requireWorkspace` / `getCurrentWorkspace`  → FR-009

`getCurrentWorkspace()` selects an explicit column list (`id, name, slug, defaultNameDisplay,
defaultShowFace, createdAt`). Adding `onboarded_at` to the table does **not** change that SELECT, so
the returned `Workspace` shape is unchanged and every consumer stays byte-stable. `requireWorkspace()`
delegates unchanged. After bootstrap, a new user's membership resolves their new workspace via the
exact same `membership ⨝ users ⨝ workspace` join the seeded owner uses. The documented "no workspace →
throw" path stays effectively unreachable for a just-signed-in user (now guaranteed by every-sign-in
self-heal, not just first-sign-in). `src/lib/session.ts` is **not edited**.

## Complexity Tracking

*No constitution violations. No entries.*
