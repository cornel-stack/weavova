# Phase 0 Research — Scoped consent model

All decisions below are grounded in the existing code (`src/db/schema.ts`, `src/db/queries.ts`,
`src/db/seed.ts`) and the locked stack (P-III). No NEEDS CLARIFICATION remain — Q1 (workspace default
home) was resolved by the human (Option A); the one new decision (column nullability + backfill) is
decided here, not guessed.

## R1 — Where does `ConsentDisplay` land? (the crux)

**Decision criterion (from the task, restated):** `useScope` MUST be queryable as a clean scope gate —
T9 must filter "clips whose consent grants scope X" **without unpacking a jsonb blob per row**.

- **Decision**: typed columns throughout — `useScope` as a **`consent_scope[]` enum-array** column with a
  **GIN index**; `nameDisplay` as a **`name_display` enum** column; `showFace` as a **boolean** column.
  Workspace defaults as `default_name_display` enum + `default_show_face` boolean on the `workspace` row.
- **Rationale**:
  - Array containment (`@>` / `&&`) is a **single indexed predicate** — the fails-closed gate is a clean
    correlated subselect (D4), identical in shape to the existing `effectiveConsentGranted`. A `jsonb`
    blob would force a per-row JSON extraction, exactly what the criterion forbids.
  - An **enum** array (not `text[]`) keeps the domain closed — "unknown scope value" is unrepresentable
    at write time (FR-012), and it mirrors the established `consentStateEnum` / `clipFormatEnum` idiom.
  - `nameDisplay` / `showFace` are **presentation-only** (never gated or filtered), so they need no
    queryable shape; typed columns are still the smallest, most honest representation and avoid any
    jsonb at all.
- **Alternatives considered**:
  - **All in `jsonb`** (extend `consent.captureContext` or a new `consent_display` jsonb): rejected —
    fails the gate criterion (JSON scan per row); GIN-on-jsonb is possible but heavier and the path
    expression is clumsier than enum-array containment; loses enum domain-closure.
  - **`jsonb` for display + enum-array for scope (a split)**: viable but **unnecessary** — `nameDisplay`/
    `showFace` are two trivially-typed values; a jsonb wrapper buys nothing and adds a parse. Since no
    split is taken, no split needs justifying (per the task's "if you propose a split, justify it").
  - **A `consent_scope` junction table** (`consentId, scope`): most normalized and trivially indexable,
    but heaviest — an extra table + joins for a tiny closed set, and the seed/backfill grows. The
    enum-array gives the same indexed gate with no join. Rejected as over-engineering (P-IX).

## R2 — GIN-indexed enum-array containment + Drizzle viability

- **Decision**: use Drizzle `pgEnum(...).array()` for the column and a GIN index via the table's index
  builder (`index("consent_use_scope_gin").using("gin", t.useScope)`).
- **Rationale**: Postgres array containment operators (`@>`, `&&`) are GIN-indexable; Drizzle supports
  enum arrays and `.using("gin", …)`. The existing schema already uses `pgEnum` and the index builder
  (e.g. `consent_proof_version_idx`), so this is in-idiom and in-stack — **no new dependency**.
- **Note**: the gate's correlated subselect picks the latest version first (`order by version desc limit
  1`) and the GIN index serves the `@>` containment within that row; the dominant access path is the
  existing `(proofId, version desc)` index for latest-version selection, with GIN assisting containment
  filters at scale.

## R3 — `use_scope` nullability: `NOT NULL DEFAULT '{}'` vs nullable

- **Decision**: `use_scope consent_scope[] NOT NULL DEFAULT '{}'`. Display columns
  (`name_display`, `show_face`) **nullable** (fallback chain handles null).
- **Rationale**:
  - An **empty array is the correct fail-closed baseline** — it "permits nothing," exactly what an
    un-granted row should mean; `@>` on `'{}'` is always `false`. `NOT NULL` keeps the gate SQL free of
    NULL-array handling.
  - Existing rows get `'{}'` on ALTER, then the backfill (R5) promotes **granted** ones to full scope.
    There is **no behavioural window** because no current consumer reads `use_scope` (all gate on
    `state`); the column is inert until T7.2/T9.
  - Display fields are presentation-only and legitimately "unset" until a customer/workspace chooses, so
    nullable + a resolved fallback (R4) is the honest model — no misleading default value stored.

## R4 — The built-in workspace display-default fallback

- **Decision**: when a workspace's `default_name_display` / `default_show_face` are null, the resolver
  falls back to a code constant **`{ nameDisplay: 'first_initial', showFace: true }`**. The demo
  workspace is seeded with these explicit values.
- **Rationale**: `first_initial` + face-shown is a **privacy-forward but usable** default for **new**
  captures (T7.2) — it leans toward the customer's privacy without erasing them. This is distinct from
  the **existing rows'** backfill (`full` / true), which preserves today's verbatim presentation; the two
  serve different populations (future captures vs. already-shown demo data) and are intentionally
  different (R5). Resolution must **never error** on a missing workspace default — the constant
  guarantees that.
- **Alternative**: `full` as the fallback (match existing rows) — rejected: a workspace-level default of
  "show the full name" is a *less* privacy-forward default for brand-new customers than the product
  should ship; `first_initial` is the safer baseline the customer can always make more private.

## R5 — Backfill idempotency on the shared prod DB

- **Decision**: two coordinated, idempotent paths — (a) an in-migration `UPDATE` for already-deployed
  rows, guarded so a re-run is a no-op; (b) inline field-writes in `seed.ts` (which already wipes +
  re-inserts).
- **Rationale**:
  - The shared DB may be migrated **without** an immediate reseed, so prod's existing granted rows must
    be promoted to full scope by the migration itself — guarded by `WHERE state='granted' AND
    use_scope='{}'` (granted-only, not-already-backfilled) so it is **idempotent** and never double-applies.
  - The display backfill `WHERE name_display IS NULL` is likewise idempotent.
  - The seed path writes the same values inline, so a fresh reseed and a migrate-only prod converge on
    identical, coherent data.
- **Honesty (P-XIV)**: the backfill restores the **full-trust behaviour the fixtures already had**
  (granted == usable everywhere). It is the honest equivalent of prior behaviour, not an invented grant.

## R6 — Privacy ordering (for the one-directional resolver)

- **Decision**: `nameDisplay` privacy rank `full(0) < first_initial(1) < anonymous(2)`; `showFace`
  rank `true(0) < false(1)`. The resolver takes, per field, the **more-private** of (workspace default,
  customer override).
- **Rationale**: this encodes FR-005 directly — the override can only **raise** privacy; a less-private
  override is clamped to the default; the customer is **never recorded as less private than they chose**,
  and is always free to be more private than the workspace default. The ordering is total and obvious,
  so the clamp is unambiguous and unit-checkable.

## R7 — `getGrantedConsentId` return widening (byte-stability)

- **Decision**: widen the return object additively to `{ consentId, useScope, nameDisplay, showFace }`.
- **Rationale**: callers destructure `.consentId` (the generate gate; `recordConsentWithdrawal`); adding
  fields to the returned object is non-breaking and gives the generate path / verified bar the effective
  payload later. TypeScript-strict callers reading only `.consentId` compile unchanged.
