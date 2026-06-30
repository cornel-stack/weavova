# Phase 1 — Data Model: T7.5 Verification basis

All changes are **additive** (migration `0009`, folder `./drizzle`). No change to `proof` columns
(beyond marking `verified` write-frozen — no DDL), `consent`, the token model, or `/c/[token]`.

## New enums

### `basis_strength` (the graded transaction evidence)

| Value | Meaning | Earns stamp? |
|-------|---------|--------------|
| `strong` | system-confirmed transaction from a native connector | yes (at/above bar) |
| `medium` | webhook-evidenced transaction | yes (at/above bar) |
| `weak` | manual merchant assertion / plain link (no confirmation) | **no** (below bar) |

Ordered by evidence quality. The verified bar = `strong` OR `medium` (D3).

### `basis_source` (what produced the basis — "source quality feeds the bar")

| Value | Origin | Typical strength |
|-------|--------|------------------|
| `native` | native connector (deferred Sources track) | `strong` |
| `webhook` | generic webhook payload (T7.4, deferred) | `medium` |
| `manual` | manual link / merchant entry (live today) | `weak` |

## `verification_basis` (extended)

| Column | Type | Null | Change | Notes |
|--------|------|------|--------|-------|
| `id` | uuid PK | no | — | unchanged |
| `proof_id` | uuid → `proof.id` (cascade) | no | — | unchanged |
| `request_id` | uuid → `capture_request.id` (restrict) | **yes** | **DROP NOT NULL** | now optional — native/webhook/seed bases have no capture_request (D2/D5) |
| `consent_captured_at` | timestamptz | no | — | the consent leg, unchanged (T7.2) |
| `transaction_verified_at` | timestamptz | yes | **now written** | the transaction leg "made real"; non-null ⇒ a confirmed transaction (no DDL — already nullable) |
| `source` | `basis_source` | no | **ADD** | default `'manual'` (existing rows are manual link) |
| `strength` | `basis_strength` | no | **ADD** | default `'weak'` (existing rows are below the bar) |
| `transaction_ref` | text | yes | **ADD** | the evidence identifier (order id, payload id, or the merchant assertion when weak) |
| `created_at` | timestamptz | no | — | unchanged |

**Index**: add `verification_basis_proof_idx` on `(proof_id)` to serve the `qualifyingBasisExpr` EXISTS
correlation (mirrors `consent_proof_version_idx`).

**Invariant (enforced in code at write time, D5/D6/D7)**: a `strong`/`medium` basis always carries a
non-null `transaction_verified_at`; a `weak` basis always has it null. The resolver predicate (D3)
re-checks `transaction_verified_at IS NOT NULL` so a malformed row can never over-claim.

## `proof.verified` (retired-in-place, D1)

`boolean NOT NULL default false` — **kept** (additive migration; no DDL), **no longer read** by any
projection, marked write-frozen/internal in `schema.ts`. Verified state is derived through the resolver
only. (Optional future cleanup: drop the column — research.md D1 option B.)

## Resolver state set (presentation, not stored)

`VerificationState` — the single sanctioned read (`src/lib/verification.ts`):

| State | Condition | Surface treatment |
|-------|-----------|-------------------|
| `verified` | effective consent `granted` **AND** a qualifying basis (D3) | persimmon "Verified real customer" stamp (cards + detail) |
| `consent_only` | effective consent `granted` **AND** no qualifying basis | cards: **stamp absence**; detail: quiet "Consent recorded · transaction unconfirmed" label |
| `unverified_no_consent` | effective consent not `granted` (awaiting/revoked) | no stamp, no label; existing consent meta shows awaiting/revoked |

`proofIsVerified(input) === (verificationState(input) === "verified")` — the boolean cards use.

## Entity relationships (unchanged topology)

```
workspace ─< proof ─< consent           (effective = latest version; T7.1)
                  └─< verification_basis  (0..n; the verified evidence — consent leg + transaction leg)
capture_request ─0..1< verification_basis (request_id now optional — link bases only)
```

## Fixture data shape after backfill (D7)

| Fixture set | consent | basis written | resolver |
|-------------|---------|---------------|----------|
| Darnell, Maria, Aisha, Hannah, Greta | granted | `native` / `strong` / `transaction_verified_at` set / `transaction_ref` modelled | `verified` |
| Marcus, Yuki, Caleb, Nadia, Priya | granted | `manual` / `weak` / no confirmed-at | `consent_only` |
| Tom, Sofia, Diego, Owen | awaiting | none (or weak) | `unverified_no_consent` |
| Leo M. | revoked (v2) | none — **even a strong basis stays** `unverified_no_consent` | `unverified_no_consent` |
