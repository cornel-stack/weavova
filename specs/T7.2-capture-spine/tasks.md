---
description: "Task list for T7.2 — Capture spine + request primitive: the public, unauthenticated /c/[token] flow where a REAL customer submits proof (video + text) and grants real T7.1 scoped consent. A faithful mobile-first PORT of design-reference/Weavova/Capture/ (01–07). Additive migration 0006 (capture_request + verification_basis); proof written FIXTURE-IDENTICALLY (source kind 'link') so inbox/dashboard/proof-detail render it with ZERO read-side edits. Atomic send = consume-first conditional UPDATE + db.batch (neon-http, no interactive txn). Photo/audio/polished-expired = T7.2b honest coming-states. No new dependency (11)."
---

# Tasks: T7.2 — Capture spine + request primitive (the public `/c/[token]` flow)

**Input**: Design documents from `specs/T7.2-capture-spine/`
**Prerequisites**: plan.md, spec.md (US1–US5), research.md (R1 proof-source · R2 unauth route · R3 atomic
send on neon-http · R4 MediaRecorder+presign · R5 verification-basis table · R6 display-prefs+resolveDisplay
· R7 token lifecycle · C1 link-only), data-model.md, contracts/capture-actions.md, contracts/capture-ui.md,
quickstart.md.
**Constitution**: build against `.specify/memory/constitution.md` (v1.4.0).
**Prerequisite slices** (shipped): T7.1 (the scoped-consent model — `resolveDisplay`, `consentScopeEnum`,
`getGrantedConsentId`), T6 (workspace/membership + middleware gate), T5-BrandKit (`getBrandKit` +
`contrastOn`), T4-B2 (the presigned-PUT pattern + `presignPut`/`assetUrlForKey`).
**Tests**: NOT requested (no test runner — P-III). Verification = `npm run typecheck`/`lint`/`build`
green + the `quickstart.md` walk (seed → `/c/[token]` video + text → owner-surface integration).

> **GENERATION-ONLY GUARD.** Tasks only — nothing here is implemented, migrated, or run. Execution is
> `/speckit.implement` after human approval; leave EVERYTHING uncommitted (no branch/commit/push) — Cornel
> reviews + commits.

> **⛔ RATIFIED DECISIONS (do NOT re-open):** C1 = **link-only** (copyable URL; QR → T7.3/T7.4) · token
> **72h single-use** · prompt shows **all four** options (photo/audio = honest "coming") · video =
> **MediaRecorder + upload fallback** · proof-source = **`SOURCE_KINDS += 'link'`** (no migration) · route
> **outside middleware, token-scoped, never `getCurrentWorkspace`** · atomic send = **consume-first
> conditional UPDATE + `db.batch`** · migration **0006 additive** · consent = **T7.1, `organic`-only, via
> `resolveDisplay`** · **PORT** from `design-reference/Weavova/Capture/` (verbatim copy, mobile-first,
> light+dark) · **no new dependency** (11).

> **THE INTEGRATION GUARANTEE (binding — P-V):** a capture-written proof is shaped IDENTICALLY to the
> fixtures and renders through the EXISTING owner reads (`getProofs`/`getProof`/`getDashboardSummary`/T5
> ledger) with **ZERO edits** — they select `source.label`, never `source.kind`. **If ANY existing
> proof-read consumer needs an edit to render captured proof, STOP and surface it as a P-V violation — do
> not silently change a consumer.** (Verification is T-INT below.)

> **CONSTITUTION SURFACE:** P-V (port + byte-stable consumers), P-II (customer is the headline), P-VII
> (real scoped consent via T7.1 + resolveDisplay), P-VIII (record→review, no editor), P-XIII (photo/audio
> + expired = honest coming-states; verification basis is an honest stub, no faked stamp), P-XIV (owned
> data only). **P-XV/P-XVI N/A** (non-render).

---

## Phase 1: Setup

