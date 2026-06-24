---
description: "Task list for T6 — Real authentication + workspaces"
---

# Tasks: Real authentication + workspaces (T6)

**Input**: Design documents from `specs/T6-auth-workspaces/` (plan.md, research.md, data-model.md,
contracts/session-seam.md, contracts/auth-schema.md, quickstart.md, spec.md).

**Tests**: No test runner exists in this project yet (no test deps in package.json). Per the spec's
DoD, validation is **by construction + the quickstart.md 7 scenarios run manually**. No automated test
tasks are generated (not requested; none would run). Where a task's DoD is by-construction, it says so.

**Settled inputs** (do not re-open): deps approved (`next-auth@beta` + `@auth/drizzle-adapter`, 9→11);
**C1=A** (seed owner = `SEED_OWNER_EMAIL`, login-email ≠ display-identity); **C2=A** (invites coming-
state in the workspace-switcher popover — a recorded deviation from FR-019's literal "workspace
settings", which is a T9 surface); `allowDangerousEmailAccountLinking` SAFE-ONLY-while-verified-email
invariant recorded in code + research.md.

**Constitution tags**: P-V (byte-stable seam swap), P-VII (consent unchanged), P-XIII (invites coming-
state), P-XIV (no fabricated counts). P-XV/P-XVI = **N/A (non-render slice)**.

**⚠️ P-V flag**: NO task may change a FR-021 consumer's *behaviour* beyond the seam resolving
differently. T017 is the explicit guard: if any consumer needs an edit beyond the seam, **STOP and
surface it** — that is a P-V violation, not a silent change.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1 magic-link · US2 Google · US3 seam swap + security · US4 sign-out · US5 linking.

---

## Phase 1: Setup (shared infrastructure)

- [X] T001 Add `next-auth@beta` and `@auth/drizzle-adapter` to `package.json` dependencies (the two
      approved first-time deps, 9→11; built-in Resend + Google providers, **no** `resend`/Google SDK).
      **DoD**: `npm install` succeeds; `npm run typecheck` + `npm run build` stay green (no auth wiring
      imported yet). By-construction.
- [X] T002 [P] Add the `AUTH_*` variable **names** to `.env.example`: `AUTH_SECRET`, `AUTH_GOOGLE_ID`,
      `AUTH_GOOGLE_SECRET`, `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM`, `AUTH_TRUST_HOST`, `SEED_OWNER_EMAIL`
      (with the same "Cornel-owned infra; build green without them" note as the R2 block). **DoD**:
      names present, no values; mirrors the existing R2 comment style.
- [X] T003 [P] Provisioning checklist (Cornel infra — **no code**): create the Google OAuth client
      (redirect URIs `http://localhost:3000/api/auth/callback/google` + the Vercel domain), generate
      `AUTH_SECRET` (`npx auth secret`), confirm Resend API key + a **verified sender domain** for
      `AUTH_EMAIL_FROM`; set all `AUTH_*` local **and** on Vercel. **DoD**: documented in
      quickstart.md Prerequisites; values live in `.env.local` + Vercel (not committed).

---

## Phase 2: Foundational (blocking prerequisites — schema + auth wiring before any seam swap)

**⚠️ No user story can be verified until this phase completes. The seam swap (Phase 3) MUST come after
this so no surface ever resolves a half-built session.**

- [X] T004 Add the auth schema to `src/db/schema.ts` (**additive only**, per data-model.md): the
      `@auth/drizzle-adapter` tables (`user`, `account`, `session`, `verification_token`), the
      `membership_role` pgEnum (`'owner' | 'member'`), and the `membership` table (`id`, `userId →
      user cascade`, `workspaceId → workspace cascade`, `role`, `createdAt`; unique `(userId,
      workspaceId)`; index on `userId`). **Do not alter** `workspace` or any content table. **DoD**:
      typecheck green; no diff to existing table definitions (P-V at the schema layer).
- [X] T005 Generate migration `drizzle/0004_*` via `npm run db:generate` (depends T004). **DoD**: the
      generated SQL is **purely additive** (CREATE TABLE/TYPE + the unique/index only) — **no ALTER**
      on existing tables; review the SQL to confirm. By-construction.
- [X] T006 Create `src/auth.ts` — `NextAuth({...})` with `DrizzleAdapter(getDb(), {...tables})`,
      `session: { strategy: "database" }`, `pages: { signIn: "/login", verifyRequest: "/verify" }`,
      providers **Resend** (`from: AUTH_EMAIL_FROM`, `apiKey: AUTH_RESEND_KEY`) + **Google**
      (`allowDangerousEmailAccountLinking: true`). Lazy/env-at-request so the build stays green without
      `AUTH_*`. Export `handlers, auth, signIn, signOut`. **DoD**: typecheck + build green with no
      `AUTH_*` set (lazy). (Linking caveat comment → T010.)
- [X] T007 [P] Create the route handler `src/app/api/auth/[...nextauth]/route.ts` re-exporting
      `handlers` from `src/auth.ts` (depends T006). **DoD**: `GET`/`POST` exported; build green.
- [X] T008 Add `requireWorkspace()` (Layer-2 entry helper, FR-017) — resolves the session user's
      workspace via `membership`, or redirects; the single documented entry loaders use. Place beside
      the seam (`src/lib/session.ts`) or `src/lib/workspace.ts` (depends T004). **Does not** change any
      query signature (queries already take `workspaceId`). **DoD**: typecheck green; documented as the
      Layer-2 invariant entry.
- [X] T009 Update `src/db/seed.ts` (depends T004): after the Lumen workspace insert, create the demo
      **`user`** with `email = process.env.SEED_OWNER_EMAIL ?? "amalacornel@gmail.com"` and a
      **`membership`** `(userId, Lumen, role: 'owner')`, **idempotent** (`onConflictDoNothing` on
      `(userId, workspaceId)`) so a re-run on the **shared prod DB** is safe and **non-destructive for
      the new rows**. **IMPORTANT split (C1=A)**: the **login email** is `SEED_OWNER_EMAIL` (Cornel
      controls it) but the **display identity stays "Maya K." / "Lumen Candle Co."** — set the user's
      `name = "Maya K."` so the chrome still reads as the demo persona while sign-in uses Cornel's
      mailbox. **No content backfill** (proof/clip/etc. already carry `workspaceId`). **DoD**: re-run
      seed → exactly one demo user + one owner membership over Lumen; existing content unchanged.
- [X] T010 [P] Record the `allowDangerousEmailAccountLinking` invariant (depends T006): an inline
      comment in `src/auth.ts` next to the flag **and** the existing note in `research.md` (D3) stating
      it is **SAFE ONLY while every configured provider yields a verified email** — adding any
      non-verified-email provider requires a re-think. **DoD**: comment present in `auth.ts`; D3 in
      research.md cross-references it. By-construction.

---

## Phase 3: User Story 3 — The seam swap + two-layer security (Priority: P1, the structural core)

**Goal**: `getSession()`/`getCurrentWorkspace()` become session-backed; every FR-021 consumer keeps
working **byte-stable**; `/app/*` is gated; `/` redirects correctly.

**Independent test**: signed in as the seeded demo user, every FR-021 surface renders Lumen data
unchanged; signed out, `/app/*` redirects to `/login` with no data flash (quickstart Scenarios 3 & 4).

- [X] T011 [US3] Swap the seam in `src/lib/session.ts` (depends T006, T008): `getSession()` reads
      `auth()` and maps the real user to the **unchanged** `{ user: { name, initials, email } }` shape
      (`initials` derived from `name`, fallback email local-part); `getCurrentWorkspace()` resolves the
      session user's workspace via `membership` instead of `getDefaultWorkspace()`, returning the
      **same `Workspace` type**; the no-workspace path **redirects** (never throws). **DoD (P-V)**:
      both function signatures + return shapes identical to today; consumers compile with **zero**
      edits.
- [X] T012 [US3] Add workspaceless-user provisioning in `src/auth.ts` (`events.createUser` or a
      `signIn` guard, depends T006): any user with no `membership` gets a personal `workspace` + an
      `owner` `membership`, so `getCurrentWorkspace()` always resolves. **DoD**: a brand-new sign-in
      lands in a usable workspace; the seeded demo user (already has one) is unaffected.
- [X] T013 [US3] Create `src/middleware.ts` (Layer 1, FR-008; depends T006): `matcher: ["/app/:path*"]`;
      no session → redirect to `/login`. **DoD (quickstart S4)**: signed-out `/app`, `/app/library`,
      `/app/consent` redirect to `/login` with **no flash** of protected data.
- [X] T014 [US3] Implement the root `/` redirect (FR-020) in `src/app/page.tsx` (depends T006):
      unauthenticated → `/login`, authenticated → `/app`. **DoD**: both branches verified manually.
- [X] T015 [P] [US3] Resolve the styleguide coupling in `src/app/styleguide/data/page.tsx` (plan §6):
      read `getDefaultWorkspace()` **directly** (not the session seam) and return `notFound()` when
      `NODE_ENV === "production"` (dev-only harness). **DoD (quickstart S7)**: renders in dev without a
      session; 404 in a prod build. **P-V note**: this is the one consumer intentionally **removed**
      from the seam — recorded, not silent.
- [X] T016 [P] [US3] Verify `src/app/error.tsx` stays coherent post-swap (plan §6): confirm it needs
      **no change** — the no-session path is a middleware redirect and the no-workspace path is a
      `getCurrentWorkspace()` redirect (T011/T013), so the boundary remains the DB-failure catch-all and
      never throws on the auth path. **DoD (quickstart S7.2)**: killing `DATABASE_URL` mid-session shows
      `ErrorState`; auth/no-workspace paths redirect instead of throwing. By-inspection.
- [X] T017 [US3] **FR-021 byte-stability regression gate** (P-V verification target — depends T011):
      `git diff` the FR-021 **Pages + Server Actions** (the 11 pages + 8 action files in
      contracts/session-seam.md). Expectation: **no changes** to any of them. The only consumer-adjacent
      edits allowed are `session.ts` (T011), the styleguide page (T015), `user-menu.tsx` (T021),
      `workspace-switcher.tsx` (T023). **If any other FR-021 consumer requires an edit → STOP and
      surface it (P-V violation).** **DoD**: the diff matches the allow-list exactly.

**Checkpoint**: real session resolves everywhere; surfaces byte-stable; routes gated. Sign-in UI
(Phase 4/5) makes it reachable for a human.

---

## Phase 4: User Story 1 — Magic-link sign-in (Priority: P1)

**Goal**: a merchant signs in via emailed magic link (Resend) and lands in the app.

**Independent test**: quickstart Scenario 1 (request link → check-email state → click → `/app`).

- [X] T018 [US1] Create the sign-in surface `src/app/login/page.tsx` (depends T006): the magic-link
      **email form** (Zod-validated input) calling the Resend provider; ported onto **current Pressroom
      tokens** (P-IV; stale-palette Auth export reconciled, not copied), persimmon only on the primary
      action, plain copy (P-XVII). **P-XIV**: no fabricated counts/activity. (Google button added in
      T020 — same file.) **DoD**: submitting a valid email triggers the magic-link send.
- [X] T019 [US1] Create the check-your-email state `src/app/verify/page.tsx` (depends T006): honest
      "magic-link sent / check your email" naming the address; expired/used-link error with "request a
      new link" (spec edge cases). **DoD (quickstart S1)**: sent-state shows; bad link → honest error,
      no broken page.

---

## Phase 5: User Story 2 — Google sign-in (Priority: P1)

**Goal**: one-click Google OAuth sign-in; same verified email → one user.

**Independent test**: quickstart Scenario 2.

- [X] T020 [US2] Add the "Continue with Google" button to `src/app/login/page.tsx` (depends T018, same
      file → **not [P]**): triggers the Google provider; honest "sign-in not completed" state on
      cancel/deny (spec US2.3). **DoD (quickstart S2)**: Google flow completes to `/app`.

---

## Phase 6: User Story 4 — Sign-out (Priority: P2)

**Goal**: sign-out ends the session; protected routes no longer reachable.

**Independent test**: quickstart Scenario 5.

- [X] T021 [US4] Add a real **sign-out** action to `src/components/app/user-menu.tsx` (currently
      display-only) calling `signOut` (depends T006). **P-V note**: this is an **additive control** on
      the chrome, not a change to a FR-021 *data* consumer's behaviour — surfaced here explicitly.
      **DoD (quickstart S5)**: sign-out returns to `/login`; `/app` then redirects when requested.

---

## Phase 7: User Story 5 — One identity across providers (Priority: P2)

**Goal**: same verified email via either provider resolves to one user/workspace.

**Independent test**: quickstart Scenario 2 (linking half) + DB check (one user row, one membership).

- [X] T022 [US5] Verify account-linking-by-verified-email end to end (config already in `src/auth.ts`
      via T006/T010 — this is a **verification** task, no new code): create a user via magic-link, then
      Google with the same verified email → **one** `user`, **one** `membership` (no duplicate). **DoD
      (quickstart S2)**: a single user/workspace under both providers; the T010 caveat comment is the
      standing guard.

---

## Phase 8: Cross-cutting (invites coming-state) & Polish / DoD

- [X] T023 [P] Add the **"Invite teammates — coming soon"** affordance to
      `src/components/app/workspace-switcher.tsx` popover (FR-019, P-XIII; **C2=A**). A visible, labeled
      coming-state row — **not** a dead button, **not** hidden. **Record the deviation**: a code comment
      noting FR-019 says "workspace settings" but settings is a **T9** surface, so the affordance lives
      in the switcher popover for now. **DoD**: the row renders, reads "coming soon", is non-interactive
      yet clearly honest (P-XIII).
- [X] T024 [P] Finalize `.env.example` + quickstart Prerequisites alignment (depends T002): ensure every
      `AUTH_*` + `SEED_OWNER_EMAIL` is documented with where-to-set (local + Vercel). **DoD**: a fresh
      checkout can follow quickstart Prerequisites to a working local sign-in.
- [X] T025 Migration apply + seed reconciliation: `npm run db:migrate` (apply `0004`) then `npm run
      db:seed` (T009) on the target DB; for the **shared prod DB**, the idempotent backfill path adds
      the demo user + owner membership without a destructive reseed. **DoD (quickstart Prereqs + S3)**:
      Lumen has exactly one demo owner; existing content intact and workspace-scoped.
- [X] T026 Polish & DoD gate: `npm run lint`, `npm run typecheck`, `npm run build` **green with no
      `AUTH_*` set** (CI parity); run **all 7 quickstart.md scenarios** (both providers, seam regression
      T017, two-layer security, sign-out, invites coming-state, both couplings). Confirm **P-VII**:
      consent records/versioning/revocation/reads behave identically (no consent query changed).
      **P-XV/P-XVI**: N/A (non-render). **DoD**: all 7 scenarios pass; build green; STOP and report
      (P-IX) — do not advance to T7.

---

## Dependencies & Execution Order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **Phase 3 (seam swap + security)** →
  **Phases 4–7 (auth UI / stories)** → **Phase 8 (invites + polish)**.
- **Hard ordering rule**: the seam swap (T011) MUST come after schema (T004/T005) + auth wiring
  (T006/T008) so no surface ever resolves a half-built session. The build stays green at each step
  (lazy db + lazy auth config; additive schema; shape-preserving swap).
- T005→T004; T006→T001,T004; T007→T006; T008→T004; T009→T004; T010→T006.
- T011→T006,T008; T012/T013/T014→T006; T017→T011 (and all of Phase 3).
- T018/T019→T006; T020→T018; T021→T006; T022→T006,T010.
- T025→T004,T005,T009; T026→everything.

## Parallel opportunities

- **Phase 1**: T002, T003 in parallel (after/with T001).
- **Phase 2**: T007 and T010 are [P] (different files) once T006 lands; T008/T009 touch different files
  from each other.
- **Phase 3**: T015 and T016 are [P] (different files) — independent of the T011→T017 chain.
- **Phase 8**: T023, T024 are [P].

Example: `T018` (login form) and `T019` (verify page) are different files → can run in parallel within
US1 (both depend only on T006). `T020` (Google button) is **not** [P] — same file as T018.

## Implementation strategy

- **MVP = Phases 1–4** (Setup + Foundational + seam swap/security + magic-link sign-in): real auth,
  the byte-stable swap, gated routes, and one working sign-in path. This is a demoable, green increment.
- **Increment 2**: Phase 5 (Google) + Phase 6 (sign-out) + Phase 7 (linking verification).
- **Finish**: Phase 8 (invites coming-state + polish/DoD gate).
- **STOP and report after T026**; do not advance to T7 until Cornel says so (P-IX).
