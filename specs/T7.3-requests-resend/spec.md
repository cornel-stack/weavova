# Feature Specification: T7.3 — Requests via Resend

**Feature Branch**: `T7.3-requests-resend`

**Created**: 2026-06-29

**Status**: Clarified — ready for `/speckit.plan`

**Input**: User description: "T7.3 — Requests via Resend. Merchant-side 'send the ask' that closes the capture loop: in-app surfaces to create a capture request (T7.2's primitive, now person-driven) and send the /c/[token] link to a customer by email via Resend. Fills the stubbed Requests nav entry."

---

## Design-vs-Scope Reconciliation (resolved)

Step 0 (Principle V) located all three named design screens and reading them faithfully surfaced a
material gap between the original slice description and what the designs depict. **That gap is now
reconciled** by the clarifications below — the spec is rewritten to match the **designs** (a
templates surface + a person-driven manual modal), not the original "manual request list" framing.

**Binding references (paths confirmed; none missing):**

| Ref | File | Route |
|---|---|---|
| **05** Collection requests | `design-reference/Weavova/The Workspace/05 _ Collection requests  _app_requests.png` (+ `.html`) | `/app/requests` |
| **06** Request builder | `design-reference/Weavova/The Workspace/06 _ Request builder  _app_requests_new.png` (+ `.html`) | `/app/requests/new` |
| **23** Ask this customer for more | `design-reference/Weavova/Derived surfaces & states/23 _ Ask this customer for more.png` (+ `.html`) | modal on `/app/proof/[id]` |

**The reconciled model:**

1. **`/app/requests` (05) is a "Saved templates" grid** — reusable asks (title, prompt quote,
   trigger label, delivery chip, real `N sent` count). Ported faithfully as a **templates** surface.
2. **`/app/requests/new` (06) is a template builder** — TRIGGER row, PROMPT SET, Delivery channel,
   Send timing, versioned Consent line, "CUSTOMER SEES" preview. "Save template" persists a reusable
   template. **Trigger automation (Shopify/Stripe/Calendly "fires X after fulfillment") is the
   DEFERRED webhook/Sources track** — in T7.3 it is an honest **P-XIII "coming"** state; **Manual
   link** is the only live trigger type.
3. **The person-driven manual send is screen 23 ("Ask for more")** — a modal from a proof,
   pre-addressed to that proof's customer, Email/Link + editable message. This is **the primary
   loop-closer of T7.3**; 05/06 are the surrounding templates surface.
4. **No customer email is stored today** (`capture_request`/`proof` carry `customerName` only). T7.3
   adds an **additive `customer_email`** column to `capture_request` (approved); the merchant enters
   the recipient address (free-email entry); send via Resend. **The token model itself does not
   change**, and the public `/c/[token]` page is untouched.

## Clarifications

### Session 2026-06-29

- Q: Recipient email & send capability (C1) → A: **A** — real email send; add additive
  `customer_email` to `capture_request`; merchant enters recipient; send via Resend (reuse T6 setup).
- Q: Surface model & per-request status (C2) → A: **A, de-scoped** — port 05/06 faithfully as a
  **templates** surface (additive `request_template` entity; real `N sent`). Trigger **automation is
  deferred** (honest "coming" state, not wired); "Manual link" is the live trigger type. Templates UI
  now; trigger automation later (Sources track).
- Q: Screen 23 ("Ask this customer for more") scope (C3) → A: **B (override fast-follow)** — **in
  T7.3**. It is the only person-driven manual send path in the design and manual send is the
  loop-closing purpose of the slice; deferring it would leave T7.3 unable to actually send a request.
