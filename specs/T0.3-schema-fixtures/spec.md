# Feature Specification: T0.3 — Database schema and fixtures dataset (Neon + Drizzle)

**Feature Branch**: `T0.3-schema-fixtures`

**Created**: 2026-06-13

**Status**: Draft

**Input**: User description: "Slice T0.3 — The database schema and the fixtures dataset (Neon + Drizzle). Write the real Postgres schema for the proof entity and seed ~15 fixtures shaped EXACTLY like it, so the fixture shape becomes the contract every screen reads."

## Overview

This is the **contract slice**. It turns the T0.2 ProofCard props type (`src/lib/proof.ts`) — until
now a UI guess — into the **real `proof` entity** backed by Neon Postgres via Drizzle. We write the
schema, generate and apply migrations to Neon, seed ~15 realistic fixtures (each with a consent
record), expose a typed query layer, and prove the path end-to-end by rendering real ProofCards read
from Neon on an internal route, visually identical to the hardcoded T0.2 cards.

**Fixtures-first (Principle VI):** the fixture shape becomes the contract every later screen reads.
The whole app is built on this shape, so when real capture lands at T7 the data fills the same shape
with **no UI rework**. **Consent (Principle VII)** is modelled as versioned, revocable, and
cascade-ready from the first migration — even though derived assets don't exist yet, consent is the
gate.

This slice introduces no auth and no real workspaces (a single demo workspace seeds the data); those
arrive at T6.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The proof entity exists in Neon (Priority: P1)

A developer runs the migration tooling and the real schema — `workspace`, `source`, `proof`,
`consent` — is created in Neon. The schema is the authoritative shape; the T0.2 ProofCard props type
is reconciled to it.

**Why this priority**: Without the persisted schema there is no contract. This is the foundation the
rest of the slice (fixtures, queries, render) depends on, and the artifact every later screen reads.

**Independent Test**: Run `drizzle-kit generate` then the migration apply against Neon; confirm the
tables exist in the Neon dashboard and a fresh checkout can re-apply the committed migrations with no
error.

**Acceptance Scenarios**:

1. **Given** a configured `DATABASE_URL` (pooled Neon), **When** the developer generates and applies
   migrations, **Then** the `workspace`, `source`, `proof`, and `consent` tables (and the
   `proof_type` / `consent_state` enums) are created with no error and are visible in Neon.
2. **Given** the committed migration files, **When** a fresh environment applies them, **Then** the
   schema is reproduced identically (migrations are committed and replayable).
3. **Given** the schema, **When** the developer inspects the types, **Then** the `proof` row type
   and the ProofCard props type agree — one derived from the other — with no shape mismatch.

---

### User Story 2 - ~15 realistic fixtures, each with consent (Priority: P1)

A developer runs the seed script and ~15 high-quality, on-brand fixture proofs are inserted across
the proof types, consent states, and sources — each with its own consent record.

**Why this priority**: The fixtures ARE the contract dataset the whole app is built and demoed on.
They must be realistic (real-sounding customer words, not lorem) and cover the states the UI must
handle, including consent gating.

**Independent Test**: Run the seed; query the database and confirm ~15 proofs exist spanning all
four proof types and all three consent states, each linked to a consent record and a source, with no
real identifiable people (neutral placeholders for media).

**Acceptance Scenarios**:

1. **Given** an empty (or re-seedable) database, **When** the developer runs the seed script,
   **Then** ~15 proofs are inserted across `text`/`video`/`photo`/`audio` and
   `granted`/`awaiting`/`revoked`, each with a consent record and a source.
2. **Given** the seeded data, **When** a proof's latest consent state is not `granted`, **Then** the
   effective consent gate reflects that (the UI must not offer to make a clip from it).
3. **Given** the seed runs twice, **When** re-run, **Then** it does not duplicate or error
   (idempotent / re-seedable).

---

### User Story 3 - Real ProofCards rendered from Neon (the proof-of-path) (Priority: P1)

A developer opens an internal route that reads real proofs from Neon through the typed query layer
and renders them with the existing T0.2 ProofCard — visually identical to the hardcoded cards.

