# Phase 1 — Data Model: T7.4 Ingest + normalize worker + webhook

All changes are **additive** (migration `0010`, folder `./drizzle`). No change to the `capture_request`
**token columns**, the T7.5 `verification_basis` schema, the consent model, or `/c/[token]`.

## New enum

### `media_status` (the normalize lifecycle)

| Value | Meaning |
|-------|---------|
| `captured` | media uploaded to R2 (`mediaUrl` set), not yet normalized |
| `normalizing` | worker is processing (claimed) |
| `normalized` | normalized object written; `normalized_media_url` set |
| `failed` | normalize failed; original retained, no normalized key |

Nullable on `proof` — null = no media (text proof) / pre-slice rows.

## New tables

### `webhook_endpoint` (per-workspace secret — one per workspace)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `workspace_id` | uuid FK → workspace (cascade) | **unique** — one endpoint per workspace |
| `source_id` | uuid FK → source (restrict) | the `webhook` source the mints attribute to |
| `secret` | text | high-entropy random token; **unique index**; shown to the merchant; regenerable |
| `created_at` | timestamptz | |

The webhook validates by `secret` → workspace (unique-index lookup, constant-time compare). Real,
authenticating (P-XIII). Plain-stored so the surface can show the real secret (D2-spec); regenerable;
encrypt-at-rest/show-once is future hardening.

### `webhook_event` (idempotency ledger)

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `workspace_id` | uuid FK → workspace (cascade) | |
| `event_key` | text | caller `event_id` or derived (D4) |
| `capture_request_id` | uuid FK → capture_request (set null) | the mint this event produced |
| `created_at` | timestamptz | |
| | | **unique(`workspace_id`, `event_key`)** — the idempotency guard |

## Additive columns

### `proof` (additive — `mediaUrl` UNCHANGED)

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `media_url` | text | yes | **UNCHANGED** — the captured original; **never overwritten** |
| `normalized_media_url` | text | yes | **ADD** — the worker's normalized output key; T8 reads this when present |
| `media_status` | `media_status` | yes | **ADD** — the normalize lifecycle; `captured` when a media proof is written |

### `capture_request` (additive — token columns UNCHANGED)

| Column | Type | Null | Notes |
|--------|------|------|-------|
| `transaction_ref` | text | yes | **exists** (T7.5) — the evidence id |
| `transaction_verified_at` | timestamptz | yes | **ADD** — the webhook's transaction-evidence marker; drives the **medium** basis at proof-write (D5) |
| token/expiry/single-use/status | — | — | **UNCHANGED** |

## `SOURCE_KINDS` (code-side allowlist — no migration)

Add `"webhook"` to `SOURCE_KINDS` (`source.kind` is text). Webhook-minted requests/proofs are
attributed to a `webhook` source (ensured per workspace when the endpoint is created).

## The medium-basis bridge (no `verification_basis` schema change)

```
webhook event (transaction evidence)
   └─> capture_request.transaction_verified_at := <evidence time>   (additive column)
        └─> writeCapturedProof reads it →
              transaction_verified_at present → verification_basis { source: webhook, strength: medium,
                                                  transaction_verified_at, transaction_ref }
              else                            → verification_basis { source: manual,  strength: weak, … }
   └─> T7.5 resolver UNCHANGED: strength IN (strong,medium) AND transaction_verified_at NOT NULL ⇒ verified
```

## Relationships (additive)

```
workspace ─1:1< webhook_endpoint ─> source(kind='webhook')
workspace ─1:n< webhook_event (unique workspace+event_key) ─0:1> capture_request
capture_request ─ (+transaction_verified_at) ─> writeCapturedProof ─> verification_basis (medium|weak)
proof ─ (+normalized_media_url, +media_status) ─ normalize worker
```

## Migration 0010 (expected, additive)

- `CREATE TYPE media_status`
- `ALTER proof ADD normalized_media_url text`, `ADD media_status media_status`
- `ALTER capture_request ADD transaction_verified_at timestamptz`
- `CREATE TABLE webhook_endpoint` (+ unique workspace_id, unique secret)
- `CREATE TABLE webhook_event` (+ unique(workspace_id, event_key))

No `DROP`, no token/resolver/consent change. (Verify additive at /speckit-tasks — a hard gate, like T7.5.)