- [x] T001 Baseline + port-source check: run `npm run typecheck && npm run lint && npm run build` (green;
      note the 1 pre-existing `SAMPLE_CLIP_URL` lint warning is not ours); confirm
      `design-reference/Weavova/Capture/` exists with screens 01–07 (the binding port refs) and that **no
      new dependency** is planned (stay at 11). **DoD**: build green; Capture folder confirmed present.

---

## Phase 2: Foundational (schema + migration + shared lib) — BLOCKS all stories

- [x] T002 In `src/db/schema.ts`: add `captureRequestStatusEnum` (`capture_request_status`: open|used|
      expired); the **`capture_request`** table (id, workspaceId FK→workspace cascade, sourceId FK→source
      restrict, token text UNIQUE, customerName text null, transactionRef text null, status default 'open',
      expiresAt timestamptz NOT NULL, usedAt timestamptz null, createdAt default now; unique index on
      token, index on workspaceId); the **`verification_basis`** table (id, proofId FK→proof cascade,
      requestId FK→capture_request restrict, consentCapturedAt timestamptz NOT NULL, transactionVerifiedAt
      timestamptz **null**, createdAt). Add **`'link'`** to `SOURCE_KINDS`. **Existing tables/columns
      UNCHANGED.** **DoD**: `typecheck` green; diff is purely additive. **Constitution**: P-XIV (the basis
      transaction leg is null = honest stub).
- [x] T003 [P] Create `src/lib/capture.ts` (client-safe — type-only DB imports): `CaptureProofPath`,
      `CAPTURE_WIRED_PATHS` (video,text), `CAPTURE_COMING_PATHS` (photo,audio), `CAPTURE_TOKEN_TTL_HOURS=72`,
      `CAPTURE_ALLOWED_VIDEO_TYPES`, `CAPTURE_MAX_BYTES`, `CaptureRequestView`, `CaptureResolution`
      (ok|expired|used|not_found). **DoD**: `typecheck` green; no DB/runtime code in the client-safe module.
- [x] T004 [P] In `src/lib/r2.ts`: add `captureMediaKey(workspaceId, suffix)` (additive pure helper,
      mirrors `brandAssetKey`). **DoD**: `typecheck` green; reuses the existing key/endpoint idiom.
- [x] T005 Generate migration `0006` (`npm run db:generate`); inspect `drizzle/0006_*.sql` and confirm it
      is EXACTLY additive — 1 `CREATE TYPE`, 2 `CREATE TABLE` (+ indexes/FKs), **no existing table/column
      touched**; apply with `npm run db:migrate` (IPv4-first if needed). **DoD**: migration applies clean;
      generated SQL is purely additive (no DROP/ALTER of existing objects).

**Checkpoint**: schema + migration applied; build green; no route/UI yet.

---

## Phase 3: User Story 4 — The request primitive addresses a customer (Priority: P1)

**Goal**: a seeded/created request carrying a per-request, single-use, 72h-expiring token resolves to its
workspace + customer context; its link is displayable.

**Independent Test**: seed a request; `getCaptureRequestByToken(token)` resolves workspace + brand +
customer; the conditional consume flips open→used atomically; the dev surface shows a copyable `/c/[token]`.

- [x] T006 [US4] In `src/db/queries.ts`: add `createCaptureRequest(workspaceId, sourceId, {customerName?,
      transactionRef?})` — generates a high-entropy URL-safe token (`crypto.randomUUID`), sets
      `expiresAt = now + CAPTURE_TOKEN_TTL_HOURS`, status 'open'; returns the token. **DoD**: `typecheck`
      green; token unique; expiry 72h.
- [x] T007 [US4] In `src/db/queries.ts`: add `getCaptureRequestByToken(token): Promise<CaptureResolution>`
      — public, **token-scoped** (NO `getCurrentWorkspace`); joins workspace + `getBrandKit`; returns
      `expired` when `expires_at<=now()`, `used` when status='used', `not_found` when unknown, else `ok`
      with a `CaptureRequestView` (brand, customerName, workspace display defaults, wired/coming paths).
      **No workspace identifiers leak** on bad tokens. **DoD**: `typecheck` green; returns the right variant
      for open/used/expired/unknown on seeded rows. **Constitution**: P-XIV (only owned brand/context).