**Why this priority**: This is the "one persisted record rendered" proof that the contract holds
end-to-end: schema → query → the same component → pixel-identical output. It is the acceptance that
real data needs no UI rework.

**Independent Test**: Open the internal proof-of-path route; confirm the cards are read from Neon
(not hardcoded), render with the T0.2 ProofCard, and match the hardcoded cards' appearance
(proof-forward, consent dot by state, Make only when granted) in both themes.

**Acceptance Scenarios**:

1. **Given** seeded data, **When** the developer opens the internal proof-of-path route, **Then**
   real ProofCards are rendered from Neon via the typed query, using the unchanged T0.2 ProofCard.
2. **Given** a proof whose latest consent is `granted`, **When** its card renders, **Then** the
   hover "Make" action appears; **Given** `awaiting`/`revoked`, **Then** it does not.
3. **Given** the same data, **When** compared to the hardcoded T0.2 cards, **Then** the real cards
   are visually equivalent (no redesign, no shape mismatch).

---

### Edge Cases

- **No consent record / missing consent**: a proof with no consent record is treated as not granted
  (the gate fails closed); the schema should make a consent record the expectation for every proof.
- **Multiple consent versions**: the effective state is the latest version (highest `version` /
  newest timestamp); a revocation is a new version with state `revoked`, not a deletion (consent is
  versioned and auditable).
- **Revocation cascade (modelled now)**: derived assets (built at T2) will reference consent;
  revoking a proof's consent must be able to cascade to withdraw those assets. With no derived
  assets yet, the schema must still establish consent as the first-class gate and the FK shape that
  makes the cascade expressible.
- **Null proof body**: a `text` proof has `quote` but null `transcript`; a media proof has
  `transcript` but may have null `quote`; the UI already handles null.
- **Media without thumbnail**: `thumbnail` is null → the ProofCard shows a neutral placeholder (no
  real person).
- **Enum integrity**: `proofType` and `consentState` are constrained to their allowed values at the
  database level (Postgres enums), so invalid values cannot be inserted.
- **Secrets**: `DATABASE_URL` (and any other secret) lives only in an un-committed env file.

## Requirements *(mandatory)*

### Database wiring

- **FR-001**: The project MUST wire **Drizzle ORM + drizzle-kit** to **Neon Postgres** via a
  `DATABASE_URL` (pooled connection): a drizzle config, a typed db client module, and the migration
  setup. (Neon + Drizzle per the locked stack — NOT Supabase.)
- **FR-002**: `DATABASE_URL` and all secrets MUST be read from an env file that is **not committed**
  (covered by the existing `.gitignore` `.env*`); an example env file MAY document the variable
  name without a value.

### Schema — core proof model (schema is authoritative)

- **FR-003**: A `workspace` table MUST exist (the tenant a proof belongs to): `id`, `name`, `slug`,
  `createdAt`. Minimal for now; real workspaces/auth arrive at T6.
- **FR-004**: A `source` table MUST exist (the origin of a proof — Shopify, Stripe, Instagram,
  Calendly, Square, etc.): `id`, `workspaceId`, `kind`, `label`. (Whether `kind` is a Postgres enum
  or text, and whether `source` is a table vs a plain enum on `proof`, is a plan decision to be
  justified — see Assumptions.)
- **FR-005**: A `proof` table MUST exist with at least: `id`, `workspaceId`, `customerName`,
  `proofType` (Postgres enum: `text` | `video` | `photo` | `audio`), `quote` (nullable),
  `transcript` (nullable), a reference to its `source`, `capturedAt`, `reviewed` (boolean),
  `verified` (boolean), `thumbnail` (nullable ref), and `createdAt`.
- **FR-006**: The `proof` schema MUST be shaped so the T0.2 ProofCard props type is satisfied
  **without change to the rendered shape**. The two MUST be reconciled with the **schema
  authoritative**: `src/lib/proof.ts` is updated to derive from the schema (e.g. inferred row types
  and schema-defined enums) so there is a single source of truth.

### Consent — versioned, revocable, cascade-ready (Principle VII)

