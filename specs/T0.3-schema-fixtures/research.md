# Phase 0 — Research: T0.3 Schema and fixtures

Constrained by the locked stack (Neon + Drizzle, NOT Supabase), `FR-015` (only the Neon + Drizzle
stack added), the protected-files rule, and the constitution v1.1.2. No code written here.

---

## R1. Neon driver + transactions

**Decision**: Use **`@neondatabase/serverless`** with **`drizzle-orm/neon-http`** (`neon(url)`) for
the db client and the seed.

- The HTTP driver needs no WebSocket (`ws`) dependency, works in Node and on Edge/Vercel, and is the
  lightest fit for the proof-of-path's simple `SELECT`s.
- The pooled `DATABASE_URL` (Neon `-pooler` host) is used.
- **Transactions**: the HTTP driver has no interactive multi-statement transactions. The seed is a
  **reset-then-insert** script (delete all rows in FK-safe order, then insert) so partial failures
  are recovered by simply re-running — acceptable for fixtures and keeps the dependency set minimal.

**Rationale**: minimal deps (no `ws`), Edge-compatible, sufficient for reads + a reset-seed.
**Alternatives**: `drizzle-orm/neon-serverless` (`Pool`) supports transactions but pulls a WebSocket
dependency (`ws`) in Node — rejected to honor FR-015; `pg`/`postgres` drivers — rejected (not the
Neon serverless driver, heavier for serverless).

## R2. `source` as a TABLE; `kind` as TEXT

**Decision**: Model `source` as a **table** (`id`, `workspaceId`, `kind`, `label`); make `kind`
**text** with a typed `as const` allowlist in code. Keep `proof_type` and `consent_state` as
**Postgres enums**.

- `source` is a table because sources are **workspace-scoped** and become **first-class connected
  integrations at T7** (they will gain credentials, status, etc.); a table is the right home, and
  the ProofCard shows the source **label** (so the label must live somewhere queryable).
- `kind` is **text + an `as const` union** (e.g. `shopify | stripe | instagram | calendly | square |
  …`) because the supported-platform set is **open and growing** — new integrations land at T7+ and
  adding one should not require an `ALTER TYPE` migration. App-level validation (a tuple `includes`
  check) gives integrity at the write boundary without a schema migration per platform.
- `proof_type` (`text|video|photo|audio`) and `consent_state` (`granted|awaiting|revoked`) are
  **closed, stable domains** → Postgres enums, for DB-level integrity.

**Rationale**: closed domains → DB enum; open/growing domain → text + code allowlist. Justifies the
spec's deferred decision (P-XII). **Alternatives**: `source` as a plain enum on `proof` (rejected —
loses workspace scope, label, and the T7 integration home); `kind` as a pgEnum (rejected — migration
per new platform).

## R3. Consent — versioned, revocable, cascade-ready (Principle VII)

**Decision**: `consent` rows are **append-only versions** per proof.

- Columns: `id` (uuid PK), `proofId` (uuid FK → `proof.id`, `onDelete: cascade`), `state` (enum),
  `grantedAt`, `revokedAt` (nullable), `version` (int, increments per proof), `captureContext`
  (jsonb — method/locale/consent-copy version captured at submission), `createdAt`.
- **Effective consent** = the latest version (max `version`, tie-break newest `createdAt`).
- **Revocation** = insert a new version with `state = 'revoked'` and `revokedAt` set — never a
  delete; the history is auditable.
- **Cascade-ready (modelled now)**: `consent.id` is a stable PK that derived assets (T2) will
  reference via `derived_asset.consentId → consent.id`; revoking consent will cascade to mark those
  assets withdrawn. With no derived-asset table yet, the schema **establishes consent as the gate**
  and records the intended FK + cascade in data-model.md so it is expressible without reshaping.
- The Make action is gated on `effective consent === 'granted'` (enforced in the query/UI now;
  enforced structurally on derived assets at T2).

