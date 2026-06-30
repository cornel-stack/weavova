# Feature Specification: T7.4 — Ingest + normalize worker + generic inbound webhook

**Feature Branch**: `T7.4-ingest-normalize-webhook`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "T7.4 — Ingest + normalize worker + generic inbound webhook. The first cloud-worker slice: stands up the ingestion spine that makes the capture funnel AUTOMATIC and stands up the Railway media-worker host (shared later with T8's renderer)."

## Summary

This is the first **cloud-worker** slice and the moment the capture funnel becomes **automatic**. It
delivers three pieces:

1. **A generic inbound webhook** (a Vercel route, secret-validated, no OAuth) — the *universal door*.
   A "sale/booking happened for customer X" event from anywhere (Zapier / Make / n8n bridging
   Shopify / Stripe / anything) mints a `capture_request` through the **existing T7.2 primitive**
   (token, 72h, single-use, `customer_email`). Zero vendor-specific code. Native OAuth connectors
   (Shopify/Stripe/Calendly) stay the **deferred Sources track**.
2. **The normalize worker** — the **first Railway service**. When captured media lands in R2, the
   worker pulls it, ffmpeg-normalizes it to sane dimensions/format (the render-spike fix:
   un-normalized 4K/sideways media crashes T8 downstream), writes the normalized object back to R2,
   and updates the proof's normalize state. Idempotent + retry-safe. The Railway host is stood up so
   **T8's renderer is a second service on the same host, not a rebuild.**
3. **Webhook → `medium` verification basis** — a webhook event carrying real transaction evidence
   makes the eventual proof earn a **medium**-strength `verification_basis` (`source=webhook`,
   `transaction_verified_at` set). Via the **T7.5 forward contract** the verified stamp lights up
   **with no resolver change**. This is the first path that earns a *real* (medium) verified stamp;
   the native-connector (strong) path stays deferred.

Orchestration is **Inngest** (in the locked stack — CLAUDE.md §3); the webhook emits an Inngest event
and Inngest owns retries/idempotency/concurrency. Media work runs on **Railway**, never in a Vercel
function (4 GB / time / bundle limits make it impossible).

## Step 0 — Infra discovery (actual state, not assumed)

Reported here because the slice stands up real infrastructure. **Findings (verified against the repo):**

| Component | Actual state | Evidence |
|---|---|---|
| **Inngest** | **ABSENT — greenfield.** Not in `package.json` (app has **exactly 11 deps**), no client, no functions, no `/api/inngest` route, no `INNGEST_*` env. | `package.json` deps block; `grep inngest` → only deferral comments |
| **Railway / worker host** | **ABSENT — greenfield.** No `railway.json`/`Dockerfile`/`nixpacks.toml`/`worker/` dir; single Next.js app, Vercel-native. | repo tree |
| **R2** | **WIRED.** `src/lib/r2.ts` has `captureMediaKey(workspaceId, suffix)`, `presignPut(key, ct)`, `assetUrlForKey(key)`; lazy `R2_*` env. | `src/lib/r2.ts:63,85,92` |
| **Capture write-path / `mediaUrl`** | **CONFIRMED.** `writeCapturedProof` sets `proof.mediaUrl = input.mediaUrl` (the captured R2 key); `proof.media_url` column exists, nullable. | `src/db/queries.ts:~1664`, `schema.ts:120` |
| **`verification_basis` + resolver (T7.5)** | **READY.** `basisStrengthEnum(strong/medium/weak)`, `basisSourceEnum(native/webhook/manual)`, nullable `request_id`. `qualifyingBasisExpr` = `strength IN (strong,medium) AND transaction_verified_at NOT NULL`; resolver = consent AND basis. A **medium** basis with `transaction_verified_at` set ⇒ `proofIsVerified` true. | `schema.ts:462`, `queries.ts:127`, `verification.ts` |
| **Provisioning pattern (T6)** | **DOCUMENTED.** `.env.example` marks CORNEL-OWNED infra; lazy-load at call time; **build stays green without creds**, only the live path fails. | `.env.example:14`, T6 spec |
| **Webhook/source surfaces** | **SCAFFOLDED, deferred.** `requestTriggerEnum(manual_link/shopify/stripe/calendly)`; the request builder shows honest "Coming soon" banners for shopify/stripe/calendly; `saveTemplate`/`createAndSendRequest` reject non-`manual_link`. | `request-builder.tsx:35`, `requests/actions.ts:137` |

