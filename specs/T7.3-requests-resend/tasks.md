---
description: "Task list for T7.3 — Requests via Resend"
---

# Tasks: T7.3 — Requests via Resend

**Input**: Design documents from `specs/T7.3-requests-resend/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D8), data-model.md, contracts/ (request-actions, request-ui), quickstart.md
**Tests**: No test runner (P-III idiom) — verification = `typecheck`/`lint`/`build` green + the `quickstart.md` walk. No test tasks.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different file, no incomplete-task dependency)
- **[Story]**: US1–US4 (user-story phases only)
- Every task names exact file path(s) + a concrete DoD + constitution tag.

**Settled inputs (do not re-open)**: D1 = `request_send` log (not the column fallback). Three additive
entities (`capture_request += customer_email`; `request_template` NEW; `request_send` NEW); migration
**0008 additive only — token columns UNTOUCHED**. Resend via thin `fetch` helper (no new dep; reuse
`AUTH_RESEND_KEY`/`AUTH_EMAIL_FROM`). Send = mint durable FIRST, email best-effort, honest failure
(D3). Triggers: Manual link LIVE; Shopify/Stripe/Calendly honest "coming" (P-XIII). Tracking:
created/sent/accepted/used/expired only, **no opens/clicks** (P-XIV). Link-only (no QR). Free-email entry.

> **STOP-and-surface guard (P-V)**: any task that appears to need an edit to `src/app/c/[token]/**`
> (the public capture page) or to the `capture_request` token columns (token/expiry/single-use
> resolution) is a P-V/integration violation — **STOP and surface, do not implement**.

---

## Phase 1: Setup

- [X] T001 [P] Create `src/lib/requests.ts` — client-safe view types + constants only (no DB imports):
      `TriggerOption` (`{ value: 'manual_link'|'shopify'|'stripe'|'calendly'; label; wired: boolean }`
      with only `manual_link` wired), `RequestChannel` (`'email'|'link'`), `TemplateCardView`,
      `AskForMoreView`, and the prompt-set + verbatim message scaffold constants (from `request-ui.md`).
      **DoD**: type-only module imports clean; mirrors the data-model derived views; no secrets/DB code.
      **Constitution**: P-XIII (wired flag drives honest "coming"), P-XIV.

---

## Phase 2: Foundational (blocking prerequisites for ALL stories)

- [X] T002 Add the additive schema in `src/db/schema.ts`: enums `request_trigger`
      (`manual_link|shopify|stripe|calendly`), `request_channel` (`email|link`),
      `request_delivery_status` (`accepted|failed|link_generated`); table `request_template`
      (workspaceId FK cascade, name, prompt, triggerType, deliveryChannel, sendTiming?, consentLine,
      consentVersion, createdAt; `request_template_ws_idx`); table `request_send` (requestId FK
      capture_request cascade, templateId FK request_template set-null, workspaceId FK cascade, channel,
      recipientEmail?, deliveryStatus, providerId?, createdAt; `request_send_template_idx`,
      `request_send_request_idx`); and `capture_request.customerEmail` (text, nullable).
      **DoD**: drizzle schema compiles; **token columns of `capture_request` are unchanged** (only
      `customer_email` added); matches `data-model.md`. **Constitution**: P-XIV, P-V (token model intact).
- [X] T003 Generate the additive migration `drizzle/0008_*.sql` via `npx drizzle-kit generate`; record
      it + the meta snapshot. **DoD**: `0008` contains only `CREATE TYPE`/`CREATE TABLE`/`ADD COLUMN`
      (no `ALTER`/`DROP` on existing `capture_request` token columns); diff reviewed. *(Applying to the
      shared Neon DB is a manual step — `db:migrate` — flagged in quickstart §1.)* **Constitution**: P-VI.
- [X] T004 Extend `src/db/queries.ts` (additive): add optional `customerEmail` to
      `createCaptureRequest(...)` (passes through to the insert; nothing else changes), and add
      `recordSend({ requestId, templateId?, workspaceId, channel, recipientEmail?, deliveryStatus,
      providerId? })` inserting a `request_send` row. **DoD**: `createCaptureRequest` token/expiry/
      status generation byte-identical to T7.2 aside from the new optional field; `recordSend` returns
      the row id. **Constitution**: P-V (primitive unchanged), P-XIV.
- [X] T005 [P] Create `src/lib/resend.ts` — `sendCaptureRequestEmail(input)` per
      `contracts/request-actions.md`: `POST https://api.resend.com/emails` via `fetch` with
      `Authorization: Bearer ${AUTH_RESEND_KEY}`, body `{ from: AUTH_EMAIL_FROM, to, subject, html }`;
      brand-framed HTML (workspace name + brand colour/logo or neutral Pressroom fallback), single CTA
      to the `/c/[token]` link, "powered by Weavova" footer, **no tracking pixel/links**; returns
      `{ok:true,providerId?}|{ok:false,error}` (never throws). **DoD**: server-only (key never bundled);
      no new dependency (still 11). **Constitution**: P-II (brand-framed), P-III (no dep), P-XIV (no tracking).

---

## Phase 3: User Story 1 — Ask an existing customer for more (Priority: P1) 🎯 THE LOOP-CLOSER

**Goal**: From a proof, send a pre-addressed capture request to that customer via Email/Link (ref 23).
**Independent test**: From `/app/proof/[id]`, open the modal → send Email → a `capture_request` is
minted (with `customer_email`), a brand-framed Resend email goes out, a `request_send` `accepted` row
is written; Link yields a copyable `/c/[token]` URL that opens the T7.2 page identically to a seeded one.

- [X] T006 [US1] Implement `createAndSendRequest(input)` in `src/app/app/requests/actions.ts` (NEW,
      workspace-scoped server action) per `contracts/request-actions.md` + D3: resolve current
      workspace + `link` source; validate `recipientEmail` for Email (`invalid` → no mint); mint via
      `createCaptureRequest(..., customerEmail)`; build the absolute `/c/${token}` URL; `recordSend`;
      **Link** → `link_generated` + return URL; **Email** → call `sendCaptureRequestEmail`, on ok →
      `accepted` (+providerId), on fail → `failed` returning `sent_failed` with the usable URL. NEVER a
      false "sent"; no proof/consent written here. **DoD**: returns the discriminated result; `revalidatePath`.
      **Constitution**: P-XIV (honest status), P-V (token-model untouched), P-II.
- [X] T007 [US1] Port the ref-23 modal to `src/components/app/proof-detail/ask-for-more-modal.tsx`
      (client) — **binding ref `Derived surfaces & states/23 _ Ask this customer for more.png`**:
      title "Ask for more", subtitle "Send a follow-up to {Customer}.", customer card (name + meta from
      the proof), Channel Email/Link toggle, Message textarea pre-filled with the verbatim scaffold,
      required recipient **email input** (no stored email — prefill name only), Cancel / persimmon "Send
      via Email" (→ "Copy link" for Link). Focus-trapped, labelled, Escape closes, `role="alert"` errors.
      **Layout-faithful on the first pass.** **DoD**: matches ref 23 in light + dark; calls
      `createAndSendRequest`. **Constitution**: P-V, P-II.
- [X] T008 [US1] Wire the entry in `src/components/app/proof-detail/proof-detail-actions.tsx` (additive,
      D4): render "Ask this customer for more" for **any** proof (regardless of `consentState`), opening
      the modal; keep "Make a clip" consent-gated exactly as today (the panel no longer returns `null`
      for non-granted proof — it shows this outreach control). **DoD**: granted + non-granted proofs both
      show the control; Make-a-clip gating unchanged. **Constitution**: P-XIII (no dead control), P-V.
- [X] T009 [US1] Implement the modal's honest result states: Email accepted → "Sent to {email}"; Email
      failed (`sent_failed`) → honest "couldn't send — copy the link or retry" with the minted link
      shown; Link → copyable URL + copied confirmation; invalid email → inline error. **DoD**: every
      branch of `createAndSendRequest` has a visible honest state; nothing claims sent on failure.
      **Constitution**: P-XIV.

---

## Phase 4: User Story 2 — Requests templates surface (Priority: P1)

**Goal**: The live `/app/requests` Collection-requests templates grid (ref 05).
**Independent test**: Navigate to `/app/requests` → only this workspace's templates render with real
`N sent` counts; empty/loading states render; "+ New request" → `/app/requests/new`.

- [X] T010 [US2] Add `listRequestTemplates()` to `src/db/queries.ts` — workspace-scoped read returning
      `TemplateCardView[]`; **`sentCount` = `count(request_send WHERE template_id = id)`** (real owned
      data, D6). **DoD**: scoped to the current workspace; count is a live aggregate, not stored/faked.
      **Constitution**: P-XIV, P-V (two-layer scoping).
- [X] T011 [US2] Create `src/app/app/requests/page.tsx` (server, ws-scoped via `getCurrentWorkspace`) +
      `src/app/app/requests/requests-grid.tsx` — **binding ref `The Workspace/05 _ Collection requests
      _app_requests.png`**: top bar "Collection requests" + ⌘K + persimmon "+ New request" →
      `/app/requests/new`; "SAVED TEMPLATES" card grid (name, delivery chip Email/Link, prompt quote,
      footer trigger label + `N sent`). **Layout-faithful first pass**, light + dark. The Requests nav
      route simply becomes live — **no `src/lib/nav.ts` edit** (already points here). **DoD**: renders
      seeded templates; only current workspace's; matches ref 05. **Constitution**: P-V, P-XIV.
- [X] T012 [US2] Empty / loading / error states for `/app/requests` (no templates → honest "create your
      first request" invite, no fake rows; skeleton consistent with other `/app` lists; error).
      **DoD**: all three states render; no fabricated sample data. **Constitution**: P-XIII, P-XIV.

---

## Phase 5: User Story 3 — Build and save a request template (Priority: P2)

**Goal**: The `/app/requests/new` builder (ref 06): Save template; Manual link live; automated triggers
honest-coming; live "CUSTOMER SEES" preview.
**Independent test**: Configure + Save template → a `request_template` persists and appears in the
grid; Manual-link create → a copyable `/c/[token]` URL (or emailed); Shopify/Stripe/Calendly visibly
non-wired "coming".

- [X] T013 [US3] Add `saveTemplate(input)` to `src/app/app/requests/actions.ts` (ws-scoped) per the
      contract: insert a `request_template`; **reject any `triggerType` other than `manual_link`**
      (`invalid`); `revalidatePath('/app/requests')`. **DoD**: persists ws-scoped; automated triggers
      never persist as wired. **Constitution**: P-XIII (D5), P-V.
- [X] T014 [US3] Create `src/app/app/requests/new/page.tsx` (server, ws-scoped) +
      `src/app/app/requests/request-builder.tsx` (client) — **binding ref `The Workspace/06 _ Request
      builder _app_requests_new.png`**: "← Requests" breadcrumb, "New request", persimmon "Save
      template"; TRIGGER row (**Manual link selectable/live**; Shopify/Stripe/Calendly **honest
      "coming"** — dimmed + "soon", selecting shows the deferred-automation note, never wires/mints);
      PROMPT SET chips; Delivery channel; Send timing field; versioned Consent line textarea.
      **Layout-faithful first pass**, light + dark. **DoD**: matches ref 06; Save → `saveTemplate`.
      **Constitution**: P-V, P-XIII.
- [X] T015 [US3] Build the "CUSTOMER SEES" preview panel in `request-builder.tsx` — a presentational
      phone frame rendering the capture prompt + chosen prompt + consent line (reuses capture-prompt
      styling, **not** the live capture component; public page untouched). **DoD**: preview updates with
      the prompt/consent inputs; customer is the headline. **Constitution**: P-II, P-V.
- [X] T016 [US3] Wire the Manual-link **create** action in the builder → `createAndSendRequest({
      channel, recipientEmail?, templateId })` → show the copyable `/c/[token]` URL (Link) or the
      sent/honest-failure state (Email). **DoD**: created request carries `templateId` (feeds `N sent`);
      reuses the US1 action (no duplicate send path). **Constitution**: P-XIV, P-V.

---

## Phase 6: User Story 4 — Honest status tracking (Priority: P2)

**Goal**: Surface created/sent/accepted-for-delivery/used/expired from stored data; no engagement.
**Independent test**: After sending + capturing one, each request reflects its true state; no
opens/clicks anywhere.

- [X] T017 [US4] Surface honest request status where the designs show it (the template grid footer
      and/or a per-template request view): **created / sent / accepted-for-delivery / used / expired**
      derived from `capture_request.status` + `expires_at` + the `request_send.deliveryStatus`; **never**
      opens/clicks. **DoD**: each state maps to stored data per `request-actions.md` honest-state matrix;
      no unverifiable metric rendered. **Constitution**: P-XIV.

---

## Phase 7: Polish & Cross-Cutting

- [X] T018 [P] Extend `src/db/seed.ts` (additive): seed a few `request_template` rows for the demo
      workspace (one `manual_link`, others showing `shopify`/`shared on demand` per ref 05 spirit) + a
      small **real** number of `request_send` rows per template (honest `N sent`, D6) + at least one
      manual `capture_request` (with `customer_email`) for the e2e walk; optionally set `customer_email`
      on a couple of existing seeded requests. **DoD**: seed runs; grid shows honest non-zero counts; no
      change to existing proof/consent/clip fixtures. **Constitution**: P-XIV, P-VI.
- [X] T019 INTEGRATION VERIFY (quickstart §8, P-V): take a `/c/[token]` URL from a merchant-created
      request (T016 or T006) and confirm it renders the T7.2 capture page **identically to a seeded
      request**; **grep that `src/app/c/[token]/**` has ZERO edits this slice** and that no
      `capture_request` token column changed. **DoD**: public page byte-unchanged; merchant + seeded
      requests resolve identically. **If the public page needed any edit → STOP and surface (P-V
      violation), do not implement.** **Constitution**: P-V.
- [X] T020 Final DoD + quickstart walk: `npm run typecheck && npm run lint && npm run build` green;
      walk `quickstart.md` §3–§7 (05 grid, 06 builder, 23 modal incl. Resend failure, brand-framed
      email, honest tracking) in light + dark with empty/loading/error/sent states; confirm **no new
      dependency (still 11)**, **token model unchanged**, **no QR/opens/clicks**. Live email send + DB
      writes are manual (Resend + shared Neon) — mark "manual — Cornel verifies". Then **STOP and
      report**; do not advance to T7.4+ until told (P-IX). **DoD**: all green; quickstart passes (device/
      live items flagged manual). **Constitution**: P-IX, P-Governance.

---

## Dependencies & Execution Order

- **Phase 1 (T001)** → no deps; can start immediately.
- **Phase 2 (T002–T005)** blocks all stories. Order: T002 → T003 (migration from schema); T004 depends
  on T002; **T005 [P]** independent (resend helper). 
- **Phase 3 (US1)** depends on T004 (createCaptureRequest+recordSend) + T005 (resend) + T001 (types):
  T006 → T007/T008 → T009.
- **Phase 4 (US2)** depends on T002 (schema) + T001: T010 → T011 → T012. Independent of US1.
- **Phase 5 (US3)** depends on T002 + T006 (reuses `createAndSendRequest`) + T001: T013 → T014 → T015 → T016.
- **Phase 6 (US4)** depends on the send/data being written (US1/US3) + T010: T017.
- **Phase 7**: T018 [P] after T002; T019 after a send path exists (T006 or T016); T020 last.

### Parallel opportunities

- **T001** ∥ **T005** (different files, no deps) early on.
- Once Phase 2 lands, **US1 (Phase 3)** and **US2 (Phase 4)** can proceed in parallel (different files;
  US2 doesn't need US1). **US3** waits on T006 (shared send action).
- **T018 (seed)** can be authored in parallel with the UI phases once the schema (T002) exists.

## Implementation Strategy

- **MVP = Phase 1 + Phase 2 + Phase 3 (US1)** — the loop-closer: a merchant can send a real capture
  request to a customer (Email via Resend or Link) from a proof, with honest failure. This alone
  demonstrates the funnel running end-to-end.
- **Increment 2**: Phase 4 (US2 templates grid) — fills the Requests landing.
- **Increment 3**: Phase 5 (US3 builder) + Phase 6 (US4 tracking).
- **Close-out**: Phase 7 (seed, integration verify, final DoD).
- Keep the build green at each phase; the integration-verify (T019) and public-page-untouched guard are
  hard gates — surface, don't implement, any required public-page change.