- [x] T008 [US4] In `src/db/queries.ts`: add `consumeCaptureToken(token)` — ONE conditional
      `UPDATE capture_request SET status='used', used_at=now() WHERE token=$1 AND status='open' AND
      expires_at>now() RETURNING id, workspace_id, source_id, customer_name, transaction_ref`; returns the
      row or null. **DoD**: `typecheck` green; a second call returns null (single-use proven); an expired
      token returns null. **Constitution**: P-VII (the atomic single-use guard).
- [x] T009 [US4] Seed + dev link: in `src/db/seed.ts` create one **`link`** source per workspace (label
      "Capture link") and a few `capture_request` rows (one open, one expired, one used) via
      `createCaptureRequest` + direct status/expiry overrides; in the dev-only `src/app/styleguide/data/
      page.tsx` list seeded requests with **copyable `/c/[token]` links** (`listCaptureRequests`, 404 in
      prod). **DoD**: `npm run db:seed` runs clean + prints tokens; the dev page shows copyable links.
      **Constitution**: P-XIV (real owned requests); C1 (link-only — no QR).

**Checkpoint**: a real request + token exists and resolves; the link is testable.

---

## Phase 4: User Story 5 — The unauthenticated route + page shell + honest block (Priority: P1/P2)

**Goal**: `/c/[token]` serves with no login/session, resolves the token, and renders either the flow shell
(valid) or an honest block (expired/used/not-found).

**Independent Test**: open `/c/<open>` → flow shell in the brand; `/c/<used>` → "already used"; `/c/<expired>`
→ "expired"; `/c/<garbage>` → not-found — all with **no login**, no `/app` chrome, no 500, no workspace leak.