- Q: Resend sender identity (C4) → A: **Reuse the T6 sender** (`AUTH_EMAIL_FROM`); use a
  request-specific sender only if trivially better, else reuse (flag, don't block).
- Q: Open/delivery tracking (C5) → A: **"Sent"-only** — record Resend accepted-for-delivery (+ a
  delivery confirmation if Resend returns it cheaply); **no opens/clicks** (cannot honestly verify —
  P-XIV).
- Q: QR dependency (C6) → A: **Link-only**, no QR dependency this slice (QR rides the deferred
  packaging/automation use case).
- Q: Recipient input mode (C7) → A: **Free-email entry** (no stored customer directory; `customerName`
  only — selection can pre-fill a name, never an address).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Ask an existing customer for more (Priority: P1, the loop-closer)

As a merchant viewing a proof, I click **"Ask this customer for more"** and a modal (ref **23**)
opens pre-addressed to that customer. I confirm the Email/Link channel, edit the message, enter the
recipient's email (none is stored), and send — Weavova mints a new T7.2 `capture_request` for them
and (Email) dispatches a brand-framed message via Resend carrying the `/c/[token]` link.

**Why this priority**: This is the only person-driven manual send path in the design and the
loop-closing purpose of the slice — without it the funnel cannot actually send a request.

**Independent Test**: From `/app/proof/[id]`, open the modal; it is pre-addressed to that proof's
customer; sending mints a workspace-scoped, single-use, 72h `capture_request`; (Email) a Resend
message is dispatched to the entered address; (Link) a copyable `/c/[token]` URL is produced that
opens the T7.2 capture page identically to a seeded request.

**Acceptance Scenarios**:

1. **Given** a proof, **When** I click "Ask this customer for more", **Then** the ref-23 modal opens
   pre-addressed to that customer with the verbatim message scaffold and Email/Link channel.
2. **Given** the modal with **Email**, **When** I enter a valid recipient email and "Send via Email",
   **Then** a `capture_request` (with `customer_email`) is minted and a brand-framed email
   ("powered by Weavova") carrying the link is sent via Resend; the request records the recipient +
   a sent timestamp.
3. **Given** the modal with **Link**, **When** I choose Link, **Then** a copyable `/c/[token]` URL is
   produced (no email sent) that opens the T7.2 capture page identically to a seeded request.
4. **Given** an empty/invalid recipient on the Email path, **When** I try to send, **Then** I get an
   honest validation error and no half-sent request is left behind.
5. **Given** a transient Resend failure, **When** the send fails, **Then** I see an honest error and
   can retry; the request never claims "sent" when it was not (P-XIV).

---

### User Story 2 — See the Requests templates surface, faithfully ported (Priority: P1)

As a merchant, I open the **Requests** nav entry (previously stubbed) and see **Collection requests**
(ref **05**): my workspace's saved request templates as a card grid — each with its prompt, trigger,
delivery chip, and a real `N sent` count — plus a **New request** action. The empty state is honest.

**Why this priority**: It turns the dead nav entry into a real surface and frames the builder; fully
demonstrable on fixtures with no send capability.

**Independent Test**: Navigate to `/app/requests` as an authenticated member; the grid renders only
this workspace's templates (two-layer scoping), matches ref 05 in light + dark at the breakpoints,
and the empty/loading states render. No control is dead.

**Acceptance Scenarios**:

1. **Given** a workspace with saved templates, **When** I open `/app/requests`, **Then** I see the
   template grid (ref 05) — each card with prompt, trigger label, delivery chip, and a real `N sent`
   count (count of requests created from that template; owned data, P-XIV).
2. **Given** a workspace with no templates, **When** I open `/app/requests`, **Then** I see an honest
   empty state inviting me to create the first request — no fabricated sample rows.
3. **Given** another workspace's templates exist, **When** I view my list, **Then** I see **only** my
   workspace's templates (workspace-scoped read, P-V two-layer).

---

### User Story 3 — Build and save a request template (Priority: P2)

As a merchant, I open the **Request builder** (ref **06**), choose a prompt set, write/confirm the
versioned consent line, pick a delivery channel and send timing, and **Save template** — a reusable
ask for my workspace. The builder shows a live preview of what the customer will see. For the
**Manual link** trigger I can also mint a request immediately and get a copyable link (or email it);
the **Shopify/Stripe/Calendly** triggers render as honest "coming" states.

**Why this priority**: It completes the templates surface and the merchant's configuration story, but
the loop can be closed via US1 without saving a template first.

**Independent Test**: In the builder, configure and Save template → a `request_template` is persisted
(workspace-scoped) and appears in the US2 grid; selecting **Manual link** + create mints a
`capture_request` whose link opens the public page identically to a seeded request; automated
triggers are visibly non-wired "coming" states.

**Acceptance Scenarios**:

1. **Given** the builder, **When** I configure a prompt set + consent line and **Save template**,
   **Then** a workspace-scoped `request_template` is persisted and shown in the `/app/requests` grid.
2. **Given** the **Manual link** trigger, **When** I create a request, **Then** a `capture_request`
   is minted (per-request token, 72h, single-use) and a copyable `/c/[token]` URL is shown; opening
   it renders the T7.2 capture page (public page untouched).
3. **Given** the **Shopify/Stripe/Calendly** triggers, **When** I view them, **Then** they are honest
   **"coming"** states (P-XIII) — visible per the port, not wired; the automation copy describes the
   deferred behavior without claiming it works.
4. **Given** the builder, **When** I edit the prompt/consent line, **Then** the "CUSTOMER SEES"
   preview reflects exactly what the customer will see; the customer remains the headline (P-II).
5. **Given** the consent line, **Then** it is the versioned text carried into the T7.2 capture
   consent flow — verbatim, never model-authored or altered.

---

### User Story 4 — Track what actually happened to a request (Priority: P2)

As a merchant, I can see the honest state of requests I have sent — **created**, **sent** (recipient
+ timestamp; plus Resend's accepted-for-delivery confirmation if returned cheaply), **used** (the
customer submitted), and **expired** — with no opens/clicks or other unverifiable engagement.

**Why this priority**: Makes the surface trustworthy; the funnel runs without it and it builds on the
data US1/US3 already write.

**Independent Test**: After sending requests and capturing one, each request reflects its true state
from stored data + (if returned) Resend's delivery acceptance; no state is shown we cannot verify.

**Acceptance Scenarios**:

1. **Given** a sent request, **When** the customer submits proof, **Then** the request shows **used**
   (the T7.2 single-use consume already flips status).
2. **Given** a sent request past its 72h window, **When** I view it, **Then** it shows **expired**.
3. **Given** an Email send, **When** Resend accepts it for delivery, **Then** the request may show a
   **delivery confirmation**; opens/clicks are **never** shown (P-XIV).

---

### Edge Cases

- **No stored email** (the default reality): every Email path must collect a recipient address; there
  is no address to pre-fill — only `customerName`.
- **Duplicate sends**: sending to the same customer twice mints two independent single-use requests
  (each its own token); the surface must not imply they are one.
- **Expired vs used race**: a request used just before expiry shows **used** (status authoritative on
  consume), not expired.
- **Resend reports nothing**: if no delivery acceptance returns, the request stays **sent** — it never
  silently upgrades to "delivered/opened" (P-XIV).
- **Workspace switch**: templates + requests re-scope to the active workspace; no cross-workspace leak.
- **Template with 0 sent**: shows `0 sent` honestly, not hidden.
- **Brand kit missing**: the email + preview fall back to neutral Pressroom framing with "powered by
  Weavova" (no fabricated brand).
- **Automated trigger tapped**: selecting Shopify/Stripe/Calendly surfaces the honest "coming" state;
  it never mints or sends.

## Requirements *(mandatory)*

### Functional Requirements

**Ask for more (ref 23) — the loop-closer**

- **FR-001**: A proof detail (`/app/proof/[id]`) MUST offer **"Ask this customer for more"** opening
  the ref-23 modal, ported faithfully (customer card, Email/Link channel, editable verbatim message
  scaffold, Cancel / "Send via Email"), light + dark.
- **FR-002**: The modal MUST be pre-addressed to that proof's customer (name from the proof) and MUST
  collect a **recipient email** (none is stored) before an Email send; the email is validated.
- **FR-003**: Sending MUST mint a new T7.2 `capture_request` (per-request token, 72h expiry,
  single-use, workspace-scoped, `link` source) carrying the recipient `customer_email`.
- **FR-004**: The **Email** channel MUST send a brand-framed message via Resend carrying the
  `/c/[token]` link; the **Link** channel MUST yield a copyable `/c/[token]` URL with no email sent.

**Requests templates list (ref 05)**

- **FR-005**: The **Requests** nav entry MUST become a live route at `/app/requests` (previously
  stubbed), additively — without disturbing other nav entries (P-V).
- **FR-006**: `/app/requests` MUST render **Collection requests** ported faithfully from ref 05
  (saved-templates card grid: prompt quote, trigger label, delivery chip, `N sent` count), light +
  dark, layout-accurate on the first pass.
- **FR-007**: The list MUST be **workspace-scoped** (two-layer: middleware gate + workspace-scoped
  read) — only the current workspace's templates.
- **FR-008**: Each template's `N sent` MUST be **real owned data** (count of requests created from
  that template); no fabricated counts (P-XIV).