- **FR-007**: A `consent` table MUST exist, linked to `proof`: `id`, `proofId`, `state` (Postgres
  enum: `granted` | `awaiting` | `revoked`), `grantedAt`, `revokedAt`, `version`, and capture
  context. Consent MUST be **versioned** (a revocation is a new version, not a delete) and
  **revocable**.
- **FR-008**: The schema MUST model the **cascade** from the first migration: derived assets (built
  later) will reference consent such that revoking a proof's consent can cascade to withdraw them.
  Even with no derived assets yet, the schema MUST establish consent as the gate and the FK shape
  that makes the cascade expressible. A clip MUST never be generatable from proof whose effective
  consent is not `granted`.
- **FR-009**: The **effective consent state** of a proof MUST be derivable as the latest consent
  version; the query layer surfaces it as the `consentState` the ProofCard consumes.

### Migrations

- **FR-010**: Migrations MUST be **generated via drizzle-kit and applied to Neon** with no error,
  and the migration files MUST be **committed** to the repo.

### Seed / fixtures

- **FR-011**: A seed script MUST insert **~15 high-quality fixture proofs** spanning all four proof
  types, all three consent states, and several sources — each with its own consent record and a
  demo workspace. Customer words MUST be realistic and on-brand (no lorem). Media MUST use
  **neutral placeholders**; no real identifiable people.
- **FR-012**: The seed MUST be **re-runnable** (idempotent or reset-then-seed) without duplicating
  rows or erroring.

### Query layer

- **FR-013**: A **typed query layer** (e.g. `getProofs` / `getProof`) MUST return the shape the
  ProofCard consumes (the `ProofView`): proof fields + resolved `source` label + effective
  `consentState`. Data access MUST use **Drizzle only** (no raw SQL outside migrations).

### Proof-of-path

- **FR-014**: An **internal route** (a section of `/styleguide`, or `/styleguide/data`) MUST render
  a few **real** ProofCards read from Neon via the typed query, using the **unchanged T0.2
  ProofCard** component, visually equivalent to the hardcoded cards. It MUST NOT be linked from the
  public landing.

### Scope guards

- **FR-015**: The only new dependencies MUST be the Neon + Drizzle stack (`drizzle-orm`,
  `drizzle-kit`, and the Neon driver); no dependency outside the locked stack.
- **FR-016**: This slice MUST NOT build campaigns, brand kits, library, showcase, the studio /
  derived-asset tables, auth / real workspaces, capture, R2, Inngest, Resend, or any product screen
  beyond the styleguide proof-of-path.

### Key Entities *(data model)*

- **workspace**: the tenant. `id`, `name`, `slug`, `createdAt`. A proof belongs to one workspace.
- **source**: a proof's origin. `id`, `workspaceId`, `kind` (e.g. shopify/stripe/instagram/
  calendly/square), `label` (the display string the ProofCard shows). Belongs to a workspace; a
  proof references one source.
- **proof**: the core entity (reconciles the T0.2 ProofCard props type). `id`, `workspaceId`,
  `customerName`, `proofType` (`text`|`video`|`photo`|`audio`), `quote?`, `transcript?`,
  `sourceId`, `capturedAt`, `reviewed`, `verified`, `thumbnail?`, `createdAt`. Has many consent
  versions; the latest is its effective consent.
- **consent**: the gate. `id`, `proofId`, `state` (`granted`|`awaiting`|`revoked`), `grantedAt?`,
  `revokedAt?`, `version`, capture context, `createdAt`. Versioned and revocable; future derived
  assets reference it so revocation cascades.
- **ProofView** (not a table — the query result): the flattened shape the ProofCard consumes,
  equal to the T0.2 ProofCard props type (`source` resolved to the label, `consentState` = latest
  consent state).

## Success Criteria *(mandatory)*

- **SC-001**: drizzle-kit generates and applies migrations to Neon with no error; the schema
  (`workspace`, `source`, `proof`, `consent` + enums) is visible in the Neon dashboard.
- **SC-002**: The `proof` schema and the T0.2 ProofCard props type agree (one derived from the
  other); rendering real data needs **no UI rework**.
- **SC-003**: ~15 fixtures seed cleanly; each proof has a consent record and a source; the data
  spans all four proof types and all three consent states.
- **SC-004**: Consent state gates the Make action — a proof whose latest consent is not `granted`
  does not offer "Make".