**Consequence — both Inngest and Railway need PROVISIONING (Cornel-owned, mirroring the T6 pattern).**
See *Provisioning* below. The build/typecheck stay green without any of it; the
worker + webhook live paths are the verify-with-real-infra part.

**Bristle risk noted (Inngest re-registration):** a prior project saw an Inngest *cron-stall =
function-registration-failure-after-redeploy*. It applies here in the form: **the worker's Inngest
serve endpoint must re-sync on every Railway redeploy** or functions silently stop firing. The slice
must make worker re-sync explicit (a deploy step / health check), not assumed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — The universal door: a webhook mints a capture request (Priority: P1)

A merchant (or their Zapier/Make/n8n automation) sends a "sale happened for customer X" event to their
workspace's webhook URL with their shared secret. The event mints a `capture_request` (token, 72h,
single-use, `customer_email`) through the existing T7.2 primitive — and, if an email is present, the
existing T7.3 send path is orchestrated via Inngest. No vendor-specific code; any tool that can POST
JSON is now a source.

**Why this priority**: This is the headline value — the funnel becomes *automatic*. One generic
endpoint replaces N native integrations on day one. It is the MVP: everything else builds on requests
being minted automatically.

**Independent Test**: POST a valid event (correct secret, customer email) to the webhook → a
`capture_request` is created in that workspace (token, 72h expiry, single-use, `customer_email`), and
the `/c/[token]` it produces resolves **identically** to a seeded/T7.3-minted request. An invalid or
missing secret → rejected, nothing minted.

**Acceptance Scenarios**:

1. **Given** a workspace with a configured webhook secret, **When** a valid event is POSTed with that
   secret and a customer email, **Then** a single-use 72h `capture_request` is minted with that
   `customer_email`, scoped to that workspace.
2. **Given** the same event, **When** the request is minted, **Then** an Inngest event is emitted so
   the send/follow-on is orchestrated (retries/idempotency owned by Inngest), not run inline.
3. **Given** an event with a missing or wrong secret, **When** it hits the webhook, **Then** it is
   rejected (no mint, no information leak about which workspace exists).
4. **Given** a duplicate delivery of the same event, **When** it is processed, **Then** it does not
   mint a duplicate request (idempotent on a stable event key).
5. **Given** a minted request, **When** the customer opens `/c/[token]`, **Then** the public capture
   page behaves **exactly** as for a T7.3 request — `/c/[token]` is untouched (FR — integration guard).

---

### User Story 2 — The first earned (medium) verified stamp (Priority: P1)

When the webhook event carries real transaction evidence (the sale is genuine), the proof the customer
eventually submits earns a **medium**-strength verified stamp automatically — the first time the
"Verified real customer" mark lights up from a live path. A manual link / merchant-typed assertion
stays **weak** (below the bar). Native-connector (strong) evidence stays deferred.

**Why this priority**: This is the T7.5 payoff made real — the verified moat finally earns itself from
a transaction, not a stub. It must light up via the **existing forward contract with no resolver
change**, proving the T7.5 architecture.

**Independent Test**: Send a webhook event with transaction evidence → the minted `capture_request`
carries that evidence → the customer captures at `/c/[token]` with granted consent → the proof shows
the **stamp** (a medium basis: `source=webhook`, `transaction_verified_at` set). Send a manual-link
request instead → the proof shows the honest in-between (weak), **no** stamp. The resolver code is
unchanged between the two.

**Acceptance Scenarios**:

