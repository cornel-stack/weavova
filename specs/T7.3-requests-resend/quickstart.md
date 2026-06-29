# Quickstart — T7.3 Requests via Resend verification

No test runner (P-III). Verification = `typecheck`/`lint`/`build` green + a walk of the three ported
surfaces + the Resend send + the **integration guard** (public page zero-change). Run from repo root.

## Prerequisites

- `.env.local` with `DATABASE_URL` (Neon), `AUTH_RESEND_KEY`, `AUTH_EMAIL_FROM` (the verified T6
  sender), and an app origin for absolute capture URLs.
- Migrations through T7.2 applied (`0006`, `0007`).

## 1. Migrate + seed (additive)

```bash
npm run db:generate     # emits drizzle/0008_*.sql — enums (request_trigger/channel/delivery_status)
                        # + request_template + request_send tables + capture_request.customer_email
npm run db:migrate
npm run db:seed         # adds a few request_templates + honest request_send rows (real N sent)
```

**Expected**: `0008` is **additive** — no existing table/column altered; the `capture_request` token
columns are unchanged. Seed prints the template + send counts.

## 2. Build green

```bash
npm run typecheck && npm run lint && npm run build
```

## 3. Requests templates surface (ref 05)

- Open `/app/requests` as the seeded member.

**Expected**: the **Collection requests** templates grid (ref 05) — each card with prompt, trigger
label, delivery chip, and a **real `N sent`** count (= seeded `request_send` rows, not a mock number).
A persimmon **"+ New request"** → `/app/requests/new`. Empty state honest if no templates. Only this
workspace's templates appear.

## 4. Request builder (ref 06)

- Open `/app/requests/new`.

**Expected**: the builder (ref 06) — TRIGGER row with **Manual link** selectable and
**Shopify/Stripe/Calendly as honest "coming"** states (not wired); PROMPT SET; Delivery channel; Send
timing; versioned **Consent line**; the **"CUSTOMER SEES"** preview reflecting the prompt + consent
line. **Save template** persists a `request_template` (appears in `/app/requests`). With **Manual link**
+ create, a copyable `/c/[token]` URL (Link) or a sent/honest-failure state (Email).

## 5. Ask this customer for more (ref 23) — the loop-closer

- Open a proof at `/app/proof/[id]`; click **"Ask this customer for more"**.

**Expected**: the ref-23 modal, pre-addressed to that customer (name prefilled, **email empty** — none
stored), Channel Email/Link, an editable verbatim message. 
- **Email**: enter a recipient → "Send via Email" → a `capture_request` is minted (with
  `customer_email`), a brand-framed Resend email is sent carrying the link, and a `request_send` row is
  recorded `accepted`.
- **Link**: a copyable `/c/[token]` URL; no email.
- **Resend failure**: the request/link still exists; an honest "couldn't send — copy the link or retry"
  shows; the request is **not** marked sent (`request_send.deliveryStatus='failed'`).

## 6. Resend email content

**Expected**: the email is **brand-framed** (workspace brand colour/logo or neutral fallback), carries
a single CTA to the `/c/[token]` link, ends with **"powered by Weavova"**, and contains **no tracking
pixel/links** (we never store opens/clicks).

## 7. Honest status tracking (P-XIV)

**Expected**: each request reflects only **created / sent / accepted-for-delivery / used / expired**
from stored data + Resend acceptance. **No opens/clicks** anywhere. A used request (customer submitted)
shows **used**; past 72h shows **expired**.

## 8. Integration guard — public page ZERO change (D8, FR-022)

- Take the `/c/[token]` URL from a merchant-created request (step 4 or 5) and open it.

**Expected**: it renders the **T7.2 capture page identically to a seeded request** — same prompt,
brand, consent flow, single-use/expiry behavior. **Confirm via grep that `src/app/c/[token]/**` has
ZERO edits in this slice.** If the public page required any change, that is a P-V/integration violation
— STOP and surface it.

## Done when

- `0008` applied (additive); seed adds templates + honest `request_send` rows.
- `typecheck` + `lint` + `build` green.
- 05 grid, 06 builder, 23 modal render faithfully in light + dark with empty/loading/error/sent states.
- A request can be sent by Email (brand-framed Resend) and by Link; Resend failure is honest.
- `N sent` = real `request_send` count; no opens/clicks shown.
- Merchant-created requests resolve on `/c/[token]` identically to seeded; **0** edits to the public page.
- No new dependency (still 11); token model unchanged.