- **SC-005**: The internal proof-of-path route renders real ProofCards from Neon that match the
  hardcoded T0.2 cards (proof-forward, consent dot, gated Make) in both themes.
- **SC-006**: typecheck, lint, and build pass with zero errors; CI is green.
- **SC-007**: `DATABASE_URL` and other secrets are **not committed** to the repo.
- **SC-008**: No dependency outside the locked stack (Neon + Drizzle + Neon driver) is added.

## Constitution Alignment *(mandatory)*

- **Locked stack (P-III)**: Neon Postgres + Drizzle ORM + drizzle-kit migrations, via the Neon
  driver and a pooled `DATABASE_URL` — explicitly **not Supabase Auth/DB**. No off-stack
  dependency (FR-015).
- **Fixtures-first (P-VI)**: This slice writes the schema *before* the screens that read it become
  real, and makes the fixture shape the contract. The T0.2 ProofCard props type is reconciled to the
  schema (schema authoritative), so the eventual real-capture data (T7) fills the same shape with no
  UI rework.
- **Consent is sacred (P-VII)**: Consent is modelled versioned, revocable, and **cascade-ready from
  the first migration**; the effective consent state gates the Make action; a clip can never be
  generated from non-consented proof. Derived-asset tables (T2) will carry the consent FK so
  revocation cascades.
- **Customer is the headline / Port (P-II, P-V)**: The proof-of-path reuses the **unchanged** T0.2
  ProofCard — no redesign — so real data renders proof-forward exactly as the ported clipping.
- **Coding conventions (P-X)**: Drizzle only (no raw SQL outside migrations); kebab-case files;
  TypeScript strict; Zod MAY validate the env/seed inputs (shared validation); Server-side data
  access; no `localStorage`/`sessionStorage`.
- **Never-do (P-XI)**: Fixtures use neutral placeholders and no real identifiable people; secrets
  are never committed; `/design-reference` and `/docs` untouched; no features beyond this slice.
- **Ambiguity handling (P-XII)**: The `source`-as-table vs Postgres-enum decision is deferred to the
  plan with a justification (see Assumptions); the schema-vs-props reconciliation is made explicit
  (schema authoritative).

## Assumptions

- **Neon provisioning**: a Neon Postgres project exists (or the human provisions one) and a pooled
  `DATABASE_URL` is supplied via an un-committed env file at implement time. Generating/applying
  migrations and seeding touch the real database (out of scope for this spec; done at implement).
- **Neon driver**: the Neon serverless/pooled driver (e.g. `@neondatabase/serverless`) is used with
  the pooled connection string; this is part of the locked Neon + Drizzle stack, not a new
  dependency class.
- **Single demo workspace**: with no auth yet, the seed creates one demo workspace (and a handful of
  sources) to own the proofs; real workspaces/auth are T6.
- **source representation**: modelled as a `source` table (id, workspaceId, kind, label) per the
  scope, because the ProofCard shows a source *label* and sources are workspace-scoped. The plan
  will confirm whether `kind` is a Postgres enum, and may justify collapsing `source` to an enum if
  simpler — but the ProofCard's `source: string` (the label) stays unchanged either way.
- **ProofView vs row**: the ProofCard consumes a flattened `ProofView` assembled by the query layer
  (proof row + resolved source label + effective consent state). The raw `proof` row does not carry
  `consentState` or a source string; those are joined/derived. `ProofType` and `ConsentState`
  become schema-defined (Postgres enums) and `src/lib/proof.ts` derives its types from the schema.
- **thumbnail**: a nullable string reference (no R2 yet); fixtures leave it null and the ProofCard
  renders a neutral placeholder.
- **Effective consent**: derived as the latest consent version (by `version`/timestamp); a proof
  always seeds with at least one consent record so the gate is explicit.
- **capturedAt as ISO**: stored as a timestamp; the query maps it to the ISO string the ProofCard
  expects, preserving the existing prop shape.
- **Proof-of-path placement**: a dedicated internal route (`/styleguide/data`) is preferred so the
  hardcoded T0.2 section and the real-data section can be compared side by side; not linked from the
  public landing.