1. **Given** a webhook event with confirmed transaction evidence, **When** the proof is later written,
   **Then** a `medium` / `source=webhook` `verification_basis` with `transaction_verified_at` set is
   recorded, and (consent granted) the proof is verified.
2. **Given** a webhook event with NO transaction evidence (e.g. a booking reminder with no sale),
   **When** the proof is written, **Then** the basis is **weak** — no false stamp (FR-019).
3. **Given** the medium-verified proof, **When** any surface renders it, **Then** the stamp appears
   through the **unchanged** T7.5 resolver — no edit to `proofIsVerified` / `qualifyingBasisExpr`.
4. **Given** a manual-link / merchant-asserted request, **When** the proof is written, **Then** it
   stays **weak** and shows the honest in-between (the native one-click connectors remain "coming").

---

### User Story 3 — The normalize worker on the Railway host (Priority: P2)

When captured media lands in R2, a Railway worker (triggered via Inngest) pulls the object,
ffmpeg-normalizes it to sane dimensions/format/rotation, writes the normalized object back to R2, and
records the proof's normalize state. This prevents un-normalized 4K/sideways/odd-codec media from
crashing the T8 renderer. The Railway host is stood up such that **T8's Remotion renderer is a second
service on the same host**, not a new host.

**Why this priority**: It is essential infrastructure (the render-spike fix + the host T8 needs) but
delivers no merchant-visible surface this slice — it prepares the media pipe. P2: ship after the
webhook funnel (US1/US2) is proven.

**Independent Test**: A media proof's captured object lands in R2 (key on `proof.mediaUrl`) → the
worker runs → a normalized object exists in R2 and the proof's normalize state is `normalized` with
the normalized key recorded. Re-running the worker on the same input is a no-op (idempotent). A
worker failure leaves an honest `failed` state, not a half-written proof.

**Acceptance Scenarios**:

1. **Given** a newly captured video in R2, **When** the normalize worker runs, **Then** a normalized
   object (capped resolution, standard codec, corrected rotation) is written to R2 and the proof
   records the normalized key + `normalized` state.
2. **Given** the worker is retried (Inngest at-least-once), **When** it runs again on the same proof,
   **Then** it does not duplicate or corrupt output (idempotent on the normalized key).
3. **Given** a worker failure (bad media / ffmpeg error), **When** it gives up, **Then** the proof is
   marked `failed` honestly; no partial normalized key is recorded; the original captured media is
   retained.
4. **Given** the Railway host, **When** T8's renderer is added later, **Then** it is a *second
   service* on the same host (shared base/config), not a re-stand-up.

---

### Edge Cases

- **Webhook before secret configured**: a workspace with no webhook secret rejects all events (fail
  closed) — no mint.
- **Event with email but no transaction evidence**: mints a request, sends the ask, but the proof
  stays weak (no stamp) — honest.
- **Transaction evidence but customer never captures**: no proof, no basis, no stamp — the evidence
  sits on the (expiring) `capture_request` and lapses with it. Nothing fabricated.
- **Media captured but worker host down**: the proof exists with `captured` (un-normalized) state;
  the merchant still sees the proof; normalization completes when the worker recovers (Inngest retry).
  Pre-T8 nothing renders, so an un-normalized proof is not user-visible-broken.
- **Inngest functions not re-synced after a worker redeploy** (the Bristle risk): events stop firing
  silently — mitigated by an explicit re-sync/health check (must be a real step, not assumed).
- **Non-media (text) proof**: no normalize work (skipped); only media proofs enter the worker.
- **Duplicate webhook delivery** (Zapier/network re-fire or Inngest retry): idempotent — one
  `capture_request` per stable event key; the second delivery mints nothing.
- **Normalize job retried** (Inngest at-least-once): idempotent — a proof already `normalized` is
  skipped; a re-run writes the same deterministic normalized key, never a duplicate object.
- **Worker redeployed**: functions must re-sync or events silently no-op — the registration/health
  check (FR-020) catches a stalled sync before it's mistaken for "no events."

