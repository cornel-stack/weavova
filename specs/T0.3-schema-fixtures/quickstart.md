# Quickstart — Validate T0.3

Runnable validation, each scenario mapped to a Success Criterion. Run after `/speckit.implement`.

## Prerequisites

- A Neon Postgres project; a pooled `DATABASE_URL` placed in `.env.local` (un-committed). Deps
  installed (`npm install`) including `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`.

## 1. Generate + apply migrations to Neon — SC-001 (US1)

```bash
npm run db:generate    # drizzle-kit generate → ./drizzle/*.sql (committed)
npm run db:migrate     # drizzle-kit migrate → applies to Neon
```

**Expect**: no error; `workspace`, `source`, `proof`, `consent` tables and the `proof_type` /
`consent_state` enums are visible in the Neon dashboard. A fresh checkout re-applies the committed
migrations identically.

## 2. Types agree — SC-002

```bash
npm run typecheck
```

**Expect**: exit 0. `src/lib/proof.ts` derives `ProofType`/`ConsentState` from the schema enums and
`ProofView` equals `ProofCardProps`; the ProofCard is unchanged.

## 3. Seed ~15 fixtures — SC-003 (US2)

```bash
npm run db:seed
```

**Expect**: ~15 proofs across all four proof types and all three consent states, each with a consent
record and a source, under one demo workspace; no real people; re-running does not duplicate/err.

## 4. Consent gates Make — SC-004

In the data the latest consent of some proofs is `awaiting`/`revoked`. Confirm (in the query result
or on the page) those proofs do **not** offer "Make"; `granted` ones do.

## 5. Real ProofCards from Neon — SC-005 (US3)

```bash
npm run dev
# open http://localhost:3000/styleguide/data
```

**Expect**: real ProofCards read from Neon via `getProofs()`, rendered with the unchanged T0.2
ProofCard, visually equivalent to the hardcoded cards (proof-forward, consent dot by state, gated
Make) in both themes. Not linked from the landing.

## 6. Green gates + CI without a DB — SC-006

```bash
npm run typecheck && npm run lint && npm run build
```

**Expect**: all exit 0. The `/styleguide/data` route is dynamic and the db client is lazy, so
`next build` and CI are green **without** a `DATABASE_URL`.

## 7. Secrets not committed — SC-007

```bash
git check-ignore .env.local        # → matched (.env*)
git ls-files | grep -E '\.env' || echo "no env files tracked"
```

**Expect**: `.env.local` ignored; no env/secret file tracked. `.env.example` (names only, no value)
may be committed.

## 8. No off-stack dependency — SC-008

Only `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit` added beyond the existing stack.

## Definition of done

Schema applied to Neon · types agree (no UI rework) · ~15 fixtures with consent · consent gates Make
· `/styleguide/data` renders real cards matching T0.2 · typecheck/lint/build + CI green · secrets
un-committed · protected files preserved.
