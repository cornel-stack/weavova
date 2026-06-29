# Research — T7.3 Requests via Resend (Phase 0)

All spec clarifications (C1–C7) were resolved in the 2026-06-29 session. This file records the
remaining **plan-level decisions** (technical mechanism + data-model choices), each with rationale and
alternatives. The one decision that adds storage beyond the two enumerated entities (D1) is flagged
for confirmation.

---

## D1 — Send/delivery tracking storage (FLAGGED for confirmation)

**Context**: C5 requires honest per-request tracking (created / sent / accepted-for-delivery / used /
expired) and ref 05 shows a per-template `N sent` aggregate. The brief says add **only**
`customer_email` to `capture_request`. So send/delivery state needs a home that is NOT extra columns
on `capture_request`.

**Decision**: Add a small additive **`request_send`** table — one row per dispatch (email or link),
recording `requestId`, optional `templateId`, `channel`, `recipientEmail`, `deliveryStatus`
(`accepted` | `failed` | `link_generated`), optional provider id, and `createdAt`.

- Per-request send state = the request's `request_send` row(s).
- Template **`N sent`** = `count(request_send WHERE template_id = T)` — real owned data (P-XIV).

**Rationale**: Keeps `capture_request` to exactly the approved `customer_email` addition; normalizes
the send log; supports Resend's accepted-for-delivery and an honest `failed` state; powers `N sent`
without a drift-prone counter; leaves room for the deferred automation to write the same rows later.

**Alternatives considered**:
- *Columns on `capture_request`* (`sent_at`, `email_status`): simplest, but contradicts "only
  `customer_email`" and conflates the token lifecycle with delivery state.
- *Denormalized `sent_count` on `request_template`*: trivial fixtures, but can drift and cannot
  represent a per-request `failed` send (less honest).

> **Confirm**: this adds `request_send` beyond the brief's two enumerated entities. Recommended as the
> honest, minimal home for C5 + `N sent`. If preferred, the fallback is `sent_at`/`email_status`
> columns on `capture_request` (relaxing "only `customer_email`").

## D2 — Resend transactional send mechanism

**Context**: T6 wires email only through NextAuth's built-in Resend **provider**
(`next-auth/providers/resend`, `apiKey ← AUTH_RESEND_KEY`, `from ← AUTH_EMAIL_FROM`). There is **no
standalone Resend client/util** to reuse, and **no `resend` SDK** in dependencies (still 11).

**Decision**: Add a thin **`src/lib/resend.ts`** helper that sends via the **Resend REST API**
(`POST https://api.resend.com/emails`, `Authorization: Bearer ${AUTH_RESEND_KEY}`, JSON body with
`from`, `to`, `subject`, `html`) using `fetch` — the same direct-HTTP idiom as `r2.ts`/`aws4fetch`.
**No new dependency.** Returns `{ ok: true, providerId }` or `{ ok: false, error }`.

**Rationale**: Honors P-III (no new dep); reuses the provisioned `AUTH_RESEND_KEY`; small and testable;
server-only (the key never reaches the client).

**Sender identity (C4)**: reuse **`AUTH_EMAIL_FROM`** (already a verified Resend sender). A
request-specific `proof@`/`from` would need its **own verified domain/sender + a new env**
(`REQUEST_EMAIL_FROM`) — **not worth it now**; flagged. If chosen later it is an additive env read.

**Alternatives considered**: the `resend` npm SDK (new dep — rejected, P-III); routing through the
auth provider (wrong abstraction — that path is for magic links, not arbitrary transactional mail).

## D3 — Mint-then-send (non-atomic) + honest failure model

**Context**: The send write-path mints a `capture_request` and then emails the link. Resend can fail
after the mint.

**Decision**: **Durable mint first, best-effort send second** (NOT a single transaction):
1. Validate recipient (Email path).
2. `createCaptureRequest(... customerEmail)` → durable token/link (the source of truth).
3. Insert a `request_send` row; call the Resend helper.
4. **Success** → `request_send.deliveryStatus = 'accepted'` (+ providerId); surface "sent".
5. **Failure** → `request_send.deliveryStatus = 'failed'`; surface an honest "couldn't send — the link
   is ready to copy, or retry" state. The request/link **still exists and works**; nothing is marked
   "sent" (P-XIV).
6. **Link channel** → mint + `request_send(channel='link', deliveryStatus='link_generated')`; return
   the copyable URL; no email.

**Rationale**: The token/link is the real asset; email is a delivery convenience. A failed email must
never strand the merchant (they still have a usable link) and must never claim success.

## D4 — "Ask this customer for more" renders independent of the existing proof's consent

**Context**: `proof-detail-actions.tsx` currently returns `null` for non-granted proof (only "Make a
clip" renders, consent-gated). Ref 23's "Ask this customer for more" is **outreach** to the customer —
it does not use the existing proof's consent (the new request gathers its own consent at capture).

**Decision**: Render **"Ask this customer for more"** for any proof (regardless of `consentState`);
keep "Make a clip" consent-gated exactly as today. This is an **additive** control; the Make-a-clip
gating is untouched.

**Rationale**: Outreach is valid even when the existing proof is not consented (e.g. asking again).
Faithful to ref 23 (shown alongside the action cluster). No dead control.

## D5 — `request_template` shape + trigger model (Manual link live; others coming)

**Context**: Ref 06 saves a reusable template with a TRIGGER (Manual link / Shopify / Stripe /
Calendly), a prompt set, delivery channel, send timing, and a versioned consent line.

**Decision**: `request_template` stores `triggerType` as a small set (`manual_link` | `shopify` |
`stripe` | `calendly`). **Only `manual_link` is wired** (it mints requests on demand). The others are
**persisted as configuration but rendered as honest "coming" states** (P-XIII) — the builder shows
them, the copy describes the deferred automation, and they never mint/send. `sendTiming` is free text
(e.g. "3 days after fulfillment") meaningful only for the deferred automated triggers; for
`manual_link` it is informational. This shapes the schema so the deferred "automation mints requests
from a template" bridge is **additive later** (the automation will read these templates).

**Rationale**: Faithful port + honest deferral; no speculative automation built now (P-IX).

## D6 — `N sent` honesty in fixtures

**Context**: The design mock shows counts like "412 sent". P-XIV forbids fabricated counts.

**Decision**: `N sent` is always `count(request_send WHERE template_id = T)`. Fixtures seed a small,
**real** number of `request_send` rows per seeded template; the demo shows those honest counts (the
mock's "412" is illustrative only). No counter, no fabrication.

## D7 — Workspace scoping (two-layer, P-V)

**Decision**: All T7.3 surfaces are authenticated `/app` routes behind the existing middleware gate;
every read/write resolves the **current workspace** (`getCurrentWorkspace`) and filters by
`workspaceId` (templates list, request creation, send actions). Unlike the public `/c/[token]` page,
these are **never** token-scoped. The `Requests` nav entry already points at `/app/requests` (no nav
edit needed — the route simply becomes live).

## D8 — Integration guard (public page zero-change)

**Decision**: Request creation reuses `createCaptureRequest` (extended with `customerEmail`,
additive). Token generation, `expires_at`, single-use status, and `getCaptureRequestByToken`
resolution are **unchanged**, so a merchant-created request resolves on `/c/[token]` **identically to a
seeded one**. The quickstart asserts **zero** edits to `src/app/c/[token]/**`. If creation ever appears
to need a token-model change (beyond `customer_email`), STOP and surface it.