## Requirements *(mandatory)*

### Functional Requirements

**Webhook (the universal door)**

- **FR-001**: The system MUST expose a generic inbound webhook (a Vercel route, public, **no OAuth /
  no user auth**) that accepts a generic "sale/booking happened for customer X" JSON event.
- **FR-002**: The webhook MUST authenticate each event by a **per-workspace shared secret**; an event
  with a missing/invalid secret MUST be rejected with no mint and no workspace-existence disclosure.
- **FR-003**: A valid event MUST mint a `capture_request` through the **existing T7.2 primitive**
  (token, 72h, single-use, `customer_email`) — the token model UNCHANGED; the webhook only mints.
- **FR-004**: The webhook MUST emit an **Inngest event** (e.g. `request.created`) so the send and any
  follow-on are orchestrated (retries, idempotency, concurrency owned by Inngest), not run inline.
- **FR-005**: Webhook event processing MUST be **idempotent** — because external webhooks can
  double-fire (Zapier/network retries) AND Inngest retries at-least-once. A double-fired event MUST
  NOT mint two `capture_request`s for one sale: idempotency is keyed on a **stable event identifier**
  (a caller-supplied idempotency key, or a deterministic key derived from the event); the second
  delivery returns the first result and mints nothing new. (Addition A.)
- **FR-006**: The webhook MUST contain **zero vendor-specific code** — it accepts the generic shape;
  Zapier/Make/n8n bridge specific vendors. Native OAuth connectors are out of scope (deferred).

**Verified-stamp wiring (medium)**

- **FR-007**: When an event carries **real transaction evidence**, the system MUST record it on the
  minted `capture_request` so the eventual proof earns a **medium** basis (`source=webhook`,
  `transaction_verified_at` set, `transaction_ref` = the evidence id).
- **FR-008**: The proof-write path MUST derive basis strength from the request's evidence: webhook
  with confirmed transaction → **medium**; manual/link / no evidence → **weak**. It MUST NOT fabricate
  evidence (FR-019).
- **FR-009**: The verified stamp MUST light up through the **unchanged** T7.5 resolver and
  `qualifyingBasisExpr` — **no edit** to `proofIsVerified`/the bar. If a resolver change appears
  necessary, STOP and surface it.

**Normalize worker (Railway)**

- **FR-010**: The system MUST stand up a **Railway worker host** with the normalize worker as its
  first service, designed so **T8's renderer is a second service** on the same host (shared base/host
  config) — stated as a forward contract.
- **FR-011**: The worker MUST be triggered via **Inngest** when captured media lands in R2 (e.g. a
  `media.captured` event emitted by the capture write-path), not by polling.
- **FR-012**: The worker MUST pull the captured object from R2, **ffmpeg-normalize** it (scope in
  Decision 1), write the normalized object back to R2, and record the normalized key + a
  normalize **state** on the proof.
- **FR-013**: The worker MUST be **idempotent and retry-safe** (Inngest is at-least-once). Keyed on the
  **media object + `media_status`**: the worker only acts on `captured` (or resumes `normalizing`) and
  **skips if already `normalized`**; the normalized output key is **deterministic** so a re-run
  overwrites the same object rather than creating a duplicate. A failure records an honest `failed`
  state and **retains the original captured media** (no partial write; `mediaUrl` never overwritten).
  (Addition A.)
- **FR-020**: The worker's Inngest **serve endpoint MUST re-register its functions on every Railway
  redeploy** (auto-sync on boot or a post-deploy sync hook) — a **non-optional deploy step**, plus a
  registration/health check to detect a failed sync. Rationale: after a redeploy, functions can
  **silently stop registering** — events fire, nothing runs, and the worker looks healthy while idle
  (the Bristle cron-stall failure mode). (Addition B.)
- **FR-014**: ffmpeg and worker runtime deps MUST live **only on the Railway worker** (host-side); the
  **Next.js app's dependency count MUST NOT change** (stays 11). The app emits Inngest events without
  bundling an SDK (the app emits via the Inngest Event API — Decision 5).

