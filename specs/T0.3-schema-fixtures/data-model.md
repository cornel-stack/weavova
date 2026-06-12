# Phase 1 — Data Model: T0.3

The schema is **authoritative**. `src/lib/proof.ts` derives from it (R4). Lives in
`src/db/schema.ts`; migrations generated into `./drizzle` and committed.

## Enums (Postgres)

```text
proof_type    = text | video | photo | audio
consent_state = granted | awaiting | revoked
```

`source.kind` is **text** (open, growing integration set) with a code-side `as const` allowlist
(`shopify | stripe | instagram | calendly | square | …`) — see research R2.

## Tables

### workspace (tenant)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK (default gen) | |
| name | text not null | |
| slug | text not null, unique | |
| createdAt | timestamptz not null default now() | |

### source (proof origin; first-class integration at T7)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspaceId | uuid not null → workspace.id (onDelete cascade) | workspace-scoped |
| kind | text not null | code-validated allowlist |
| label | text not null | the string the ProofCard shows |
| createdAt | timestamptz not null default now() | |

### proof (the core entity — reconciles ProofCardProps)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | → `ProofView.id` |
| workspaceId | uuid not null → workspace.id (onDelete cascade) | |
| customerName | text not null | |
| proofType | proof_type enum not null | |
| quote | text null | text proofs |
| transcript | text null | media proofs |
| sourceId | uuid not null → source.id (onDelete restrict) | resolved to `source.label` in ProofView |
| capturedAt | timestamptz not null | mapped to ISO string in ProofView |
| reviewed | boolean not null default false | |
| verified | boolean not null default false | |
| thumbnail | text null | media ref; null → neutral placeholder (no R2 yet) |
| createdAt | timestamptz not null default now() | |

### consent (the gate — versioned, revocable, cascade-ready)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | stable; derived assets (T2) will reference this |
| proofId | uuid not null → proof.id (onDelete cascade) | |
| state | consent_state enum not null | |
| grantedAt | timestamptz null | |
| revokedAt | timestamptz null | set on revocation |
| version | integer not null | increments per proof; latest = effective |
| captureContext | jsonb null | method / locale / consent-copy version at submission |
| createdAt | timestamptz not null default now() | |

Suggested index/constraint: unique `(proofId, version)`; index `(proofId, version desc)` for the
latest-version lookup.

## Relations

- `workspace` 1—* `source`, 1—* `proof`.
- `source` 1—* `proof` (via `proof.sourceId`).
- `proof` 1—* `consent` (versions).

## Effective consent (derived, not stored)

`effectiveConsent(proof) = state of the consent row with the greatest version` (tie-break newest
`createdAt`). A proof with **no** consent row is treated as **not granted** (gate fails closed). The
Make action is offered **only** when `effectiveConsent === 'granted'` (Principle VII).

## Cascade design (modelled now, enforced at T2)

When derived assets exist (T2), `derived_asset.consentId → consent.id`. Revoking a proof's consent
(a new `revoked` version) cascades to **withdraw** the derived assets that reference the consent
lineage. T0.3 establishes: (a) consent as a first-class, versioned, stably-keyed entity; (b) the
gate (`effectiveConsent`); (c) the documented FK + cascade so T2 adds it without reshaping. No clip
may ever be generated from proof whose effective consent is not `granted`.

## ProofView (query result — equals ProofCardProps)

Not a table. Assembled by the query layer from a `proof` row + its `source.label` + its effective
`consentState`, with `capturedAt` as an ISO string:

```text
ProofView = {
  id, customerName, proofType, quote, transcript,
  source: string,        // source.label
  consentState,          // effective (latest) consent state
  thumbnail,             // string | null
  capturedAt,            // ISO string
  reviewed, verified,
}
```

`ProofType` / `ConsentState` derive from the schema enums; `ProofView` is what `src/lib/proof.ts`
exports (and what `ProofCardProps` aliases) so the ProofCard is unchanged.