- **FR-009**: The surface MUST render honest **empty / loading / error** states; no dead controls.

**Request builder (ref 06)**

- **FR-010**: `/app/requests/new` MUST render the **Request builder** ported faithfully from ref 06
  (TRIGGER row, PROMPT SET, Delivery channel, Send timing, versioned Consent line, "CUSTOMER SEES"
  preview), light + dark.
- **FR-011**: **Save template** MUST persist a workspace-scoped **`request_template`** that appears in
  the `/app/requests` grid.
- **FR-012**: The **Manual link** trigger MUST be the only wired trigger type this slice; creating a
  request from it mints a `capture_request` and produces a copyable link (or emails it).
- **FR-013**: The **Shopify / Stripe / Calendly** triggers MUST render as honest **"coming"** states
  (P-XIII) — the automation copy describes the deferred behavior without claiming it is active; they
  never mint or send. (The webhook/Sources automation is a later track — a recorded scope boundary.)
- **FR-014**: The builder's versioned **Consent line** MUST be the text carried into the T7.2 capture
  consent flow — verbatim, never model-authored or altered.
- **FR-015**: The "CUSTOMER SEES" preview MUST reflect the chosen prompt + consent line as the
  customer will see them; the customer remains the headline (P-II).

**Send via Resend**

- **FR-016**: Email sends MUST use the **Resend** setup provisioned in T6 (no new provider), reusing
  the **T6 sender** (`AUTH_EMAIL_FROM`); a request-specific sender is used only if trivially better
  (else reuse) — flag any new verified-sender requirement, do not block.
