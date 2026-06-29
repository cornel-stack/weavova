# Data Model — T7.3 Requests via Resend (Phase 1)

All changes are **additive**. The `capture_request` **token columns are untouched** and the public
`/c/[token]` resolution is unchanged (integration guard, D8). Migration is a single additive
drizzle-kit migration (`0008_*`): one new enum or two, two new tables, one new column.

---

## 1. `capture_request` — EXISTING (+ one additive column)

| Field | Type | Notes |
|---|---|---|
| *(all existing T7.2 columns)* | — | `id, workspaceId, sourceId(link), token, customerName?, transactionRef?, status(open\|used\|expired), expiresAt, usedAt, createdAt` — **unchanged** |
| **`customerEmail`** | `text` (nullable) | **NEW** — the recipient address for the Email path (free-email entry, C7). Null for link-only requests. The only approved addition. |

- Token model (token, `expiresAt`, single-use `status`, unique index) is **not** modified.
- `createCaptureRequest(...)` gains an additive `customerEmail?` option; everything else identical.

## 2. `request_template` — NEW (additive)

A reusable ask definition saved by the builder (ref 06), listed on ref 05. Workspace-scoped.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | default random |
| `workspaceId` | `uuid` FK → `workspace` | `onDelete: cascade`; scopes every read (D7) |
| `name` | `text` | template title (e.g. "Show it in use") |
| `prompt` | `text` | the prompt-set headline the customer sees (e.g. "Show it in use") |
| `triggerType` | enum `request_trigger` | `manual_link` (LIVE) \| `shopify` \| `stripe` \| `calendly` (honest "coming", D5) |
| `deliveryChannel` | enum `request_channel` | `email` \| `link` |
| `sendTiming` | `text` (nullable) | free text e.g. "3 days after fulfillment"; meaningful only for deferred automated triggers; informational for `manual_link` |
| `consentLine` | `text` | the verbatim consent line shown at capture (P-VII) |
| `consentVersion` | `text` | the consent version label (e.g. "v2") carried into capture |
| `createdAt` | `timestamptz` | default now |

- **`N sent`** is NOT stored here — it is derived: `count(request_send WHERE template_id = id)` (D1/D6).
- Index: `request_template_ws_idx` on `workspaceId`.

## 3. `request_send` — NEW (additive)

One row per dispatch (email or link). Powers honest per-request tracking (C5) and the template
`N sent` aggregate (D1).

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | default random |
| `requestId` | `uuid` FK → `capture_request` | `onDelete: cascade`; the minted instance dispatched |
| `templateId` | `uuid` FK → `request_template` (nullable) | `onDelete: set null`; null for ad-hoc modal sends with no template; powers `N sent` when set |
| `workspaceId` | `uuid` FK → `workspace` | `onDelete: cascade`; denormalized for direct scoping of the send log |
| `channel` | enum `request_channel` | `email` \| `link` |
| `recipientEmail` | `text` (nullable) | the address emailed (Email channel); null for link |
| `deliveryStatus` | enum `request_delivery_status` | `accepted` (Resend accepted-for-delivery) \| `failed` (send attempted, rejected) \| `link_generated` (link channel, no email) |
| `providerId` | `text` (nullable) | Resend message id when returned |
| `createdAt` | `timestamptz` | default now — the "sent at" timestamp |

- **No opens/clicks columns** — we never store/show unverifiable engagement (P-XIV, C5).
- Indexes: `request_send_template_idx` on `templateId` (for `N sent`), `request_send_request_idx` on
  `requestId`.

## 4. Enums (NEW)

- `request_trigger`: `manual_link | shopify | stripe | calendly`
- `request_channel`: `email | link`
- `request_delivery_status`: `accepted | failed | link_generated`

## State & lifecycle

- **Request lifecycle** (unchanged, T7.2): `open → used` (single-use consume on capture) / `open →
  expired` (`expires_at > now()` authoritative). Surfaced as created/used/expired.
- **Send/delivery** (new, orthogonal): a `request_send` row's `deliveryStatus` is `link_generated`
  (link) or `accepted`/`failed` (email). "Sent" in the UI = an Email `request_send` exists;
  "delivered" hint = `accepted`. A `failed` row never reads as sent (D3).
- **`N sent` per template** = count of its `request_send` rows (real, owned).

## Derived views (read shapes; client-safe types in `src/lib/requests.ts`)

- **TemplateCardView**: `{ id, name, prompt, triggerType, deliveryChannel, sentCount }` — for ref 05.
- **TemplateBuilderView / TriggerOption**: the trigger set with `wired: boolean` (`manual_link` true;
  others false → "coming"), prompt-set options, channel, timing, consent line + version — for ref 06.
- **AskForMoreView**: `{ proofId, customerName, customerEmailPrefill: null, channelOptions, message }`
  — for ref 23 (no stored email → prefill is always null; merchant types it, C7).

## Fixtures (seed.ts — additive)

- Seed a few `request_template` rows for the demo workspace (names/prompts/triggers/channels matching
  the ref 05 spirit; one `manual_link`, others showing `shopify`/`shared on demand`).
- Seed a small, **real** number of `request_send` rows per template so `N sent` reflects actual rows
  (D6 — honest, not the mock's "412").
- Optionally set `customerEmail` on a couple of existing seeded `capture_request`s for realism.
- No change to existing proof/consent/clip fixtures.
