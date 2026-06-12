---
description: "Task list for T0.3 — Database schema and fixtures (Neon + Drizzle)"
---

# Tasks: T0.3 — Database schema and fixtures dataset (Neon + Drizzle)

**Input**: Design documents from `specs/T0.3-schema-fixtures/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/{db-queries,seed}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Tests**: NOT requested for this slice (verification is via drizzle-kit generate/migrate against
Neon, the seed, `/styleguide/data`, and typecheck/lint/build + CI). No test tasks are generated.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> scaffolded, installed, or applied to a database. Execution happens in `/speckit.implement` after
> human approval (and requires a Neon `DATABASE_URL` in `.env.local`).

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1 / US2 / US3 on user-story tasks; Setup/Schema/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one commit.

---

## Phase 1: Setup

- [ ] T001 Add the Neon + Drizzle dependencies (only these): `drizzle-orm` + `@neondatabase/serverless`
  (deps) and `drizzle-kit` (devDep). Confirm `package.json` adds nothing else outside the locked
  stack. → FR-001, FR-015, SC-008
- [ ] T002 Choose the seed runner by **local Node version**: run `node -v`; if **>= 23.6** use the
  zero-dep native path (native TS type-stripping + `--env-file`) — no extra dep; if **< 23.6** add
  `tsx` as a dev tooling dependency (authorized — same tooling category as drizzle-kit) and run the
  seed through it. Record the chosen path in the `db:seed` script (T005). Either way the seed loads
  `DATABASE_URL` from `.env.local`. → FR-001, FR-011
- [ ] T003 Create `src/db/client.ts`: a **lazy**, server-only Drizzle client over
  `drizzle-orm/neon-http` (`neon(process.env.DATABASE_URL)`); it MUST NOT connect or throw at import
  time when `DATABASE_URL` is absent (so CI builds without a DB). Throw a clear error only when a
  query actually runs without a URL. → FR-001, SC-006
- [ ] T004 Create `drizzle.config.ts` (dialect `postgresql`, `schema: ./src/db/schema.ts`,
  `out: ./drizzle`, `dbCredentials.url` from `process.env.DATABASE_URL`) loading env via
  `process.loadEnvFile?.()` (so `drizzle-kit` gets the URL without `dotenv`); and `.env.example`
  documenting `DATABASE_URL` (name only, no value). → FR-001, FR-002, SC-007
- [ ] T005 Add `package.json` scripts: `db:generate` (`drizzle-kit generate`), `db:migrate`
  (`drizzle-kit migrate`), and `db:seed` (the runner chosen in T002, loading `.env.local`). → FR-001,
  FR-010, FR-011

**Checkpoint**: Drizzle wired to Neon (lazily); env + scripts ready; secrets stay in `.env.local`.

---

## Phase 2: Schema (authoritative — BLOCKS user stories)

- [ ] T006 Define enums + tables in `src/db/schema.ts`: pgEnums `proof_type`
  (`text|video|photo|audio`) and `consent_state` (`granted|awaiting|revoked`); `workspace`
  (id, name, slug unique, createdAt); `source` (id, workspaceId → workspace onDelete cascade,
  **kind text**, label, createdAt). Keep `source.kind` as text (code allowlist in T007), per the
  plan. → FR-003, FR-004 (R2)
- [ ] T007 Add the `proof` table + the `source.kind` code allowlist in `src/db/schema.ts`: `proof`
  (id uuid PK, workspaceId → workspace, customerName, proofType enum, quote null, transcript null,
  sourceId → source onDelete restrict, capturedAt timestamptz, reviewed bool default false, verified
  bool default false, thumbnail null, createdAt); export an `as const` `SOURCE_KINDS` tuple
  (`shopify|stripe|instagram|calendly|square|…`) + a `SourceKind` type for write-boundary integrity.
  → FR-005, FR-004 (R2)
- [ ] T008 Add the `consent` table to `src/db/schema.ts` (versioned, revocable, cascade-ready):
  id uuid **stable PK** (the id T2's `derived_asset.consentId` FK will reference), proofId → proof
  onDelete cascade, state enum, grantedAt null, revokedAt null, version int, captureContext jsonb
  null, createdAt; a **unique `(proofId, version)`** constraint and an index `(proofId, version desc)`
  for the latest-version lookup. Document (comment + data-model) the future
  `derived_asset.consentId → consent.id` FK + revocation cascade. → FR-007, FR-008 (P-VII)
- [ ] T009 Reconcile `src/lib/proof.ts` to **derive from the schema**: `ProofType`/`ConsentState`
  from the schema enums, and `ProofView` (= `ProofCardProps`) as the flattened shape
  (`source: string` label, effective `consentState`, ISO `capturedAt`). The ProofCard component MUST
  stay unchanged (type-only import). → FR-006, SC-002 (P-VI)
- [ ] T010 Generate the first migration (`npm run db:generate`) into `./drizzle` and **commit** the
  SQL + meta. (No DB connection needed to generate.) → FR-010, SC-001

**Checkpoint**: the authoritative schema + derived types exist; migration files committed.

---

## Phase 3: User Story 1 — The proof entity exists in Neon (Priority: P1)

**Goal**: the schema is applied to Neon and replayable.
**Independent Test**: `npm run db:migrate` against Neon succeeds; tables/enums visible in the Neon
dashboard; a fresh checkout re-applies the committed migrations (quickstart §1).

- [ ] T011 [US1] Apply migrations to Neon: with `DATABASE_URL` in `.env.local`, run
  `npm run db:migrate`; confirm `workspace`/`source`/`proof`/`consent` + the two enums are created
  with no error and visible in the Neon dashboard. (Requires the human-provided `DATABASE_URL`.)
  → FR-010, SC-001

**Checkpoint**: the contract exists in Neon.

---

## Phase 4: User Story 2 — ~15 realistic fixtures, each with consent (Priority: P1)

**Goal**: a typed query layer + a re-runnable seed of ~15 consented fixtures.
**Independent Test**: `npm run db:seed` inserts ~15 proofs across all four types and all three
consent states, each with a consent record + source; re-running doesn't duplicate/err; `getProofs`
returns `ProofView`s (quickstart §3,4).

- [ ] T012 [US2] Create `src/db/queries.ts` (Drizzle only): `getProofs(): Promise<ProofView[]>` and
  `getProof(id): Promise<ProofView | null>` — join `proof` + `source.label`, derive the **effective
  (latest-version) consentState** (no row ⇒ not granted; fails closed), serialize `capturedAt` to
  ISO. Returns exactly `ProofView`. → FR-009, FR-013 (P-VII, P-X)
- [ ] T013 [US2] Write `src/db/seed.ts`: reset-then-insert (delete consent → proof → source →
  workspace, then insert) one demo workspace + several sources (kinds spanning
  shopify/stripe/instagram/calendly/square) + **~15 proofs**, **each with ≥1 consent record**.
  Realistic on-brand customer words (no lorem); a mix of reviewed/verified; neutral media
  placeholders; **no real identifiable people**. At least one **revoked** proof modelled as ≥2
  consent versions (granted → revoked). Re-runnable (idempotent). → FR-011, FR-012, SC-003 (P-XI)
- [ ] T014 [US2] Run `npm run db:seed` against Neon; confirm ~15 proofs across all four proof types
  and all three effective consent states, each with a consent record + source; re-run confirms no
  duplication/error. → FR-011, FR-012, SC-003

**Checkpoint**: the contract dataset exists and reads back as `ProofView`s.

---

## Phase 5: User Story 3 — Real ProofCards rendered from Neon (Priority: P1)

**Goal**: the proof-of-path — real cards from Neon, identical to the hardcoded T0.2 cards.
**Independent Test**: open `/styleguide/data`; cards are read from Neon via `getProofs()`, rendered
with the unchanged ProofCard, matching the hardcoded cards (proof-forward, consent dot, gated Make)
in both themes (quickstart §5).

- [ ] T015 [US3] Create `src/app/styleguide/data/page.tsx` (Server Component, **`export const
  dynamic = "force-dynamic"`**) that calls `getProofs()` and renders the **unchanged** T0.2
  `ProofCard` for each. Internal route, **not linked from the public landing**. force-dynamic + the
  lazy client keep CI builds green without `DATABASE_URL`. → FR-014, SC-005 (P-II, P-V, SC-006)
- [ ] T016 [US3] Verify the proof-of-path: real cards render from Neon, visually equivalent to the
  hardcoded T0.2 cards; consent dot reflects state; **Make appears only for granted** proofs; correct
  in both Daylight and Ink. → FR-014, SC-004, SC-005

**Checkpoint**: real persisted records render with no UI rework.

---

## Phase 6: Polish & Definition of Done

- [ ] T017 [P] Run `npm run typecheck`, `npm run lint`, `npm run build` — all green; confirm the
  build is green **without** `DATABASE_URL` (dynamic data route + lazy client). → SC-002, SC-006
- [ ] T018 [P] Secrets check: `git check-ignore .env.local` matches; no `.env`/secret file is tracked
  (`git ls-files | grep -E '\.env'` empty except `.env.example`). → FR-002, SC-007
- [ ] T019 [P] Consent-gating check: in the seeded data, proofs whose effective consent is
  `awaiting`/`revoked` offer **no** Make; `granted` ones do (query result + `/styleguide/data`).
  → FR-008, SC-004 (P-VII)
- [ ] T020 [P] Off-stack dependency check: only `drizzle-orm`, `@neondatabase/serverless`,
  `drizzle-kit` (and `tsx` only if Node < 23.6 per T002) added beyond the existing stack. → FR-015,
  SC-008
- [ ] T021 [P] Protected-files check: `git diff` shows `design-reference/`, `docs/`, `.specify`
  templates/scripts untouched; `CLAUDE.md` changed only by the SPECKIT marker; ProofCard component
  unchanged. Microcopy clean (no "amazing"/"awesome"/emoji). → P-XI
- [ ] T022 Push the feature branch; confirm CI (typecheck + lint + build) is green **without** a
  `DATABASE_URL` secret. → SC-006

**Checkpoint**: Definition of Done met — STOP and report; do not advance to the next tier until the
human says to proceed (P-IX).

---

## Dependencies & Execution Order

- **Setup (T001–T005)** → first. T002 (runner detection) before T005 (seed script); T003/T004
  independent.
- **Schema (T006–T010)** → depends on Setup; BLOCKS user stories. T006 → T007 → T008 are sequential
  edits to `schema.ts`; T009 (reconcile types) after the tables exist; T010 (generate migration)
  after the schema is complete.
- **US1 (T011)** → depends on Schema (needs the committed migration) + a Neon `DATABASE_URL`.
- **US2 (T012–T014)** → depends on Schema; T012 (queries) and T013 (seed) are different files
  (parallelizable); T014 (run seed) after T011 + T013.
- **US3 (T015–T016)** → depends on US2 (queries + seeded data); T016 after T015.
- **Polish (T017–T022)** → after the user stories.

## Parallel Opportunities

- US2: `T012` (queries) and `T013` (seed) — different files.
- Polish: `T017`–`T021` are independent checks.

## Implementation Strategy

- **MVP** = Setup + Schema + US1 — the proof entity exists in Neon (the contract).
- Then US2 (queries + seed) → US3 (proof-of-path) → Polish/DoD.
- Commit after each task (one commit each). T011/T014 require the human-provided `DATABASE_URL`;
  pause there if it is not yet available.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001, T020 | FR-001, FR-015, SC-008 |
| T002 | FR-001, FR-011 |
| T003 | FR-001, SC-006 |
| T004 | FR-001, FR-002, SC-007 |
| T005 | FR-001, FR-010, FR-011 |
| T006, T007 | FR-003, FR-004, FR-005 |
| T008 | FR-007, FR-008 (P-VII) |
| T009 | FR-006, SC-002 (P-VI) |
| T010, T011 | FR-010, SC-001 |
| T012 | FR-009, FR-013 |
| T013, T014 | FR-011, FR-012, SC-003 |
| T015 | FR-014, SC-005, SC-006 |
| T016 | FR-014, SC-004, SC-005 |
| T017 | SC-002, SC-006 |
| T018 | FR-002, SC-007 |
| T019 | FR-008, SC-004 (P-VII) |
| T021 | P-XI |
| T022 | SC-006 |

## Notes

- 22 atomic tasks; 0 test tasks (not requested).
- **Requires a Neon `DATABASE_URL`** (pooled, in `.env.local`) for T011 (migrate) and T014 (seed) —
  the only tasks that touch the real database.
- `source.kind` is text + code allowlist; `proof_type` / `consent_state` are pgEnums.
- `consent` carries `(proofId, version)` uniqueness + stable ids for T2's
  `derived_asset.consentId` FK + revocation cascade.
- `/styleguide/data` is force-dynamic with a lazy client → CI builds green without `DATABASE_URL`.
- Out of scope (do NOT add): campaigns, brand kits, library, showcase, studio / derived-asset
  tables, auth / real workspaces, capture, R2, Inngest, Resend, any product screen beyond the
  proof-of-path.