- **FR-017**: The email MUST be **brand-framed** (workspace brand kit; "powered by Weavova") and carry
  the `/c/[token]` link.
- **FR-018**: A failed Resend send MUST NOT record "sent"; the merchant sees an honest error and can
  retry (P-XIV).

**Recipient persistence (additive model change — approved)**

- **FR-019**: Persisting the recipient REQUIRES an **additive** `customer_email` column on
  `capture_request` (additive only — does NOT change the token model). Recipient entry is
  **free-email entry** (no stored customer directory; `customerName` only).

**Status tracking**

- **FR-020**: The system MUST surface each request's honest state — **created / sent / used /
  expired** — from stored data (T7.2 flips **used** on consume; `expires_at` is authoritative).
- **FR-021**: The system MUST show only **"sent"** plus Resend's **accepted-for-delivery**
  confirmation if returned cheaply; it MUST NOT show opens/clicks or any unverifiable engagement
  (P-XIV).

**Integration guard**

- **FR-022**: A merchant-created request MUST resolve on the public `/c/[token]` page **identically
  to a seeded request** — the token model is unchanged and the public page is untouched. If creating a
  request appears to need any change to the token model (beyond the additive `customer_email`), STOP.
- **FR-023**: All request templates / builder / list / Ask-for-more surfaces are **authenticated
  `/app`** surfaces behind the middleware gate, reading the **current workspace** (unlike the public
  `/c/[token]` page).
- **FR-024**: QR rendering is **out** this slice (link-only; no new dependency) — the QR use case
  rides the deferred packaging/automation track.

### Key Entities *(include if feature involves data)*

- **Capture request** (existing, T7.2; **+ additive `customer_email`**): `token`, `workspaceId`,
  `sourceId` (`link`), `customerName?`, **`customerEmail?` (NEW — recipient for the Email path)**,
  `transactionRef?`, `status` (open/used/expired), `expiresAt`, `usedAt`, `createdAt`. Optional
  `templateId?` linkage when created from a template (for the `N sent` count).
- **Request template** (NEW, additive, in-scope): a reusable ask — title, prompt set, trigger type
  (Manual link wired; automated = coming), delivery channel, send timing, versioned consent line; the
  `N sent` count is derived from requests referencing it. Workspace-scoped.
- **Send record** (owned data): the recipient `customer_email` + sent timestamp, and Resend's
  accepted-for-delivery confirmation if returned — no opens/clicks.
