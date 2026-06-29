# Implementation Plan: T7.3 — Requests via Resend

**Branch**: `T7.3-requests-resend` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T7.3-requests-resend/spec.md`

## Summary

The merchant-side "send the ask" that closes the capture loop. T7.3 delivers three authenticated
`/app` surfaces — the **Ask-for-more modal** (ref 23, the P1 loop-closer, launched from a proof), the
**Collection requests** templates grid (ref 05), and the **Request builder** (ref 06) — plus a
**Resend** email send carrying the public `/c/[token]` link, brand-framed.

Two entities stay strictly distinct:

- **`capture_request`** — the EXISTING T7.2 minted instance (token, 72h, single-use). T7.3 adds **only
  the additive `customer_email`** column; the token model and the public `/c/[token]` page are
  **unchanged**.
- **`request_template`** — a NEW additive entity: a reusable ask definition saved by the builder.
  **`Manual link` is the live trigger**; **Shopify/Stripe/Calendly are honest P-XIII "coming"** states
  (the deferred webhook/Sources track). The "automation mints requests from a template" bridge is
  **deferred** — the schema is shaped so that bridge is additive later, but no trigger automation is
  built now.

Email is sent via the **T6 Resend setup** (`AUTH_RESEND_KEY` / `AUTH_EMAIL_FROM`) through a **thin
fetch helper** (no reusable client exists; NextAuth bundles Resend only for the auth provider). The
mint is durable; the email is best-effort with an **honest failure state** (the request/link still
exists; nothing is falsely marked "sent").

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 15 App Router, React 19.

**Primary Dependencies**: Drizzle ORM + Neon; Auth.js v5 (T6, middleware gate + workspace session);
Resend (T6, reused via REST — no new dep); Tailwind v4 + Pressroom tokens; lucide-react (icons).

**Storage**: Neon Postgres. Additive only — `request_template` table, `request_send` table, and a
`customer_email` column on `capture_request`. **No change to the `capture_request` token columns.**

**Testing**: No runner (P-III idiom) — `typecheck` + `lint` + `build` green + a `quickstart.md` walk.

**Target Platform**: Vercel (server components + server actions). Email send is a server action
(short, well under the function timeout). No heavy/binary work.

**Project Type**: Web app (Next.js App Router) — authenticated `/app` surfaces + one public route
(untouched).

**Performance Goals**: Standard web app; the email send action returns promptly (single Resend REST
call). Lists are workspace-scoped reads.

**Constraints**: Locked stack (P-III) — **no new dependency** (still 11; Resend via `fetch`, no QR
dep). Public `/c/[token]` page must require **zero** changes. Pressroom tokens, light + dark,
breakpoints `480 / 1024 / 1280`.

**Scale/Scope**: Single workspace demo; three ported surfaces + one send helper + one additive
migration. Trigger automation and the verified bar are out.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Customer is the headline (P-II)**: the builder's "CUSTOMER SEES" preview and the request
      email keep the customer prompt/quote central; the email is brand-framed, chrome quiet. The
      Ask-for-more modal sits on the proof detail (customer already the headline). **PASS**.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Drizzle + Neon, **Resend reused via
      REST `fetch`** (no SDK), Auth.js. **No new dependency** (still 11); **no QR dep** (C6). **PASS**.
- [x] **Pressroom tokens (P-IV)**: on-token only; persimmon reserved for the primary action (e.g.
      "New request", "Send via Email") and the verified mark (not used here). **PASS**.
- [x] **Port, don't redesign (P-V)**: ports refs **05** (`/app/requests`), **06**
      (`/app/requests/new`), **23** (Ask-for-more modal); layout-faithful on the first pass; two-layer
      workspace scoping on lists. **PASS**.
- [x] **Fixtures-first (P-VI)**: built against fixtures shaped exactly like the additive schema
      (`request_template`, `request_send`, `capture_request.customer_email`); fixture shape is the
      contract. **PASS**.
- [x] **Consent enforcement (P-VII)**: the request carries the **versioned consent line** the customer
      affirms at capture (T7.1/T7.2), verbatim, not model-authored. T7.3 generates no clips — no
      clip-from-non-consented concern. **PASS**.
- [x] **No editor (P-VIII)**: the builder and modal are forms — no timeline/track/scrubber. **N/A /
      PASS**.
- [x] **SDD scope (P-IX)**: one vertical slice — manual send (modal + templates + builder + Resend);
      trigger automation and T7.5 verified bar are out (honest "coming"). **PASS**.
- [x] **Ambiguity handling (P-XII)**: the one new data-model decision (send/delivery tracking storage)
      is surfaced in `research.md` against the design, not guessed. **PASS**.
- [x] **Port-completeness (P-XIII)**: automated triggers + deferred delivery/QR are honest
      "coming"/absent states; no dead controls. **PASS**.
- [x] **Owned data only (P-XIV)**: `N sent` is a real count (of `request_send` rows); statuses come
      from stored data + Resend's accepted-for-delivery; **no opens/clicks** or invented engagement.
      **PASS**.
- [x] **Plan-not-code (P-XV)**: N/A — non-render slice.
- [x] **No-LLM-in-render (P-XVI)**: N/A — non-render slice.

**Definition of done (P-Governance)**: renders on fixtures; empty/loading/error/sent states; responsive
to `480/1024/1280`; Pressroom-exact; keyboard-accessible; acceptance criteria pass; build green.

## Project Structure

### Documentation (this feature)

```text
specs/T7.3-requests-resend/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (Resend send mechanism; send-tracking storage; N-sent; failure model)
├── data-model.md        # Phase 1 — request_template, request_send, capture_request += customer_email
├── quickstart.md        # Phase 1 — migrate/seed + walk the 3 surfaces + the integration guard
├── contracts/
│   ├── request-actions.md   # server actions: saveTemplate, createRequest(+send), the Resend send helper
│   └── request-ui.md        # UI port map: 05 grid, 06 builder, 23 modal, proof-actions wiring, states
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── app/
│   │   ├── requests/
│   │   │   ├── page.tsx                 # NEW — 05 Collection requests (templates grid; ws-scoped read)
│   │   │   ├── requests-grid.tsx        # NEW — presentational grid port (cards + N sent + empty)
│   │   │   ├── actions.ts               # NEW — server actions (saveTemplate, createAndSendRequest) — ws-scoped
│   │   │   └── new/
│   │   │       ├── page.tsx             # NEW — 06 Request builder shell (ws-scoped)
│   │   │       └── request-builder.tsx  # NEW — client builder: trigger row, prompt set, channel,
│   │   │                                #        timing, consent line, "CUSTOMER SEES" preview
│   │   └── proof/[id]/                   # host for the 23 modal (launched from proof-detail-actions)
│   └── c/[token]/                        # UNCHANGED (integration guard — zero edits)
├── components/app/proof-detail/
│   ├── proof-detail-actions.tsx          # EDIT (additive) — add "Ask this customer for more" trigger
│   └── ask-for-more-modal.tsx            # NEW — 23 modal port (client) + calls the send action
├── lib/
│   ├── resend.ts                         # NEW — thin Resend REST send helper (no new dep) + email compose
│   └── requests.ts                       # NEW — client-safe view types/constants (template, trigger, channel)
└── db/
    ├── schema.ts                         # EDIT (additive) — request_template, request_send, capture_request.customer_email
    ├── queries.ts                        # EDIT (additive) — saveTemplate, listTemplates(+N sent), extend createCaptureRequest, recordSend
    └── seed.ts                           # EDIT (additive) — seed a few templates + honest request_send rows
```

**Structure Decision**: Reuse the established App-Router layout. New authenticated surfaces live under
`src/app/app/requests/` (mirroring `proof/`, `library/`, etc.); the 23 modal lives with the proof
detail components. DB changes are additive in the existing `schema.ts`/`queries.ts`. The public
`/c/[token]` tree is untouched. The Resend helper is a thin `src/lib/resend.ts` (REST via `fetch`,
the same direct-HTTP idiom as `r2.ts`/`aws4fetch` — no SDK).

## Complexity Tracking

> No constitution violations. One data-model addition beyond the two entities the brief enumerated is
> surfaced for confirmation (not a violation):

| Addition | Why Needed | Simpler Alternative Considered |
|---|---|---|
| `request_send` table (additive) | Honest per-request send/delivery state (C5: sent + accepted-for-delivery) AND the template `N sent` aggregate, **without bloating `capture_request`** (which gets only `customer_email` per the brief). | Columns on `capture_request` (`sent_at`/`email_status`) — rejected: contradicts "only `customer_email`". A counter on `request_template` — rejected: can drift and can't represent per-request "failed" (less honest). See research D1. |