**Merchant configuration & honesty**

- **FR-015**: A merchant MUST be able to obtain their workspace webhook **URL + secret** somewhere
  honest this slice (location in Decision 2) — no dead control (P-XIII).
- **FR-016**: The product MUST state honestly what is **live** (the generic webhook) vs **deferred**
  (native Shopify/Stripe/Calendly one-click OAuth) — the existing "Coming soon" trigger banners stay
  truthful; nothing implies native-native works.

**Integration guards (P-V — cores unchanged)**

- **FR-017**: `/c/[token]` (the public capture page) MUST be **untouched**; a webhook-minted request
  resolves there identically to a seeded/T7.3 request. Zero edits to `src/app/c/[token]/**` — if any
  appears needed, STOP.
- **FR-018**: The `capture_request` **token model** (token/expiry/single-use/status columns) MUST be
  unchanged; only additive transaction-evidence columns are added.
- **FR-019**: The T7.5 `verification_basis` schema + resolver are **unchanged** except additive data
  written into them; enumerate every touch point (writeCapturedProof basis branch,
  `capture_request` additive column) and STOP if a core needs a real change.

### Key Entities *(include if feature involves data)*

- **Webhook endpoint / credential** (new): a per-workspace shared secret that authenticates inbound
  events and scopes them to a workspace. Where it is stored is a design choice (a `source` row of kind
  `webhook`, or a dedicated credential) — see data model at plan time. Carries: the workspace, the
  secret, and the `source` the minted requests/proofs are attributed to.
- **`capture_request`** (extended, additive): gains a **transaction-evidence** marker — at minimum a
  `transaction_verified_at` (the moment the webhook evidenced the sale; `transaction_ref` already
  exists). Drives the proof-write path to choose **medium** vs **weak** basis. **Token columns
  untouched.**
- **`proof`** (extended, additive): gains a **normalized-media key** + a **normalize state**
  (e.g. `captured` / `normalizing` / `normalized` / `failed`) so the worker's output and progress are
  recorded and honest. (`mediaUrl` stays the captured key; the normalized key is separate — see Open
  Question 3.)
- **`verification_basis`** (unchanged schema): the webhook path writes a **medium** row
  (`source=webhook`, `transaction_verified_at` set); the live manual/link path writes **weak**. No
  schema or resolver change (T7.5 forward contract).
- **Inngest events** (new contracts, not DB): e.g. `request.created` (mint → orchestrated send) and
  `media.captured` (→ normalize worker). The durable orchestration layer.
- **Railway worker host** (new infra): the first media service (normalize); T8's renderer is a planned
  second service on the same host.

## Resolved Decisions

> The five open questions are resolved (`/speckit.clarify`, 2026-06-30): Q1 A · Q2 A (sharpened) ·
> Q3 A · Q4 A · Q5 the emit-split. Reasoning written in. Two load-bearing additions follow
> (idempotency on both layers; Inngest re-sync on redeploy). Provisioning (below) is a requirement
> list, not a question.

### Decision 1 — Normalize v1 = VIDEO-FIRST + photo resize; audio deferred *(Q1 → A)*

**Scope**: video — **cap resolution** (≤1080p long edge), **re-encode to standard H.264/AAC MP4**, and
**bake in rotation** (strip the sideways metadata so the pixels are upright). Photo — resize/re-encode
to a sane max. **Audio — deferred.**

**Why**: this is the *minimal* set that prevents downstream crashes, grounded in the render-spike
findings — the things that crash a renderer are **un-normalized 4K, odd codecs, and sideways video**,
all of which are video. Audio is deferred for two compounding reasons: there is **no live audio
capture path yet** (audio capture is T7.2b), so there is nothing to normalize; and audio doesn't crash
the renderer the way un-normalized video does. Photo gets a cheap resize because a stray huge image can
still trip T8. We normalize exactly what the render risk demands and no more.