- **Workspace / membership** (existing, T6): scopes every read; the merchant identity.
- **Brand kit** (existing, T5): frames the email + the preview.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a proof, a merchant can send a customer a working capture link (Email sent, or Link
  copied) via the Ask-for-more modal in **under 60 seconds**, with no dead controls.
- **SC-002**: From **Requests**, a merchant can reach a working capture link (save/use a template +
  Manual link) in **under 90 seconds**.
- **SC-003**: **100%** of merchant-created requests resolve on the public capture page identically to
  seeded requests; **0** changes to the public `/c/[token]` page and **0** token-model changes (only
  the additive `customer_email`).
- **SC-004**: Templates and requests lists show **only** the current workspace's data in **100%** of
  cross-workspace checks (no leak).
- **SC-005**: **0** fabricated metrics or states — every count/status is traceable to stored data or
  Resend's accepted-for-delivery; no opens/clicks shown (auditable against P-XIV).
- **SC-006**: Every surface renders correct **empty / loading / error / sent** states in light + dark
  at the defined breakpoints; automated triggers are visibly honest "coming" states.
- **SC-007**: An emailed request arrives **brand-framed** (workspace brand + "powered by Weavova") and
  its link opens the capture page on first click.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: The builder preview and the request email keep the customer's
  prompt/quote central; the email is brand-framed, chrome quiet. The Ask-for-more modal sits on the
  proof detail, where the real customer is already the headline.
- **Port, don't redesign (P-V)**: Ported from refs **05** (`/app/requests`), **06**
  (`/app/requests/new`), **23** (Ask-for-more modal); layout-faithful on the first pass; two-layer
  workspace scoping on the lists. The design's automation is rendered as honest "coming", not invented
  or removed (P-XII / P-XIII).
- **Fixtures-first (P-VI)**: Built/demonstrated on fixtures shaped exactly like the real schema,
  including the additive `customer_email` and the `request_template` entity.
- **Consent (P-VII)**: The request carries the **versioned consent line** the customer affirms at
  capture (T7.1/T7.2), verbatim and not model-authored. T7.3 generates no clips — no
  clip-from-non-consented-proof concern.
- **No editor (P-VIII)**: N/A — the builder and modal are forms, not a timeline/scrubber.
- **Scope (P-IX)**: A single vertical slice within T7 — the manual merchant send (modal + templates +
  builder + Resend). The **trigger automation (webhook/Sources track)** and the **verified bar (T7.5)**
  are explicitly out, rendered as honest deferred states where the design shows them.
- **Microcopy (P-XVII)**: Verbatim design copy; no "amazing"/"awesome", no emoji.
- **Port-completeness (P-XIII)**: Automated triggers and deferred delivery/QR are honest
  "coming"/absent states — no dead controls.
- **Owned data only (P-XIV)**: `N sent`, recipients, and statuses are real; only Resend's
  accepted-for-delivery is surfaced beyond "sent"; no invented engagement.
- **Plan-not-code (P-XV)**: N/A — non-render slice.
- **No-LLM-in-render (P-XVI)**: N/A — non-render slice.

## Assumptions

- **Reuse, no new provisioning**: Resend (T6) is the provider, reusing the T6 sender
  (`AUTH_EMAIL_FROM`); the T7.2 `capture_request` primitive (token, 72h, single-use, `link` source)
  and the public `/c/[token]` page are reused unchanged. Recipient persistence is **additive**
  (`customer_email`).
- **Templates UI now, automation later**: the `request_template` entity + builder ship in T7.3;
  trigger automation (Shopify/Stripe/Calendly + send-timing-relative-to-fulfillment) is the deferred
  Sources/webhook track, rendered as honest "coming" states.
- **Verified bar deferred**: no verified-stamp implications (T7.5); `transactionRef` /
  `verification_basis` untouched.
- **Auth/scoping reused**: T6 middleware gate + workspace-scoped reads; the merchant is a workspace
  member; lists show only the active workspace's data.
- **Fixtures-first**: surfaces are demonstrable on fixtures shaped like the real schema before the
  Resend send is exercised live.
- **Tracking is honest-minimal**: created/sent/used/expired + Resend accepted-for-delivery if cheap;
  no opens/clicks (P-XIV).