**Rationale**: satisfies "model the cascade in the first migration" (P-VII) without inventing
derived-asset tables out of scope. **Alternatives**: a single mutable `consent` row per proof
(rejected — not versioned/auditable; can't express revocation history).

## R4. Schema ↔ ProofCardProps reconciliation (schema authoritative)

**Decision**: The schema is the single source; `src/lib/proof.ts` derives from it.

- `ProofType = (typeof proofTypeEnum.enumValues)[number]`; `ConsentState` likewise from
  `consentStateEnum`. The enums live in `src/db/schema.ts`.
- `ProofView` is the **flattened** shape the ProofCard consumes — equal field-for-field to the
  current `ProofCardProps`: `{ id, customerName, proofType, quote, transcript, source (label
  string), consentState, thumbnail, capturedAt (ISO string), reviewed, verified }`. It is NOT the
  raw row (`capturedAt` is a `Date` in the row, `source` is a `sourceId`, `consentState` is derived).
- `src/lib/proof.ts` re-exports `ProofType`/`ConsentState` (from schema) and defines `ProofView`;
  `ProofCardProps` becomes `ProofView` (alias) so the **ProofCard component is unchanged**. `proof.ts`
  is a server-side types module (consumed by the RSC ProofCard + queries); the ProofCard imports it
  with `import type`, erased at build, so no server code leaks to a client bundle.

**Rationale**: one source of truth (schema), zero UI rework (P-VI), unchanged component (P-V).
**Alternatives**: keep `proof.ts` hand-written (rejected — two sources, drift); share `as const`
tuples instead of schema enums (rejected — the user asked for schema-authoritative derivation).

## R5. Env + migrations with no extra deps

**Decision**: No `dotenv`/`tsx`.

- `drizzle.config.ts` calls `process.loadEnvFile?.()` (Node 21.7+) to load `.env.local`, then reads
  `process.env.DATABASE_URL`. `drizzle-kit` executes this config, so `generate`/`migrate` get the URL.
- The seed runs via `node --env-file=.env.local src/db/seed.ts` (Node ≥ 20.6 `--env-file`; Node 23+
  strips TS types natively — local Node is 25). Scripts: `db:generate`, `db:migrate`, `db:seed`.
- The **app** gets `DATABASE_URL` from Next.js's automatic `.env.local` loading.
- Migration files are generated into `./drizzle` and **committed**; applying them to Neon is an
  implement-time step that needs the human-provided `DATABASE_URL`.

**Rationale**: keeps deps to exactly `drizzle-orm` + `@neondatabase/serverless` + `drizzle-kit`.
**Alternatives**: `dotenv` + `tsx` (rejected — extra deps; Node natives suffice).

## R6. Dynamic data route + lazy client (CI builds without a DB)

**Decision**: `/styleguide/data/page.tsx` is `export const dynamic = "force-dynamic"`, and the db
client is created lazily (does not connect or throw at import time when `DATABASE_URL` is absent).

- CI has **no `DATABASE_URL`**; a statically-prerendered data page would hit the DB at build and
  fail. `force-dynamic` keeps it out of static generation, so `next build` is green without a DB
  (SC-006) and no secret is needed in CI (SC-007).
- At runtime (with `DATABASE_URL` set), the route reads Neon and renders real ProofCards.

**Rationale**: green CI + secret-free build while still proving the path at runtime.
**Alternatives**: prerender at build (rejected — needs DB + secret in CI); a build-time fixtures
fallback (rejected — defeats the "real persisted record" proof).

## R7. Validation without Zod (this slice)

**Decision**: Zod (P-X's shared-validation tool) is **deferred** to honor FR-015 (only Neon + Drizzle
added). `source.kind` integrity uses a typed `as const` allowlist + an `includes` check at the seed
boundary; an env presence-check throws a clear error if `DATABASE_URL` is missing.

**Rationale**: avoids an off-scope dependency this slice; Zod returns when shared validation is
broadly needed. **Alternatives**: add Zod now (rejected — FR-015).

---

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| Which Neon driver / transactions | `@neondatabase/serverless` + `neon-http`; reset-then-seed (R1) |
| `source` table vs enum; `kind` type | table; `kind` text + code allowlist; proof_type/consent_state enums (R2) |
| Consent versioning + cascade | append-only versions; latest = effective; FK + cascade documented for T2 (R3) |
| Schema ↔ props reconciliation | schema enums + `ProofView`; `proof.ts` derives; ProofCard unchanged (R4) |
| Env + migration tooling | Node `loadEnvFile` / `--env-file`; no dotenv/tsx (R5) |
| CI build without a DB | dynamic data route + lazy client (R6) |
| Validation lib | Zod deferred; typed tuple + checks (R7) |

No blocking `NEEDS CLARIFICATION` remain.