### Decision 2 — Webhook URL + secret in a minimal honest spot, REAL and authenticating *(Q2 → A, sharpened)*

**Location**: the merchant's webhook URL + **per-workspace secret** lives in a **minimal honest spot**
(the dev/styleguide data surface + the trigger area where the "coming" connectors already live) until
**T9 Settings** gives it a designed home — a documented derived state (P-XII; no designed surface
exists this slice).

**The sharpening (non-negotiable)**: the surface must show the **REAL per-workspace secret** and the
webhook must **genuinely authenticate against it**. Functional-but-unstyled is fine; **fake or
decorative is NOT.** A secret that doesn't actually gate the endpoint would be a dead/dishonest control
(P-XIII) — worse than absent, because it would imply security the system doesn't enforce. The secret is
**workspace-scoped** (it both authenticates the event and selects which workspace the request mints
into). This makes the generic webhook the *reachable, working* path while native one-click stays
"coming."

### Decision 3 — Additive proof media model; the captured original is NEVER overwritten *(Q3 → A)*

**Shape**: add `proof.normalized_media_url` (the worker's output key — a **distinct home**) +
`proof.media_status` enum (`captured` → `normalizing` → `normalized` → `failed`). The existing
`proof.mediaUrl` (the **captured** key, T7.2) is **unchanged and never overwritten.**

**Why the original is sacred**: keeping the captured key untouched means a **failed or re-run normalize
never loses the source** — the worker always has the original to retry from, and a bad normalize can't
destroy the only copy of the customer's proof. T8 reads `normalized_media_url` when present, else falls
back to the captured key. Additive migration; the T7.2 `mediaUrl` seam is preserved exactly.

### Decision 4 — Normalize NEW captures only *(Q4 → A)*

No backfill. Existing fixtures have **no real media** (placeholder/null `mediaUrl`) — there is nothing
to normalize, and we must **not run media jobs against fixture rows** (they'd fail or no-op noisily).
Only media captured *after* this slice flows through the worker; existing proofs keep
`media_status = captured` (or null), which is honest.

### Decision 5 — App emits via the Inngest Event API (no SDK); SDK + worker live on Railway *(Q5 → confirmed)*

The **Next.js app emits Inngest events via a plain `fetch` POST to the Inngest Event API** (using an
`INNGEST_EVENT_KEY`, lazy-read — the T6 pattern). **No Inngest SDK in the app** → the app's dependency
count **stays at 11** (SC-006). The **Inngest SDK + the functions it serves + ffmpeg** all live on the
**Railway worker** — a **separate deployable** with its own host-side dependencies.

**The dependency boundary (explicit):**

| Layer | Deploy target | Gets | Dependency rule |
|-------|---------------|------|-----------------|
| **App** | Vercel | the webhook route, the Event-API `fetch` emit | **stays at 11 deps** — no SDK, no ffmpeg |
| **Worker** | Railway | the Inngest serve endpoint + functions, ffmpeg, R2 + DB clients | host-side deps, **separate** from the app's 11; counted/owned independently |

This split also **localizes the Bristle re-sync risk to the worker** (only the worker serves functions),
keeping it off the Vercel app entirely.

### Addition A — Idempotency on BOTH layers (load-bearing)

Both the webhook and the normalize worker MUST be idempotent — because **Inngest retries (at-least-once)
AND external webhooks can double-fire** (Zapier re-tries, network retries, a flaky upstream). Without
this, one sale mints two requests, or one media object normalizes twice.

- **Webhook**: a double-fired event MUST NOT mint two `capture_request`s for one sale. Idempotency is
  keyed on a **stable event identifier** (an idempotency key the caller sends, or a deterministic key
  derived from the event) — the second delivery returns the first result, mints nothing new.
- **Normalize worker**: a retried job MUST NOT double-process. Keyed on the **media object +
  `media_status`** — the worker only acts on `captured` (or resumes `normalizing`), and **skips if
  already `normalized`**. The normalized output key is deterministic so a re-run overwrites the same
  object rather than creating a duplicate.

### Addition B — Inngest re-sync on EVERY redeploy (the Bristle cron-stall lesson)

The worker's Inngest **serve endpoint MUST re-register its functions on every Railway redeploy.** This
is an **explicit, non-optional deploy/provisioning step**, not a footnote. The failure mode is real and
deceptive: after a redeploy, **functions silently stop registering** — events fire but nothing runs, and
the worker *looks* up while doing nothing. The slice MUST make re-sync a real step (an auto-sync on
boot or a post-deploy sync hook) plus a way to detect it failed (a health/registration check), so a
stalled registration is caught, not discovered weeks later.

## Provisioning (Cornel-owned infra — mirrors the T6 pattern)

Both Inngest and Railway are greenfield (Step 0). The **build/typecheck stay green without any of
this** (lazy env reads, T6 pattern); the worker + webhook **live paths** are the verify-with-real-infra
part. Env splits cleanly by deploy target:

**App (Vercel) needs:**
- `INNGEST_EVENT_KEY` — the Event API key the app uses to `fetch`-emit events (no SDK).
- `INNGEST_EVENT_API_URL` — the Event API base (or the default Inngest ingest URL).
- (existing) `DATABASE_URL`, `R2_*`, `AUTH_*` — unchanged.

**Worker (Railway) needs:**
- `INNGEST_SIGNING_KEY` — to serve/register the Inngest functions.
- `R2_*` — to read the captured object and write the normalized object.
- `DATABASE_URL` — to update the proof's `normalized_media_url` + `media_status` (shared Neon).

**Setup (Cornel-owned, mirrors the T6 `AUTH_*` block):**
- **Inngest**: create the Inngest app/account; obtain the **event key** (app) + **signing key**
  (worker). Document both in `.env.example` with the "CORNEL-OWNED; build green without it" note.
- **Railway**: create the Railway project + the normalize-worker service; set the worker env above;
  build the worker image (**ffmpeg present**); deploy; wire the **re-sync on deploy** (FR-020).
- **Per-workspace webhook secret**: **app-generated** (not Cornel env) — created when a merchant
  "connects" the generic webhook; stored with the workspace's webhook credential, shown on the
  honest config surface (Decision 2).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid webhook event mints exactly one 72h single-use `capture_request` (with
  `customer_email`), and an invalid/missing-secret event mints **zero** — 100% secret enforcement.
- **SC-002**: A webhook-minted request's `/c/[token]` page is **byte-identical** in behavior to a
  T7.3-minted request — zero edits to `src/app/c/[token]/**`.
- **SC-003**: A webhook event with transaction evidence yields a **medium** verified stamp on the
  resulting consented proof; a manual/no-evidence path yields **no** stamp — with **zero** change to
  the T7.5 resolver/bar (diffable).
- **SC-004**: 100% of duplicate event deliveries are idempotent — no duplicate requests, no duplicate
  normalized outputs.
- **SC-005**: A captured video is normalized (resolution capped, standard codec, rotation baked) and
  the proof records `normalized` + the normalized key; a worker failure records `failed` with the
  original retained — no partial writes.
- **SC-006**: The Next.js app dependency count is **still 11** after this slice (worker deps are
  host-side only).
- **SC-007**: The Railway host runs the normalize worker and is documented such that T8's renderer
  adds as a **second service** (no host re-stand-up).
- **SC-008**: After a worker redeploy, the Inngest functions are **re-registered and verifiably
  serving** (the registration/health check passes) — a stalled sync is detected, not silent.
- **SC-009**: `proof.mediaUrl` (the captured original) is **never overwritten** — after a normalize
  (success, retry, or failure) the original captured key is still present and re-runnable.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: N/A to layout — no proof-surface redesign. The only visible
  effect is the (now earned) verified stamp lighting up, which keeps the customer's proof primary.
- **Locked stack (P-III)**: Inngest is **in the locked stack** (CLAUDE.md §3 — Jobs: Inngest); this
  slice finally wires it. Railway is the sanctioned worker host (T8 precedent). ffmpeg is a
  **worker/host** binary, not an app dep. The **app stays at 11 deps** (Decision 5). No
  unsanctioned dependency.
- **Pressroom tokens (P-IV)**: any merchant webhook-config surface uses on-token styling; persimmon
  stays scarce (the verified stamp only).
- **Port, don't redesign (P-V)**: the `capture_request` primitive, token model, `/c/[token]`, and the
  T7.5 resolver are **unchanged** (FR-017/018/019) — this slice **adds** the webhook + worker +
  basis-write; it does not modify the proven cores. Touch points enumerated; STOP-and-surface if a
  core needs a change. No designed webhook-config screen exists → that surface is a documented derived
  state (P-XII), resolved as Decision 2.
- **Fixtures-first (P-VI)**: the additive columns (capture_request evidence; proof normalize state)
  are shaped like the real schema; build/seed stay green without live infra.
- **Consent (P-VII)**: unchanged and still necessary — a medium basis alone never verifies a
  non-consented proof; the webhook never bypasses the `/c/[token]` consent capture.
- **No editor (P-VIII)**: N/A — no studio surface.
- **Scope (P-IX)**: generic spine only; native OAuth connectors explicitly deferred (Sources track);
  no speculative connector code.
- **Microcopy (P-XVII)**: webhook-config / "coming" copy is plain — no hype, no emoji.
- **Port-completeness (P-XIII)**: the webhook-config surface has no dead controls; deferred native
  connectors remain honest "coming" states; the generic webhook is honestly the now-live path.
- **Owned data only (P-XIV / FR-019)**: the webhook writes a medium basis **only** when real
  transaction evidence is present — no fabricated verification. "Generic webhook live, native OAuth
  coming" is stated honestly; nothing implies Shopify-native works.
- **Plan-not-code (P-XV)**: N/A — normalize is **media prep, not composition**; the render engine is
  T8. No runtime plan, no agent-authored code.
- **No-LLM-in-render (P-XVI)**: N/A — no render in this slice; normalization is deterministic ffmpeg.

## Assumptions

- **Settled (do not re-open)**: generic spine only (native OAuth deferred); Inngest orchestration (no
  new *app* dep — emit via Event API); Railway media host shared with T8; no media work in Vercel;
  reuse the T7.2 `capture_request` + token model unchanged; reuse the T7.5 `verification_basis` +
  resolver unchanged (medium basis lights the stamp via the forward contract); `/c/[token]` untouched;
  webhook auth = per-workspace shared secret (not OAuth/user auth).
- The app emits Inngest events via a `fetch` POST to the Inngest Event API (Decision 5) so the
  **app dependency count stays 11**; the Inngest **SDK + functions live on the Railway worker**.
- The normalize worker shares the repo's Drizzle **schema** as the single source of truth (the worker
  reads/writes the same Neon DB); worker runtime deps (ffmpeg, Inngest SDK, R2 + DB clients) are
  host-side, separate from the app's 11.
- Both Inngest and Railway require **Cornel-owned provisioning** (env + service setup) before the
  live path runs; the build stays green without it (T6 pattern).
- The Bristle Inngest re-registration risk is mitigated by an explicit worker **re-sync on deploy**
  step, not assumed.
- **Resolved at clarify (2026-06-30 — see Resolved Decisions)**: Q1 normalize = video-first (cap +
  re-encode + rotation bake) + photo resize, audio deferred (no audio capture yet, T7.2b); Q2 the
  webhook URL+secret live in a minimal honest spot but the secret is **real and authenticating**
  (workspace-scoped), not decorative; Q3 additive `normalized_media_url` + `media_status` enum,
  `mediaUrl` never overwritten; Q4 new captures only (no fixture backfill); Q5 app emits via the
  Inngest Event API (no SDK, stays 11 deps), SDK+ffmpeg on the worker. Idempotency on both layers
  (Addition A) and Inngest re-sync on every redeploy (Addition B) are explicit requirements.
