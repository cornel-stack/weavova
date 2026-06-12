# Implementation Plan: T0.3 — Database schema and fixtures dataset (Neon + Drizzle)

**Branch**: `T0.3-schema-fixtures` | **Date**: 2026-06-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T0.3-schema-fixtures/spec.md`

> **PLANNING ONLY GUARD (this command).** This document is the technical plan. No schema/migration/
> seed code is written, nothing is scaffolded or installed, and the database is not touched by this
> command. Execution happens in `/speckit.tasks` → `/speckit.implement`, only after human approval.

**Precondition verified**: `main` already contains the T0.2 design system (ProofCard, theme
provider, UI components, `src/lib/proof.ts`, constitution v1.1.2, `next-themes` + `lucide-react`).
This branch (`T0.3-schema-fixtures`) was created from `main`.

## Summary

Make the `proof` entity real. Wire **Drizzle ORM + drizzle-kit** to **Neon Postgres** via a pooled
`DATABASE_URL` using the **`@neondatabase/serverless`** driver; write the authoritative schema —
`workspace`, `source` (a table), `proof`, `consent` (versioned, revocable, cascade-ready) — generate
and apply migrations to Neon; reconcile `src/lib/proof.ts` to **derive from the schema** (inferred
types + schema enums); seed **~15 realistic fixtures** (each with a consent record); expose a typed
query layer (`getProofs` / `getProof`) returning the flattened **`ProofView`** the ProofCard
consumes; and prove the path on an internal **`/styleguide/data`** route that renders real
ProofCards from Neon, visually identical to the hardcoded T0.2 cards.

Only the Neon + Drizzle stack is added (`drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`).
Node 25's native `--env-file` and TypeScript stripping run the seed and load env with **no extra
tooling deps** (no `tsx`, `dotenv`, or `ws`). The data route is **dynamic** so CI builds green
without a database.

## Technical Context

**Language/Version**: TypeScript 5.x strict; React 19; Next.js 15 (App Router); Node 20 (CI runtime)
/ Node 25 locally (used for `--env-file` + TS stripping in the seed).

**Primary Dependencies**: Next.js 15, Tailwind v4 (from T0.2). **New (locked stack — Neon +
Drizzle)**: `drizzle-orm`, `@neondatabase/serverless` (deps); `drizzle-kit` (devDep). No other
dependency. **Zod is deliberately NOT added in this slice** (FR-015 limits deps to Neon + Drizzle);
the small `source.kind` allowlist and an env presence-check use a plain `as const` tuple + check.

**Storage**: Neon Postgres (pooled `DATABASE_URL`), accessed via Drizzle over the Neon HTTP driver.

**Testing**: No unit-test framework (tests optional per spec); verification via `drizzle-kit`
generate/migrate against Neon, the seed, `getProofs` rendering on `/styleguide/data`, and
typecheck/lint/build + CI.

**Target Platform**: Vercel (the data route is a dynamic Server Component); Neon for data.

**Project Type**: Web application — single Next.js app at repo root.

**Performance Goals**: Not a focus; the proof-of-path reads ~15 rows.

**Constraints**: Drizzle only (no raw SQL outside migrations); schema authoritative; secrets only in
the un-committed env file (`.env*` already git-ignored); consent versioned/revocable/cascade-ready
from the first migration; preserve `CLAUDE.md` (marker only), `design-reference/`, `docs/`,
`.specify/`; the ProofCard component is **unchanged**.

**Scale/Scope**: 4 tables + 2 enums, one db client, one query module, one seed, one internal route.

## Constitution Check

*GATE: evaluated against `.specify/memory/constitution.md` **v1.1.2**. Re-check after design.*

| Gate (principle) | Verdict | Justification |
|---|---|---|
| Locked stack (P-III) | PASS | Neon Postgres + Drizzle ORM + drizzle-kit via `@neondatabase/serverless` and a pooled `DATABASE_URL` — explicitly NOT Supabase. No off-stack dep (FR-015); Zod deferred. |
| Customer is the headline / Port (P-II, P-V) | PASS | The proof-of-path reuses the **unchanged** T0.2 ProofCard; real data renders proof-forward, no redesign. |
| Fixtures-first (P-VI) | PASS | Schema written before screens read real data; the fixture shape is the contract; `src/lib/proof.ts` derives from the schema (schema authoritative) so T7 real data needs no UI rework. |
| Consent is sacred (P-VII) | PASS | `consent` is versioned, revocable, and **cascade-ready in the first migration**; effective state gates "Make"; the FK shape for derived-asset cascade (T2) is documented. No clip from non-consented proof. |
| Coding conventions (P-X) | PASS | Drizzle only (no raw SQL outside migrations); kebab-case files; TS strict; server-side data access; no `localStorage`/`sessionStorage`. Zod (P-X's shared-validation tool) is sanctioned but deferred here per FR-015; a typed tuple covers `source.kind`. |
| Never-do (P-XI) | PASS | Fixtures use neutral placeholders / no real people; secrets never committed; `/design-reference` and `/docs` untouched; no features beyond the slice. |
| Ambiguity handling (P-XII) | PASS | `source` modelled as a table (justified); `kind` as text (justified — open, growing integration set); schema-vs-props reconciliation explicit (schema authoritative). |

**Result: PASS.** No violations. One build-correctness note (not a violation): the `/styleguide/data`
route MUST be dynamic and the db client lazy, so CI builds green without a `DATABASE_URL` (see
research R7). Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/T0.3-schema-fixtures/
├── spec.md
├── plan.md              # this file
├── research.md          # driver/transactions, source modelling, consent cascade, env, dynamic route
├── data-model.md        # workspace / source / proof / consent + enums + ProofView + cascade
├── quickstart.md        # generate → migrate(Neon) → seed → /styleguide/data → gates
└── contracts/
    ├── db-queries.md     # getProofs / getProof signatures + ProofView (= ProofCardProps)
    └── seed.md           # the ~15-fixture dataset contract
```

