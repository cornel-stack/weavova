---

description: "Task list for T6.1 — Signup → Workspace Creation (hardening the existing bootstrap)"
---

# Tasks: T6.1 — Signup → Workspace Creation (hardening)

**Input**: Design documents from `specs/T6.1-signup-workspace-creation/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D7), data-model.md,
contracts/bootstrap-on-signin.md, contracts/empty-state-verification.md, quickstart.md

**Tests**: No automated test suite is requested for this slice (the repo has no test runner wired;
verification is the `npm run build` gate + the `quickstart.md` A–G scenario matrix). Verification
tasks below are explicit and tied to quickstart scenarios.

**Constitution tags**: P-V (T6 auth seam reused, byte-stable), P-XIII (honest empty states / real
plumbing), P-XIV (new workspace genuinely empty). **P-XV/XVI: N/A — non-render slice.**

**Cores frozen (P-V)**: T6 auth schema (`users`/`workspace`/`membership`), `src/lib/session.ts`
(`requireWorkspace`/`getCurrentWorkspace`), capture/consent/verification. Only the enumerated touch
points change. **STOP-and-surface if a core needs a real change.**

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different file, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (Setup, Foundational, Polish have no story label)

---

## Phase 1: Setup (baseline anchors for the gates)

**Purpose**: Capture the values the "byte-stable" and "no-new-dep" gates check against, before any change.

- [X] T001 [P] Record baseline anchors (read-only): the dependency count in `package.json` (expected
      **11**), and the exact `getCurrentWorkspace()` SELECT column list in `src/lib/session.ts`
      (`id, name, slug, defaultNameDisplay, defaultShowFace, createdAt`). Note them for T009/T014.
      **DoD**: both values written into this task's notes; no files changed. **(P-V)**

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The additive column + migration + seed. Blocks the bootstrap (which writes
`onboardedAt`) and US3. **⚠️ No user-story work begins until this phase is done.**

- [X] T002 Add `onboardedAt` nullable timestamp to the `workspace` table in `src/db/schema.ts`
      (`onboardedAt: timestamp("onboarded_at", { withTimezone: true })` — nullable, **no** default,
      placed alongside `createdAt`). Additive only; touch no other column.
      **DoD**: `workspace` type gains `onboardedAt` (nullable); `getCurrentWorkspace()` SELECT list is
      **not** edited (verified in T009). **(P-V, P-XIII)**
- [X] T003 Generate the additive migration into `drizzle/` via `npx drizzle-kit generate`
      (expected `drizzle/0011_*.sql`). Confirm the SQL is exactly
      `ALTER TABLE "workspace" ADD COLUMN "onboarded_at" timestamp with time zone;` and contains **no**
      other table/column diff. (Depends on T002.)
      **DoD**: `0011` migration present; diff is ADD COLUMN only (gate T015 re-checks). **(P-V)**
- [X] T004 [P] Seed: in `src/db/seed.ts`, set the seeded **Lumen** workspace `onboarded_at` to a fixed
      timestamp on insert (seed = already onboarded), so the future wizard never treats the demo as
      new (FR-012 / INV-4). No backfill of any other row. (Depends on T002; different file from T003.)
      **DoD**: `npm run db:seed` writes Lumen with `onboarded_at` non-null; new bootstrapped
      workspaces remain NULL. **(P-XIV)**

**Checkpoint**: schema + migration + seed ready; the bootstrap can now write `onboardedAt`.

---

## Phase 3: User Story 1 — New person signs in → usable, empty workspace (Priority: P1) 🎯 MVP

**Goal**: A membership-less user (magic-link OR Google) lands in a real owned workspace with honest
empty states. Delivers the whole point of the slice.

**Independent Test**: Sign in as a zero-membership identity → exactly one workspace + one owner
membership created, correctly named, `onboarded_at IS NULL`; every rail surface renders honest empty.
(Scenarios A, B, E, F, G in `quickstart.md`.)

**Note**: T005→T007 all edit `src/auth.ts` (same file) → sequential, not [P].

- [X] T005 [US1] In `src/auth.ts`, **replace `events.createUser` with `events.signIn`**: add the
      `signIn` event calling `bootstrapWorkspaceIfNeeded(user)`; guard = `SELECT membership.id WHERE
      user_id = user.id LIMIT 1` with an early **no-op return** when a row exists. Remove the old
      `createUser` body. Provider-agnostic: `user.id` is present for both magic-link and Google on the
      DB-session strategy (research D1).
      **DoD**: signing in with an existing membership performs zero writes (fast path); the function is
      wired on every sign-in, both providers. **(P-V)**
- [X] T006 [US1] In `bootstrapWorkspaceIfNeeded` (`src/auth.ts`), add the **naming + deterministic
      slug** (research D2/D4): `firstName = user.name?.trim().split(/\s+/)[0]`; `name = firstName ?
      "${firstName}'s workspace" : "${email.split('@')[0]}'s workspace"`; `base =
      (email.split('@')[0]||'workspace').toLowerCase().replace(/[^a-z0-9]+/g,'-')`; `slug =
      "${base}-${user.id}"` (**FULL** user.id — not `slice(0,8)`). (Depends on T005.)
      **DoD**: name is never empty (email is not-null); slug is a deterministic function of `user.id`.
      **(P-V, P-XVII — plain copy, no emoji)**
- [X] T007 [US1] In `bootstrapWorkspaceIfNeeded` (`src/auth.ts`), do the **atomic create**:
      `getDb().batch([ insert workspace {id: crypto.randomUUID(), name, slug, onboardedAt: null},
      insert membership {userId: user.id, workspaceId, role:'owner'}.onConflictDoNothing() ])`; wrap in
      try/catch and **swallow a unique-violation** (the race loser / re-fire) as idempotent success;
      re-throw nothing to the event (a genuine error logs and self-heals next sign-in). (Depends on
      T006.)
      **DoD (by construction)**: atomic single-transaction batch → no orphan (INV-1); deterministic
      slug + `workspace_slug_unique` makes a concurrent duplicate abort in full → exactly one
      workspace (INV-2); `onboardedAt: null` sets the wizard seam. **(P-V, P-XIII)**
- [X] T008 [US1] Confirm the resolution seam (read-only, **no edit** to `src/lib/session.ts`): a
      just-bootstrapped user resolves their new workspace through the same `membership ⨝ users ⨝
      workspace` join as the seeded owner, and `getCurrentWorkspace()`'s SELECT list is unchanged (does
      **not** include `onboarded_at`) → `Workspace` return shape byte-stable for all consumers (FR-009,
      research D6). Compare against the T001 baseline.
      **DoD**: `src/lib/session.ts` unchanged; new user resolves; the "no workspace → throw" path is
      unreachable for a just-signed-in user. **(P-V)**
- [X] T009 [US1] **Empty-state verification** across the 7 surfaces per
      `contracts/empty-state-verification.md` (E1 dashboard, E2 inbox, E3 requests, E4 library,
      E5 showcase, E6 consent, E7 brand) for a genuinely-empty new workspace: each renders an honest
      empty state / defaults — no error, no seeded-looking data, no dead control. **Verify only — do
      NOT port new designs** (onboarding screens 15/17 belong to the wizard slice). If any surface
      assumes seeded data → **flag-and-surface** (P-XIII), do not redesign. (Scenario G.)
      **DoD**: all 7 pass their per-surface criteria; top bar shows the derived workspace name, not
      "Lumen". **(P-XIII, P-XIV)**

**Checkpoint**: a brand-new user is fully functional on an empty workspace — MVP complete.

---

## Phase 4: User Story 2 — Existing users undisturbed (Priority: P1)

**Goal**: The seeded owner, returning users, and account-linking users are untouched — no new
workspace. **Delivered by construction** of the T005 zero-membership guard; these tasks verify it.

**Independent Test**: Sign in as the seed owner and as a second-provider link → no new workspace;
land in the existing workspace. (Scenarios C, D.)

- [X] T010 [P] [US2] Verify the **seeded Lumen owner** sign-in is a no-op (Scenario C): land in Lumen;
      DB-assert no new `workspace`/`membership` row; Lumen `onboarded_at` retained. Headless-verifiable
      via a DB assertion after a real sign-in, or by asserting the guard's fast-path on the seeded
      `user.id`.
      **DoD**: zero new rows for the seed email; seed path byte-stable (FR-008). **(P-V)**
- [X] T011 [P] [US2] Verify **account-linking** does not double-create (Scenario D): a second provider
      for the same verified email links to the existing `user.id` (`allowDangerousEmailAccountLinking`)
      → guard finds the membership → no-op (FR-006, research D3). **Needs a real dual-provider sign-in**
      (link Google to a magic-link account or vice versa).
      **DoD**: one account, one workspace after linking; no second workspace. **(P-V)**

**Checkpoint**: existing/returning/linked users provably undisturbed.

---

## Phase 5: User Story 3 — Wizard seam (`onboarded_at`) (Priority: P3)

**Goal**: A bootstrapped workspace is queryably "not yet onboarded"; the seed is "onboarded".
**Delivered by construction** of T007 (`onboardedAt: null`) + T004 (seed set); this task verifies the
semantics.

**Independent Test**: Inspect a fresh workspace (`onboarded_at IS NULL`) vs the seed (`onboarded_at`
set).

- [X] T012 [US3] Verify `onboarded_at` semantics (INV-4): a bootstrapped workspace has
      `onboarded_at IS NULL`; the seeded Lumen workspace has it set; the flag is **not read** anywhere
      this slice (inert forward-plumbing, no dead control — P-XIII). DB-assert after Scenario A/B and
      after `npm run db:seed`. Headless-verifiable.
      **DoD**: new = NULL, seed = set; no code path reads the column yet. **(P-XIII, P-XIV)**

**Checkpoint**: the future onboarding-wizard seam exists and is honest.

---

## Phase 6: Polish, Gates & Definition of Done

**Purpose**: The constitution-mandated per-slice gates and the quickstart verification spine.

- [X] T013 [P] **Cores-frozen gate (P-V)**: confirm the change set touches **only** the enumerated
      files — `src/db/schema.ts` (additive column), `drizzle/0011_*.sql`, `src/auth.ts` (bootstrap),
      `src/db/seed.ts` (Lumen onboarded), plus `specs/**` docs. `src/lib/session.ts`, and the
      `membership`/`users` table shapes, are **unchanged**.
      **DoD**: no out-of-scope file modified; else STOP-and-surface.
- [X] T014 [P] **No-new-dep gate (P-III)**: `package.json` dependency count unchanged (**11** per
      T001); no auth provider added.
      **DoD**: dependency count identical to baseline. **(P-III)**
- [X] T015 [P] **Migration-additive-only gate**: `drizzle/0011_*.sql` is a single `ADD COLUMN`
      (nullable, no default) with no drop/alter of any existing column; safe on a live table.
      **DoD**: SQL diff is ADD COLUMN only.
- [X] T016 **Run the quickstart A–G matrix** (`quickstart.md`) as the verification spine:
      A (new user, magic-link), B (new user, Google), C (seed no-op), D (account-linking), E
      (concurrent → one workspace), F (stranded self-heal), G (empty states). **Headless-verifiable**:
      E (direct double-`batch` against the DB), F (delete membership → sign in), G (render an empty
      workspace), plus DB-asserts for A/C. **Needs real OAuth**: B and D (real Google / real
      second-provider link); A needs a real magic-link round-trip unless simulated.
      **DoD**: every applicable scenario passes; any OAuth-gated scenario that can't run headless is
      noted for a manual pass.
- [X] T017 [P] **Owned-data + port-completeness audit (P-XIII/P-XIV)**: a bootstrapped workspace shows
      only genuine (zero) owned data — no fabricated starter proof, counts, or metrics; every rendered
      control on the empty surfaces works or is an honest coming/empty state.
      **DoD**: no fabricated data on any new-workspace surface.
- [X] T018 **`npm run lint` and `npm run build` green** (TS strict: no `any`, no unjustified
      `@ts-ignore`).
      **DoD**: both commands exit 0.

**P-XV / P-XVI**: N/A — non-render slice (no runtime plan/composition, no model in a render path).

**Definition of done (slice complete only when ALL hold)**: bootstrap fires per sign-in for both
providers and is idempotent/self-healing (US1); existing/seed/linked users undisturbed (US2); the
`onboarded_at` seam is honest (US3); all 7 empty states verified honest; cores frozen + no new dep +
additive migration; quickstart A–G pass; build green. Then **STOP and report**; do not advance to the
next slice/tier until the human says so (P-IX).

---

## Dependencies & Execution Order

### Phase order (keeps the build green)

- **Setup (T001)** → no dependency.
- **Foundational (T002 → T003; T004 [P] after T002)** → blocks US1 (bootstrap writes `onboardedAt`)
  and US3.
- **US1 (T005 → T006 → T007 → T008 → T009)** → depends on Foundational. T005–T007 are same-file
  sequential; T008/T009 are read-only verification after T007.
- **US2 (T010, T011 [P])** → verifies the guard delivered in T005; can run once T005 lands.
- **US3 (T012)** → verifies T007 + T004; can run once both land.
- **Polish/Gates (T013–T018)** → after all stories; T018 is the final green gate.

### Story independence

- **US1 (P1)** is the MVP and self-contained (bootstrap + empty states).
- **US2 (P1)** is verification of behavior already produced by US1's guard — no new production code.
- **US3 (P3)** is verification of the seam already produced by Foundational + US1's batch.

### Parallel opportunities

- T004 [P] alongside T003 (different files, both after T002).
- T010 [P] + T011 [P] together (independent verifications).
- T013 [P] + T014 [P] + T015 [P] + T017 [P] together (independent audits) once code lands.

---

## Implementation Strategy

### MVP first (US1 only)

1. Setup (T001) → Foundational (T002–T004) → US1 (T005–T009).
2. **STOP and validate**: quickstart A + F + G headless; then a real magic-link/Google pass.
3. US1 alone makes a genuinely new user able to use the product — shippable MVP.

### Incremental delivery

1. Foundational → US1 (MVP) → validate.
2. US2 verifications (seed + linking undisturbed) → validate.
3. US3 verification (onboarded seam) → validate.
4. Gates (T013–T018) → build green → STOP and report.

---

## Notes

- [P] = different files, no dependency on an incomplete task.
- The idempotency/atomicity guarantees (INV-1/INV-2) are **by construction** (T007) — the race is
  closed by the DB (`workspace_slug_unique`), not by check-then-act.
- Byte-stability (FR-009) is preserved by **not editing** `src/lib/session.ts` and **not** adding
  `onboarded_at` to `getCurrentWorkspace()`'s SELECT.
- If correctness ever appears to need a frozen-core change, **stop and surface** (P-V) rather than
  proceed.