- [x] T010 [US5] Create the public route `src/app/c/[token]/page.tsx` (server component): call
      `getCaptureRequestByToken`; on `ok` render `<CaptureFlow request={view}/>` themed by the brand kit
      (brand colour as a CSS var + `contrastOn`), inheriting **root layout only** (no `/app` chrome, no
      auth); on `expired`/`used`/`not_found` render the honest block. Add a mobile-first `viewport` export.
      **DoD**: route reachable unauthenticated (confirm it is OUTSIDE the middleware matcher — no change to
      `middleware.ts`); the four resolution variants render. **Constitution**: P-II (customer's surface),
      P-V (no chrome).
- [x] T011 [US5] Create the honest block UI (`src/app/c/[token]/block.tsx` or `not-found.tsx`) carrying the
      **screen-10 intent** verbatim-minimal ("This link has expired… {brand} can send you a fresh one" /
      "already used" / invalid) — Pressroom tokens, light+dark, mobile. The **polished `10 _ Expired link`
      port is T7.2b** (noted). **DoD**: each block renders honestly; no dead control. **Constitution**:
      P-XIII (honest block, not a dead end), P-V (minimal now; polished deferred).
- [x] T012 [US5] Scaffold `src/app/c/[token]/capture-flow.tsx` (client): the state machine skeleton
      (`prompt→record→review→consent→sending→thanks` + `prompt→write→consent→…`) holding flow state
      (path, mediaKey|text, displayOverride); renders per-state sub-components (stubs filled in US1–US3).
      **DoD**: `typecheck` green; the shell renders the prompt and can navigate between states (no send yet).

**Checkpoint**: the public page exists, resolves tokens, blocks honestly; the flow shell renders.

---

## Phase 5: User Story 1 — Video capture path (Priority: P1) 🎯

**Goal**: prompt (01) → record (02, MediaRecorder) → review (03) producing an R2 media key, ready for
consent. Bytes never transit the app server.

**Independent Test**: from the prompt, record a video, review (retake/use); confirm the bytes PUT directly
to R2 (network tab) and a media key is held in flow state for the consent step.

- [x] T013 [P] [US1] Port the **prompt** screen (`src/app/c/[token]/screens/prompt.tsx`) from
      `01 _ Prompt _live _ tap Record_` — brand-addressed ("How did the {product} work out, {name}?"), "A
      few honest words… ~20 seconds", **all four** options, "powered by Weavova". Video + text wired;
      **photo/audio render an honest "coming" state** (P-XIII), not dead. Mobile-first, light+dark, verbatim
      copy. **DoD**: matches screen 01; photo/audio are visible honest coming-states. **Constitution**: P-V,
      P-XIII, P-XVII.
- [x] T014 [US1] Add `presignCaptureUpload` to `src/app/c/[token]/actions.ts` (token-scoped Server Action):
      validate the token is open+unexpired (a READ), validate content type (`CAPTURE_ALLOWED_VIDEO_TYPES`) +
      size (`CAPTURE_MAX_BYTES`), resolve workspace from the request, sign an R2 PUT URL via
      `captureMediaKey` + `presignPut`. Returns `{uploadUrl, key}` | invalid | expired/used/not_found |
      error. **NO `getCurrentWorkspace`.** **DoD**: `typecheck` green; returns a signed URL for a valid
      token, honest rejects otherwise. **Constitution**: P-VII (token-scoped), P-XIV.
- [x] T015 [US1] Port the **recording (02)** + **review (03)** screens (`screens/record.tsx`,
      `screens/review.tsx`): MediaRecorder capture (getUserMedia → record → Blob), timer/"~20 seconds" per
      02; review per 03 ("Looks good? Not sent yet — you can retake." Use this / Retake) — **record→review
      only, NO edit** (P-VIII). On "Use this": `fetch(uploadUrl,{method:'PUT',body:blob})` (bytes direct to
      R2) then hold the `key` in flow state. Add the **upload fallback** (`<input type=file accept="video/*"
      capture>`) for unsupported MediaRecorder/getUserMedia (the seam screen-09 plugs into at T7.2b). **DoD**:
      record→review→use yields a stored R2 object + a key; bytes never hit the app server; fallback works.
      **Constitution**: P-VIII (no editor), P-V.

**Checkpoint**: the video path produces a media key ready for consent (send wired in Phase 7).

---

## Phase 6: User Story 2 — Text capture path (Priority: P1)

**Goal**: prompt (01) → write (07) producing verbatim text, ready for consent.

**Independent Test**: choose "Write it", type words, "Use this"; the verbatim text is held in flow state;
empty/whitespace is rejected.

- [x] T016 [P] [US2] Port the **Write-it (07)** screen (`src/app/c/[token]/screens/write.tsx`) from
      `07 _ Write it` — "In your own words —", textarea, "Use this". Empty/whitespace **rejected** (no empty
      proof); the text is held **verbatim** in flow state (testimony-verbatim — never altered). Mobile-first,
      light+dark. **DoD**: matches screen 07; verbatim text captured; empty rejected. **Constitution**: P-V,
      P-VII (verbatim), P-XVII.

**Checkpoint**: the text path produces verbatim text ready for consent.

---

## Phase 7: User Story 3 — Consent (04) + the atomic send write-path (Priority: P1)

**Goal**: the shared convergence — consent screen (04) grants real T7.1 scoped consent; "Send" writes
proof + consent + basis atomically; sending (05) → thank-you (06). Serves both US1 and US2.

**Independent Test**: from a held payload (text or media key), reach consent (04); grant; send; confirm a
real proof + granted `organic` consent + a verification-basis stub (`transaction_verified_at` null) exist,
the request is `used`, and the thank-you (06) shows. No verified stamp anywhere.

- [x] T017 [US3] Port the **consent (04)** screen (`src/app/c/[token]/screens/consent.tsx`) from
      `04 _ Consent` — "One last thing." / "I'm happy for {Workspace} to share this in their marketing." /
      **"Read the full terms"** / **"Send to {brand}"**; show the **name/face control** pre-filled from the
      workspace display default, offering **more-private** options only (the UI proposes; the server
      enforces); show the **takedown expectation** copy. Mobile-first, light+dark, verbatim. **DoD**: matches
      screen 04 (the name/face control placement is a documented P-V decision); full-terms + takedown copy
      present. **Constitution**: P-VII, P-V, P-XVII.
- [x] T018 [US3] Add `submitCapture` to `src/app/c/[token]/actions.ts` (token-scoped): (1)
      `consumeCaptureToken` → null ⇒ return used/expired/not_found (no writes); (2) validate payload
      (non-empty text OR present mediaKey; reject photo/audio honestly); (3) `display =
      resolveDisplay(workspaceDefault, displayOverride)` (T7.1 — **sole sanctioned write path**,
      server-enforced more-private-only); (4) **`db.batch([insert proof (fixture-shaped, sourceId=link
      source, verified:false), insert consent (state:granted, version:1, useScope:['organic'], nameDisplay/
      showFace from display, captureContext:{method:'capture_page',requestId}), insert verification_basis
      (consentCapturedAt:now, transactionVerifiedAt:null)])`** with client-generated UUIDs; (5)
      `revalidatePath` inbox/dashboard. On batch failure → `error` (token already burned; **no partial
      proof** — batch is atomic). **DoD**: `typecheck` green; a valid send writes the three rows in one
      batch + flips the request used; useScope is `['organic']`; no display less private than the default;
      `transaction_verified_at` null. **Constitution**: P-VII (real consent, least-privilege, resolveDisplay),
      P-XIV (no stamp).
- [x] T019 [US3] Port the **sending (05)** + **thank-you (06)** screens (`screens/sending.tsx`,
      `screens/thanks.tsx`): 05 during submit; 06 = "Thank you, {name}. Your words mean a lot to us. —
      {Workspace}" + "Follow {brand} →". Wire the flow: consent "Send" → sending → `submitCapture` → thanks
      (ok) or an honest error/block (used/expired/error → honest message, e.g. "couldn't save — ask {brand}
      for a new link"). **DoD**: matches 05/06; the full video + text paths complete end-to-end to the
      thank-you. **Constitution**: P-V, P-II, P-XVII.

**Checkpoint**: both paths complete end-to-end; real proof + granted organic consent + basis stub written.

---

## Phase 8: Integration verification + e2e (the P-V zero-edit guarantee)

- [x] T020 [US3] **Integration verification (FR-015 — binding P-V)**: in the authenticated app, confirm a
      capture-written proof renders through the EXISTING reads with **ZERO edits** — read the real query
      code (`getProofs`, `getProof`, `getDashboardSummary`, T5 `getConsentLedger`) and confirm each selects
      `source.label` (not `source.kind`), takes the proof as fixture-shaped, and the new granted `organic`
      consent passes `getGrantedConsentId`. Then walk it: the captured proof appears as an **unreviewed
      card** in inbox (source "Capture link"), in dashboard counts, opens in proof-detail (consent granted),
      and in the T5 ledger. **If ANY consumer required an edit, STOP and surface it as a P-V violation — do
      not silently change it.** **DoD**: 0 owner-surface edits; the captured proof renders everywhere.
      **Constitution**: P-V.
- [x] T021 **End-to-end (quickstart.md)**: seed → open `/c/<open>` on mobile → **video** path
      (01→02→03→04→05→06) + **text** path (01→07→04→05→06) → confirm real proof + organic consent + basis
      stub, bytes off-server; **used/expired/unknown** tokens block honestly (no 500, no second proof); **no
      verified stamp** anywhere. **DoD**: every quickstart step passes.

---

## Phase 9: Polish & Definition of Done

- [ ] T022 [P] Port-fidelity + token pass: each built screen (01/02/03/04/05/06/07) matches its named
      `Capture/` reference (layout + **verbatim copy**) in **light + dark** at **mobile** widths; persimmon
      scarce; **no verified mark shown**; brand colour themes the page (`contrastOn`). **DoD**: visual parity
      with the refs; divergences (e.g. the name/face control on 04) documented as decisions. **Constitution**:
      P-IV, P-V, P-II.
- [ ] T023 [P] Port-completeness audit (P-XIII): photo/audio on the prompt + the expired/used blocks are
      honest **"coming"/block** states (not dead controls); the **verification basis is an honest stub** (no
      faked verified stamp). **DoD**: 0 dead controls; 0 fabricated stamps. **Constitution**: P-XIII, P-XIV.
- [ ] T024 [P] Accessibility + states pass: keyboard-operable controls/focus order across the flow;
      empty/loading/sending/error states present (per the designs + honest upload-retry + empty-text reject).
      **DoD**: keyboard-walkable; all states render.
- [ ] T025 Code cleanup (TS strict: no `any`, no unjustified `@ts-ignore`); confirm the token-scoped actions
      never import `getCurrentWorkspace`; no new dependency added (still 11). **DoD**: lint clean; grep
      confirms no `getCurrentWorkspace` in `src/app/c/`.
- [ ] T026 **Final DoD**: `npm run typecheck && npm run lint && npm run build` green; run the full
      `quickstart.md`. Then **STOP and report**; do not advance to T7.2b/T7.3 until Cornel says so (P-IX).
      **DoD**: all green; quickstart fully passes.

> **N/A for this slice**: P-XV / P-XVI (non-render — no Remotion). The DoD "responsive" item targets
> **mobile-first** (the capture surface is a phone surface; the `480` breakpoint is the primary target).

---

## Dependencies & Execution Order

### Phase order (build stays green at each step)

Setup (P1) → **Foundational (P2: schema/migration/lib)** BLOCKS all → **US4 request primitive (P3)** →
**US5 route + shell + block (P4)** → **US1 video (P5)** + **US2 text (P6)** → **US3 consent + atomic send
(P7)** → **Integration + e2e (P8)** → **Polish/DoD (P9)**. Additive schema first (build green, no UI), then
the token model, then the page, then the capture paths, then the shared consent+send, then verify.

### Concrete dependencies

- T002 → T005 (schema → generate/apply). T003 [P] / T004 [P] after nothing (independent files), before
  T006+ (queries use the types/key helper).
- T006 → T007 → T008 (all `queries.ts`, same file — sequential); T009 (seed) after T006.
- T010/T011/T012 (route/block/shell) after T007 (resolution). T012 holds state US1–US3 fill.
- T013/T015 (video) after T012 + T014 (presign). T016 (text) after T012. T013 [P] T016 (different files).
- T017 (consent screen) after T012; T018 (submit) after T008 + T017 + T7.1 `resolveDisplay`; T019 after T018.
- T020/T021 (verify) after T018/T019. T022–T026 (polish) last.

### Parallel opportunities ([P])

- **T003 ∥ T004** (capture.ts vs r2.ts).
- **T013 ∥ T016** (prompt screen vs write screen — different files); the ported screen sub-components
  (`screens/*.tsx`) are largely independent files and can be built in parallel once the shell (T012) exists.
- **T022 ∥ T023 ∥ T024** (independent polish audits).
- `queries.ts` tasks (T006/T007/T008) and `actions.ts` tasks (T014/T018) are sequential within their file.

---

## Implementation Strategy

- **MVP (thinnest e2e)**: Setup + Foundational + US4 + US5 + **US2 text** + US3 consent/send → a real text
  proof captured end-to-end (the simplest complete loop). Then **US1 video** adds MediaRecorder in front of
  the same consent/send. (Spec numbers US1 first as the headline; text is the thinnest path to green e2e.)
- **Increment**: video path → integration verification → polish. Each phase keeps the build green (the flow
  walks up to consent before Phase 7 wires the send).
- **The hard guard**: if the integration check (T020) finds ANY owner-read consumer needs an edit to render
  captured proof, **STOP** — that breaks the fixture-identical guarantee and is a P-V violation to surface,
  not patch.

## Notes

- [P] = different files, no incomplete-task dependency. Same-file tasks (`queries.ts`, `actions.ts`,
  `capture-flow.tsx`) are sequential.
- No test runner (P-III): DoD = `typecheck`/`lint`/`build` + the quickstart walk.
- At `/speckit.implement`: leave everything uncommitted; Cornel reviews + commits.
- DB writes hit the **shared Neon DB** + R2; the migration is additive and the seed adds owned demo rows.