### Source Code (repository root) — PLANNED, created later by /speckit.implement

```text
drizzle.config.ts                  # NEW — dialect postgresql; schema/out paths; DATABASE_URL
drizzle/                           # NEW — generated migrations (COMMITTED) + meta/
src/
├── db/
│   ├── schema.ts                  # NEW — pgEnums (proof_type, consent_state) + workspace/source/
│   │                              #   proof/consent tables + relations
│   ├── client.ts                  # NEW — drizzle(neon(DATABASE_URL)); lazy; server-only
│   ├── queries.ts                 # NEW — getProofs()/getProof(id) → ProofView (Drizzle only)
│   └── seed.ts                    # NEW — demo workspace + sources + ~15 proofs + consent
├── lib/
│   └── proof.ts                   # EDIT — derive ProofType/ConsentState/ProofView from schema
└── app/
    └── styleguide/
        └── data/
            └── page.tsx           # NEW — proof-of-path: real ProofCards from Neon (force-dynamic)
.env.example                       # NEW — documents DATABASE_URL (no value)
package.json                       # EDIT — add deps + db:generate / db:migrate / db:seed scripts
CLAUDE.md                          # marker block only → this plan
```

**Structure Decision**: data layer under `src/db/` (schema/client/queries/seed); the schema is the
single source of truth and `src/lib/proof.ts` derives from it. The ProofCard and the rest of T0.2
are untouched. The proof-of-path is a dedicated dynamic route so the hardcoded T0.2 styleguide and
the real-data render can be compared, and so CI builds without a DB.

## Phase 0 — Outline & Research

See [research.md](./research.md):

1. **Driver + transactions** — `@neondatabase/serverless` HTTP driver via `drizzle-orm/neon-http`
   for the app/seed (no `ws` dep, Edge-friendly); seed uses reset-then-insert (idempotent) since
   HTTP has no interactive transactions.
2. **`source` as a table; `kind` as text** — justified (open, growing integration set; avoids a
   migration per new platform) with a typed `as const` allowlist in code; `proof_type` and
   `consent_state` are closed sets → Postgres enums.
3. **Consent: versioned, revocable, cascade-ready** — multiple versions per proof; effective =
   latest; revocation is a new `revoked` version; the derived-asset → consent FK + cascade is
   documented for T2.
4. **Schema ↔ ProofCardProps reconciliation** — `ProofType`/`ConsentState` from schema enums;
   `ProofView` (flattened) = the existing props shape; `getProofs` maps row + source label + latest
   consent + ISO date.
5. **Env + migrations without extra deps** — Node 25 `process.loadEnvFile()` in `drizzle.config.ts`;
   `node --env-file=.env.local` for the seed; Next loads `.env.local` for the app.
6. **Dynamic data route + lazy client** — `/styleguide/data` is `force-dynamic` and the db client is
   lazy, so CI builds green without `DATABASE_URL`.

**Output**: research.md with decisions, rationale, alternatives.

## Phase 1 — Design & Contracts

- **Data model** → [data-model.md](./data-model.md): the four tables, two enums, relations,
  effective-consent rule, and the cascade design.
- **Contracts** → `contracts/`:
  - `db-queries.md` — `getProofs()` / `getProof(id)` signatures and the `ProofView` type
    (equal to the T0.2 `ProofCardProps`), with the reconciliation rule.
  - `seed.md` — the ~15-fixture dataset contract (distribution, realism, neutral placeholders,
    re-runnable).
- **Quickstart** → [quickstart.md](./quickstart.md): generate → migrate (Neon) → seed →
  `/styleguide/data` → gates, mapped to SC-001..SC-008.
- **Agent context**: the `CLAUDE.md` SPECKIT marker block is updated to point at this plan.

**Output**: data-model.md, contracts/*, quickstart.md, updated CLAUDE.md marker.

## Phase 2 — Task planning approach (NOT executed here)

`/speckit.tasks` will decompose into one-commit-sized tasks, expected to group as: (1) Setup —
install `drizzle-orm` + `@neondatabase/serverless` + `drizzle-kit`, `drizzle.config.ts`, db client,
`.env.example`, scripts; (2) Foundational/Schema — `schema.ts` (enums + 4 tables + relations),
reconcile `src/lib/proof.ts`, generate + apply the first migration to Neon (committed); (3) US1 —
schema/migrations proven in Neon; (4) US2 — the typed query layer + the ~15-fixture seed (+ consent)
and re-runnable; (5) US3 — `/styleguide/data` rendering real ProofCards; (6) Polish/DoD —
typecheck/lint/build green, CI green, secrets-not-committed check, protected-files check,
consent-gating check. No tasks are produced by this command.

## Complexity Tracking

No constitution violations — this section is intentionally empty. The dynamic-route / lazy-client
note under the Constitution Check is a build-correctness measure, not added complexity.
