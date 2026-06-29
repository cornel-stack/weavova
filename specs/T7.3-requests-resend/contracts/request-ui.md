# Contract — Request UI port map (`/app/requests`, `/app/requests/new`, ref-23 modal)

Faithful ports of `design-reference/Weavova/` screens **05**, **06**, **23**. Authenticated `/app`
surfaces (middleware gate + workspace-scoped reads), Pressroom tokens, light + dark, breakpoints
`480 / 1024 / 1280`. **Layout-faithful on the first pass** (P-V) — read the named PNG/HTML before
building each.

## Ref 05 — Collection requests (`/app/requests/page.tsx` + `requests-grid.tsx`)

- **Binding ref**: `The Workspace/05 _ Collection requests  _app_requests.png`.
- Server page: `listRequestTemplates()` (ws-scoped) → renders the grid; top bar with title
  **"Collection requests"**, the **⌘K search/jump**, and a persimmon **"+ New request"** → `/app/requests/new`.
- **`SAVED TEMPLATES`** section: a responsive card grid. Each card (faithful to 05):
  - title (template name, display serif) + a delivery chip top-right (**Email** / **Link**, with icon)
  - the prompt quote (e.g. "Show it in use") in quotes
  - a footer rule with: trigger label (`Shopify · 3 days after fulfillment` or `shared on demand · On
    demand`) on the left, **`N sent`** (real count) on the right.
- **States**: empty (no templates → honest "create your first request" invite, no fake rows);
  loading (skeleton consistent with other `/app` lists); error.
- **Scoping**: only the current workspace's templates (P-V two-layer).

## Ref 06 — Request builder (`/app/requests/new/page.tsx` + `request-builder.tsx`)

- **Binding ref**: `The Workspace/06 _ Request builder  _app_requests_new.png`.
- Top bar: **"← Requests"** breadcrumb, title **"New request"**, persimmon **"Save template"**.
- **Left form** (client):
  - **TRIGGER — WHO GETS THIS & WHEN**: chips `Shopify` · `Stripe` · `Calendly` · `Manual link`.
    **`Manual link` is the only selectable/live** option; the three automated chips render as honest
    **"coming"** states (dimmed + a small "soon" affordance; selecting one shows the deferred-automation
    explanation, never wires it — P-XIII / D5). Selecting `Manual link` shows the manual create CTA.
  - **PROMPT SET**: selectable prompt chips (e.g. "Show it in use", "Before & after", "What problem did
    it solve?", "How was the service?").
  - **Delivery channel**: Email / Link toggle.
  - **Send timing**: text field (e.g. "3 days after fulfillment") — informational for `manual_link`.
  - **Consent line** (`versioned · v2`): textarea, the verbatim consent shown at capture (P-VII).
- **Right preview** — **"CUSTOMER SEES"**: a phone frame rendering the capture prompt (the `/c/[token]`
  look) with the chosen prompt + the consent line; the customer is the headline (P-II). Presentational
  only — reuses the capture prompt styling, not the live capture component.
- **Actions**: **Save template** → `saveTemplate(...)`; with **Manual link** selected, a **create**
  action → `createAndSendRequest({ channel, ... })` → shows the copyable `/c/[token]` URL (Link) or the
  sent/honest-failure state (Email).
- **States**: invalid (missing name/prompt/consent) inline; save success; create success (link/sent);
  send failure (honest).

## Ref 23 — Ask this customer for more (`ask-for-more-modal.tsx` + `proof-detail-actions.tsx`)

- **Binding ref**: `Derived surfaces & states/23 _ Ask this customer for more.png`.
- **Entry**: add **"Ask this customer for more"** to `proof-detail-actions.tsx` — rendered for **any**
  proof regardless of `consentState` (outreach, D4); "Make a clip" stays consent-gated as today
  (additive change; the panel no longer returns `null` for non-granted proof — it shows this control).
- **Modal** (client, on `/app/proof/[id]`): title **"Ask for more"**, subtitle **"Send a follow-up to
  {Customer}."**, a customer card (avatar + name + `Shopify · Soy candle · Fig & Cedar`-style meta from
  the proof), **Channel** Email/Link toggle, a **Message** textarea pre-filled with the verbatim
  scaffold ("Hi {first} — thank you again! Would you be up for a quick follow-up …"), **Cancel** /
  persimmon **"Send via Email"** (label switches to "Copy link" for the Link channel).
- **Recipient**: no stored email (C7) → an **email input** is required for the Email channel (prefill
  the name, never an address). Empty/invalid → honest inline error.
- **Send** → `createAndSendRequest({ channel, recipientEmail, customerName, message })`:
  - Email accepted → success state ("Sent to {email}").
  - Email failed → honest "couldn't send — copy the link or retry" (the minted link is shown).
  - Link → the copyable `/c/[token]` URL.
- **A11y**: focus-trapped modal, labelled controls, Escape/Cancel close, `role="alert"` errors.

## Nav / shell

- The **Requests** nav entry already points at `/app/requests` (`src/lib/nav.ts`) — the route simply
  becomes live; **no nav edit** (additive — other entries undisturbed, P-V).

## Constitution at the UI layer

- **P-V**: every surface names its binding ref; two-layer workspace scoping on lists.
- **P-XIII**: automated triggers + (deferred) delivery detail are honest "coming"; no dead controls.
- **P-XIV**: `N sent` real; no opens/clicks; no fabricated states.
- **P-II**: builder preview + email keep the customer the headline; email brand-framed.
- **P-XVII**: verbatim design copy; no hype/emoji.
