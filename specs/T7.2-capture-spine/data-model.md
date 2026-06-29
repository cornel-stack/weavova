# Phase 1 Data Model — Capture spine + request primitive

Additive only. Existing tables/columns unchanged. Migration `0006`.

## New enum (`src/db/schema.ts`)

```text
capture_request_status : 'open' | 'used' | 'expired'
```

## New table — `capture_request`

| Column | Type | Null? | Notes |
|---|---|---|---|
| `id` | uuid pk | NOT NULL | `defaultRandom()` |
| `workspace_id` | uuid FK → workspace (cascade) | NOT NULL | tenant |
| `source_id` | uuid FK → source (restrict) | NOT NULL | the `link` capture channel → the proof's source |
| `token` | text | NOT NULL **unique** | per-request, high-entropy, URL-safe |
| `customer_name` | text | null | brand-addressed prompt + thank-you |
| `transaction_ref` | text | null | transaction-leg context for T7.5 |
| `status` | `capture_request_status` | NOT NULL default `'open'` | single-use lifecycle |
| `expires_at` | timestamptz | NOT NULL | `created_at + 72h` |
| `used_at` | timestamptz | null | set on consume |
| `created_at` | timestamptz | NOT NULL default now | |

Indexes: unique on `token` (the lookup + the single-use guard); index on `workspace_id` (dev listing).

## New table — `verification_basis`

| Column | Type | Null? | Notes |
|---|---|---|---|
| `id` | uuid pk | NOT NULL | |
| `proof_id` | uuid FK → proof (cascade) | NOT NULL | the proof this basis backs |
| `request_id` | uuid FK → capture_request (restrict) | NOT NULL | the request the proof came from |
| `consent_captured_at` | timestamptz | NOT NULL | **the consent leg — REAL** (set at capture) |
| `transaction_verified_at` | timestamptz | **null** | **the transaction leg — STUB** (set in T7.5) |
| `created_at` | timestamptz | NOT NULL default now | |

A proof is "Verified real" only when **both** legs are non-null. This slice always leaves
`transaction_verified_at` null ⇒ **no stamp**. `proof.verified` stays `false`.

## Code-side (no migration)

`SOURCE_KINDS` (the `source.kind` allowlist, text) gains **`'link'`**. The seed creates one `link`
source per workspace (label "Capture link").

## The written proof (fixture-shaped — FR-008)

A capture-written `proof` populates exactly the fields the fixtures populate:

```text
{ workspaceId, customerName (from request or honest fallback), proofType ('video'|'text' this slice),
  quote (text path) | transcript (media path, null until transcription — like fixtures),
  sourceId (the link source), capturedAt = now, reviewed = false, verified = false, thumbnail = null }
```

The granted **consent version** (T7.1): `{ proofId, state:'granted', grantedAt:now, version:1,
useScope:['organic'], nameDisplay, showFace, captureContext:{method:'capture_page', requestId} }` — with
`nameDisplay`/`showFace` = `resolveDisplay(workspaceDefault, customerOverride)`.

## Token lifecycle (state transitions)

```text
open ──(submit consumes: UPDATE … WHERE status='open' AND expires_at>now())──▶ used   (single-use)
open ──(expires_at passes)──▶ effectively expired   (authoritative check: expires_at > now())
used / expired / unknown ──▶ honest block on /c/[token] (minimal screen-10 copy; polished → T7.2b)
```

The consume is the **only** transition to `used`, and it is atomic (one conditional UPDATE). The proof +
consent + basis are written in **one `db.batch`** after a successful consume.

## Relationships

`workspace 1—* capture_request`; `source 1—* capture_request`; `capture_request 1—0..1 proof` (one
request yields at most one proof); `proof 1—1 verification_basis`; `capture_request 1—* verification_basis`
(by request). No existing relationship changes.
