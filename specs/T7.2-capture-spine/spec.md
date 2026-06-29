# Feature Specification: Capture spine + request primitive (the public `/c/[token]` flow)

**Feature Branch**: `T7.2-capture-spine`

**Created**: 2026-06-29

**Status**: Draft — **3 clarifications OPEN** (Q1 expiry window · Q2 deferred-path visibility · Q3
recording tech). Do **not** `/speckit-plan` until Q1–Q3 are answered.

**Tier**: T7 — Capture. **T7.2 is the spine**: the public, unauthenticated `/c/[token]` flow where a
**real customer submits proof and grants scoped consent** (the T7.1 model), plus the **request
primitive** that addresses it. After this slice, **real consented proof enters the system for the first
time** — the seeded fixtures stop being the only source.

**Input**: User description: "T7.2 — Capture spine + request primitive. … the public, unauthenticated
/c/[token] flow where a REAL customer submits proof and grants the scoped consent built in T7.1, plus
the request primitive that addresses it."

---

## STEP 0 — Design port location (Principle V, binding) ✅

**The capture designs EXIST in the repo.** Located at **`design-reference/Weavova/Capture/`** — a
**10-screen mobile flow**, paired HTML + PNG, with "9:41" phone status bars (a phone surface). The build
is a **faithful PORT** of these named screens, not a new design.

| # | Screen file (binding reference) | In this slice? |
|---|---|---|
| 01 | `01 _ Prompt  _live _ tap Record_.html` — the entry: brand-addressed prompt, four options | **IN** (spine entry) |
| 02 | `02 _ Recording.html` — live record (timer "0:29", "about 20 seconds") | **IN** (video path) |
| 03 | `03 _ Review.html` — "Looks good? Not sent yet — you can retake." · Use this / Retake | **IN** (video path) |
| 07 | `07 _ Write it.html` — "In your own words —" textarea · Use this | **IN** (text path) |
| 04 | `04 _ Consent.html` — "One last thing." consent line + "Read the full terms" + "Send to {brand}" | **IN** (consent) |
| 05 | `05 _ Sending.html` — submit transition | **IN** (send) |
| 06 | `06 _ Thank-you.html` — "Thank you, {name}. Your words mean a lot… — {brand}" + "Follow {brand} →" | **IN** (confirm) |
| 08 | `08 _ Add a photo.html` — photo review (mirrors 03) | **OUT → T7.2b** |
| 09 | `09 _ Camera blocked.html` — "No camera? No problem." upload/write fallback | **OUT → T7.2b** |
| 10 | `10 _ Expired link.html` — "This link has expired… collection links only stay open for a little while." | **model now; polished surface → T7.2b** |

**Verbatim copy lifted from the screens** (the port must use these, not paraphrase): prompt — *"How did
the candles work out, {name}?"* / *"A few honest words is all it takes. Takes about 20 seconds."* /
options *Record a quick video · Write it · Add a photo · Record audio* / footer *"powered by Weavova"*.
Consent — *"One last thing."* / *"I'm happy for {Workspace} to share this in their marketing."* /
*"Read the full terms"* / *"Send to {brand}"*. Review — *"Looks good? Not sent yet — you can retake."*
Thank-you — *"Thank you, {name}. Your words mean a lot to us. — {Workspace}"* / *"Follow {brand} →"*.
Expired — *"This link has expired. For your security, collection links only stay open for a little
while. {brand} can send you a fresh one."* / *"Ask {brand} for a new link"*.

Per **P-XII**, any state the design does not cover is raised as a clarification, never invented.

---

## Overview

The capture loop's first step has, until now, lived only as seeded fixtures. T7.2 builds the **real
customer-facing surface** and the **primitive that points a customer at it**:

- **The request primitive** — an internal record: a **per-request, single-use, expiring token**, the
  `workspaceId` it belongs to, optional **customer/transaction context** (the customer's name for the
  brand-addressed prompt; transaction reference for the later verified bar), a **status**, and an
  **expiry**. This is the *"ingest event → request → `/c/[token]`"* seam. In this slice, requests are
  **created manually / seeded**, and a request's **link + QR are displayable**; the generic webhook +
  Resend send are **T7.3**.
- **The public `/c/[token]` page** — **no login, no session**. It resolves **token → request →
  workspace**, renders the **workspace's brand** (brand kit — logo, brand colour, fonts) per the design,
  and presents the **proof submission + scoped-consent grant** as the ported mobile flow.
- **Proof submission, two paths this slice** — **VIDEO** (01 → 02 record → 03 review) and **TEXT**
  (01 → 07 write). Media bytes upload **directly to object storage via the existing presigned-PUT path**
  (reused from B2 — **bytes never transit the app server**); text is a textarea. **Photo and audio
  capture are T7.2b** — on the prompt they appear as honest **"coming"** options (Q2), never dead
  controls.
- **Scoped-consent capture (the T7.1 model)** — on the consent screen (04) the customer grants a **real
  consent version** with **least-privilege scope** (`organic` only by default; `paid`/`showcase`/`embed`
  are not granted here) and **display preferences** pre-filled from the **workspace default**, which the
  customer may override **only toward more privacy** — routed through **`resolveDisplay`** (the sole
  sanctioned write path; the one-directional invariant holds). The screen-04 plain-language consent line
  and **"Read the full terms"** are shown; the **takedown expectation** is surfaced honestly.
- **The write-path** — on **"Send"**, the system writes a **real `proof` row**, a **real granted consent
  version** (T7.1), and a **verification-basis STUB** linked to the request. **The proof row is shaped
  identically to the seeded fixtures**, so the **existing inbox, dashboard, and proof-detail render it
  through their existing reads with ZERO changes**.

**The verified stamp is NOT claimed here.** The verification basis has two legs: the **consent leg is
real** (captured on screen 04); the **transaction leg is a stub** completed in **T7.5**. Until both
exist, **no "Verified real" stamp is shown** (P-XIII / P-XIV — honest, not a faked badge). The captured
proof's `verified` flag stays **false**.

**Additive, not a swap.** This adds a new public route + a write-path; it does **not** change any
authenticated surface's read seam. The integration guarantee is that **real captured proof flows into
the existing owner-facing surfaces unchanged** (see Integration Surface).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A customer records a video and sends it (Priority: P1)

A customer opens the link the brand sent (`/c/[token]`), sees the brand-addressed prompt, records a
short video, reviews it (retake or use), grants consent, and sends. They never log in.

**Why this priority**: This is the spine's headline path — the first time real consented video proof
enters the system. It exercises token resolution, brand framing, the R2 upload, consent, and the
write-path end to end.

**Independent Test**: Open a valid `/c/[token]`; confirm the ported prompt (01) shows the brand name +
the customer's name; record (02) → review (03, "Looks good? … retake") → consent (04) → sending (05) →
thank-you (06); then confirm a real `proof` (type video) + a real granted consent version exist and the
media is in object storage.

**Acceptance Scenarios**:

1. **Given** a valid, unused, unexpired token, **When** the customer opens `/c/[token]`, **Then** the
   ported **prompt screen (01)** renders in the **workspace's brand**, addresses the customer by name
   ("How did the {product} work out, {name}?"), and offers the options — with **video** and **text**
   wired and **photo/audio** as honest "coming" affordances (Q2).
2. **Given** the prompt, **When** the customer taps record, **Then** the **recording (02)** and
   **review (03)** screens are ported faithfully (timer, "~20 seconds", "Not sent yet — you can
   retake", Use this / Retake) — record→review only, **no editing** (P-VIII).
3. **Given** a reviewed video, **When** the customer proceeds, **Then** the **media uploads directly to
   object storage** (bytes do not pass through the app server) and the **consent screen (04)** appears.
4. **Given** consent is granted and "Send to {brand}" tapped, **Then** the **sending (05)** then
   **thank-you (06)** screens show ("Thank you, {name}… — {brand}", "Follow {brand} →"), and a **real
   proof + granted consent version** are written.

---

### User Story 2 - A customer writes a few words and sends it (Priority: P1)

A customer chooses "Write it", types their testimonial (07), grants consent, and sends.

**Why this priority**: The text path is the lowest-friction proof and the simplest end-to-end exercise
of the same consent + write-path; it stands alone as a complete capture.

**Independent Test**: From the prompt, choose "Write it"; on screen 07 type words; proceed through
consent (04) → send (05) → thank-you (06); confirm a real `proof` (type text, the words stored as the
quote) + granted consent version exist.

**Acceptance Scenarios**:

1. **Given** the prompt, **When** the customer chooses "Write it", **Then** the **Write-it screen (07)**
   renders ("In your own words —", textarea, "Use this"), ported faithfully.
2. **Given** typed words, **When** the customer proceeds and grants consent and sends, **Then** a real
   **text proof** is written with the customer's **verbatim words** preserved (never model-altered —
   testimony-verbatim), plus the granted consent version.
3. **Given** an empty textarea, **When** the customer tries to proceed, **Then** the flow honestly
   prevents an empty submission (no fabricated proof).

---

### User Story 3 - Consent is real, scoped, least-privilege, and privacy-respecting (Priority: P1)

On the consent screen the customer grants consent that is recorded as a **real T7.1 scoped consent
version**: `organic`-only by default, display preferences pre-filled from the workspace default and
overridable **only toward more privacy**, with the plain-language line and full-terms link, and the
takedown expectation shown.

**Why this priority**: Consent Is Sacred (P-VII) is the ethical spine of the whole product; this slice
is the first place a **real customer** grants it. Getting the scope/display/wording right is
non-negotiable.

**Independent Test**: Reach screen 04; confirm the consent line names the workspace; grant; confirm the
written consent version has `useScope = [organic]` only, and display preferences equal to
`resolveDisplay(workspace default, any customer override)` — never less private than the workspace
default; confirm the "Read the full terms" and takedown-expectation copy are present.

**Acceptance Scenarios**:

1. **Given** the consent screen, **When** it renders, **Then** it shows the screen-04 plain-language
   line ("I'm happy for {Workspace} to share this in their marketing."), **"Read the full terms"**, and
   an honest **takedown expectation** (external posts removed within the stated window).
2. **Given** the customer grants consent, **When** the version is written, **Then** its **scope is
   `organic` only** — `paid`/`showcase`/`embed` are **not** granted at capture (least-privilege).
3. **Given** display preferences, **When** they are resolved and stored, **Then** they pass through
   **`resolveDisplay`** (the sole sanctioned write path) so the stored display is **never less private
   than the workspace default**; a customer override may only increase privacy.
4. **Given** the consent grant, **When** the proof is written, **Then** the consent is a **real granted
   version** under the T7.1 model (not a stub) and threads through every existing consent consumer
   unchanged.

---

### User Story 4 - The request primitive addresses a customer to the page (Priority: P1)

A workspace has a **request** (seeded/manually created) carrying a per-request token, optional customer
context, an expiry, and a status. Its **link + QR** can be displayed so the customer can be pointed at
`/c/[token]`.

**Why this priority**: Without the request, there is no token to resolve and no transaction context for
the brand-addressed prompt or the later verified bar. It is the primitive the whole flow hangs on.

**Independent Test**: Create/seed a request for a workspace; confirm `/c/[token]` resolves it to the
workspace + customer context; confirm the request's **link and QR** are displayable; confirm the token
is **per-request, single-use, and carries an expiry**.

**Acceptance Scenarios**:

1. **Given** a seeded request, **When** `/c/[token]` is opened, **Then** the token resolves to its
   **workspace and customer context**, and the page renders that workspace's brand and the customer's
   name in the prompt.
2. **Given** a request, **When** its link/QR is displayed, **Then** both point to `/c/[token]` and are
   real (owned data — P-XIV), not placeholders.
3. **Given** a successful submission, **When** the proof is written, **Then** the request is **marked
   used** (single-use) and the same token cannot create a second proof.

---

### User Story 5 - Used or expired links fail honestly (Priority: P2)

A token that is expired or already used does not silently break or accept a duplicate; it shows an
honest block. The **polished** expired surface (screen 10) is **T7.2b**; this slice shows a **minimal
honest block** carrying the screen-10 intent.

**Why this priority**: Security + honesty (the token is single-use + expiring). The model must enforce
it now even though the polished surface lands in T7.2b — an honest block beats a dead end (P-XIII).

**Independent Test**: Open an expired token and a used token; confirm each shows an honest "link expired
/ already used" block (not a 500, not a form that fabricates a duplicate proof), carrying the screen-10
message intent ("collection links only stay open for a little while… ask {brand} for a new link").

**Acceptance Scenarios**:

1. **Given** an expired token, **When** `/c/[token]` is opened, **Then** an honest **expired** block is
   shown (the polished screen-10 port is deferred to T7.2b, noted as "coming").
2. **Given** an already-used token, **When** `/c/[token]` is opened, **Then** an honest **already-used**
   block is shown; **no second proof** can be written from it.
3. **Given** an unknown/malformed token, **When** `/c/[token]` is opened, **Then** an honest
   not-found/invalid block is shown (no workspace leak, no error page).

---

### Edge Cases

- **Mid-flow brand absence**: a workspace with no brand kit logo → the design's honest "no logo" framing
  (reuse the brand-kit null handling), never a broken image.
- **Upload failure** (media PUT fails): the customer sees an honest retry, **no proof written** until
  the media is stored and consent granted (no orphaned/partial proof).
- **Customer abandons before "Send"**: nothing is written — a proof exists only after a consented send.
- **Photo/audio chosen on the prompt (T7.2b paths)**: routes to an honest **"coming"** state, not a
  dead control (Q2).
- **Camera blocked / no camera (screen 09)**: T7.2b for the polished fallback; this slice may degrade to
  the **text path** honestly rather than dead-ending (noted as coming).
- **Empty/whitespace-only text**: rejected; no empty proof.
- **Required proof fields**: the written proof must satisfy every non-null field the fixtures satisfy
  (customer name, type, a source, captured-at, the words/transcript) — see Integration Surface; if any
  required field cannot be honestly populated, **STOP** and surface it rather than fabricating a value.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a **request primitive**: a record with a **per-request, single-use,
  expiring token**, its `workspaceId`, optional **customer/transaction context**, a **status**, and an
  **expiry**. Requests MAY be created manually/seeded this slice; the webhook + email send are T7.3.
- **FR-002**: The system MUST display a request's **link and QR** (real, owned) so a customer can be
  pointed at `/c/[token]`.
- **FR-003**: The system MUST serve a **public, unauthenticated** `/c/[token]` page (no login, no
  session) that resolves **token → request → workspace** and renders the **workspace's brand** per the
  Capture designs.
- **FR-004**: The `/c/[token]` flow MUST be a **faithful port** of the named `design-reference/Weavova/
  Capture/` screens (01, 02, 03, 04, 05, 06, 07 in scope), in **Pressroom tokens, light + dark,
  mobile-first**, using the **verbatim copy** from those screens. Any divergence is a documented
  **decision** (P-V), not drift.
- **FR-005**: The flow MUST wire **two proof paths end to end**: **video** (record → review → consent →
  send) and **text** (write → consent → send). **Photo and audio** MUST appear as honest **"coming"**
  options on the prompt (Q2), never dead controls (P-XIII).
- **FR-006**: Media (video this slice; audio/photo T7.2b) MUST upload **directly to object storage via
  the existing presigned-PUT path** — **bytes never transit the app server** — reusing the existing
  storage helper. **No new dependency.**
- **FR-007**: Text proof MUST preserve the customer's **verbatim words** (testimony-verbatim — never
  model-authored or altered).
- **FR-008**: On send, the system MUST write a **real `proof` row** shaped **identically to the seeded
  fixtures** (same required fields), a **real granted consent version** under the **T7.1 scoped model**,
  and a **verification-basis stub** linked to the request — **atomically enough that no orphaned/partial
  proof is left** if any step fails.
- **FR-009**: The captured consent MUST be **least-privilege**: **`organic` scope only**;
  `paid`/`showcase`/`embed` are **not** granted at capture.
- **FR-010**: Display preferences MUST be **pre-filled from the workspace default** and resolved through
  **`resolveDisplay`** (the sole sanctioned write path); a customer override MUST be allowed **only
  toward more privacy** — the stored display is **never less private than the workspace default**.
- **FR-011**: The consent screen MUST show the **screen-04 plain-language consent line**, a **"Read the
  full terms"** affordance, and an honest **takedown expectation** (external posts removed within the
  stated window).
- **FR-012**: The token MUST be **single-use and expiring**: a successful submission **marks the request
  used**; an **expired or used** token MUST fail **honestly** (an honest block carrying the screen-10
  intent; the polished screen-10 surface is T7.2b) and MUST NOT allow a **second** proof.
- **FR-013**: The system MUST **NOT** claim a **"Verified real" stamp** at capture — the verification
  basis's **consent leg is real**, its **transaction leg is a stub** (T7.5); the proof's `verified`
  state stays **false** until both legs exist (P-XIII / P-XIV).
- **FR-014**: The page MUST show **only real owned data** — the real workspace brand and real request/
  customer context — and MUST NOT fabricate any field (P-XIV).
- **FR-015**: A proof written by the capture page MUST render correctly in the **existing inbox,
  dashboard, and proof-detail** through their **existing reads, with no edits** to those surfaces. If any
  existing surface needs an edit to render real captured proof, **STOP** and surface it as a P-V issue
  (see Integration Surface).
- **FR-016**: The flow MUST handle **empty/loading/error/sending** states per the designs (sending =
  screen 05; honest upload-failure/retry; empty-text rejection).

### Key Entities *(include if feature involves data)*

- **Request (new)**: the primitive addressing a customer to the capture page — token (per-request,
  single-use), `workspaceId`, optional customer/transaction context (name, transaction reference),
  status (e.g. open / used / expired), expiry timestamp. One request → at most one captured proof.
- **Proof (existing, now also customer-written)**: the captured proof — shaped **identically to the
  fixtures** (workspace, customer name, type, the words or media reference, a source, captured-at, not
  reviewed, not verified). Written here for the first time from a real customer rather than seeded.
- **Consent version (existing — T7.1)**: the **real granted** scoped consent recorded at capture —
  `organic` scope, display preferences resolved via `resolveDisplay`. Threads through every existing
  consent consumer unchanged.
- **Verification basis (new, stubbed)**: the record of *why* a proof can later be stamped "Verified
  real" — a **consent leg (real, captured here)** and a **transaction leg (stub, completed T7.5)**,
  linked to the request. No stamp is shown until both legs exist.
- **Media object (existing storage)**: the uploaded video/audio/photo bytes in object storage, referenced
  by the proof — uploaded directly via presigned PUT (never through the app server).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A customer can complete the **video path** (open → record → review → consent → send →
  thank-you) on a phone in **under ~90 seconds**, producing **1 real proof + 1 granted consent version**,
  with the **media stored in object storage** and **0 bytes** of media passing through the app server.
- **SC-002**: A customer can complete the **text path** end to end, producing a real text proof whose
  stored words are **byte-identical** to what they typed (**0** model alteration).
- **SC-003**: **100%** of consent grants at capture record **`organic`-only** scope (**0** instances of
  `paid`/`showcase`/`embed` granted at capture), and **0** stored display preferences are **less private**
  than the workspace default.
- **SC-004**: A proof written by the capture page renders in the **existing inbox, dashboard, and
  proof-detail** with **0 changes** to those surfaces' code.
- **SC-005**: A **used or expired** token yields an honest block and **0** duplicate/second proofs; **0**
  unhandled errors (no 500) on used/expired/unknown tokens.
- **SC-006**: **0** "Verified real" stamps are shown for capture-written proof (the transaction leg is
  still a stub); **0** fabricated data fields on the page.
- **SC-007**: The built screens match their named Capture references (layout + verbatim copy) in light
  and dark at mobile widths — **every** in-scope screen (01/02/03/04/05/06/07) accounted for; deferred
  paths are honest "coming" states (**0** dead controls).

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: the capture page **is** the customer's own act on the brand's
  surface — their words/video are the entire content; the chrome ("powered by Weavova") is quiet. Framed
  exactly per the Capture designs.
- **Locked stack (P-III)**: reuses the existing object-storage presigned-PUT path and the T7.1 consent
  model; **no new dependency** (stays at 11). Recording tech is in-stack browser APIs (Q3).
- **Pressroom tokens (P-IV)**: ported in Pressroom tokens (Fraunces/Hanken/JetBrains), light + dark,
  mobile-first; persimmon stays scarce (primary action / verified mark only — and **no** verified mark
  is shown here).
- **Port, don't redesign (P-V)**: ported from the named `design-reference/Weavova/Capture/` screens
  (Step 0). The deferred screens (08/09/10 polished) are explicitly **out**, not reinvented; divergences
  are documented decisions.
- **Fixtures-first (P-VI)**: the written proof is shaped **identically to the fixtures** (the fixture
  shape is the contract) — that is what guarantees the zero-change integration into the owner surfaces.
- **Consent (P-VII)**: **real** scoped consent captured here — least-privilege (`organic`), display via
  `resolveDisplay`, screen-04 wording, takedown expectation, full-terms link. Revocation still cascades
  (the existing read-time gate); this slice only **adds** real granted consent.
- **No editor (P-VIII)**: the customer **records then reviews** (retake / use) and **submits** — there
  is **no** timeline/track/scrubber/edit. The "studio" is not in scope here at all.
- **Scope (P-IX, P-XI)**: one slice — the spine (prompt + video + text + consent + send + request
  primitive + write-path). Photo/audio polish, camera-blocked, and the polished expired surface are the
  **named T7.2b** fast-follow, not built here.
- **Ambiguity (P-XII)**: states the design does not cover are raised (Q1–Q3), not invented.
- **Port-completeness (P-XIII)**: every rendered control works or is an honest **"coming"** state
  (photo/audio on the prompt; the expired surface). The **verification basis is an honest stub** — **no
  faked verified stamp**.
- **Owned data only (P-XIV)**: only the real workspace brand + real request/customer context; the
  verification basis is honestly incomplete (transaction leg stubbed), never a fabricated badge.
- **Plan-not-code (P-XV) / No-LLM-in-render (P-XVI)**: **N/A — non-render slice** (no Remotion; nothing
  in the render path).
- **Microcopy (P-XVII)**: all copy is the **verbatim** Capture-screen copy (no "amazing"/"awesome", no
  emoji); the takedown/terms language is plain and honest.

## Clarifications to resolve *(blocking — human decision)*

### Question 1: Default token expiry window?

**Context**: Screen 10 says "collection links only stay open for a little while." The model needs a
default expiry for seeded/manually-created requests.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **72 hours** | Tight, security-forward; matches "a little while". Good for transactional capture (right after a sale). **(Lean.)** |
| B | **7 days** | More forgiving; higher completion for slower customers; a longer-lived link. |
| C | Custom | Your own window. |

**Lean**: A (72h). **Your choice**: ____

### Question 2: On the prompt, are the T7.2b paths (photo/audio) visible "coming" options or hidden?

**Context**: Screen 01 shows **all four** options; this slice wires only video + text.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Visible, honest "coming"** (shown, labelled/blocked, route to an honest coming-state) | Faithful to the design (all four shown); P-XIII-honest; no dead control. **(Lean.)** |
| B | **Hidden** this slice (show only video + text) | Cleaner spine, but diverges from the screen-01 layout (a P-V divergence to document). |
| Custom | Your own | — |

**Lean**: A (visible-but-honest-coming). **Your choice**: ____

### Question 3: Recording capture technology for the spine?

**Context**: Screen 02 shows live in-browser recording. The spine needs a capture mechanism that keeps
bytes off the app server (FR-006).

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **In-browser recording (MediaRecorder) for video, with an upload fallback** | Matches the live-record design (02); records on-device, then presigned-PUT to storage; falls back to file upload where unsupported. In-stack, no new dep. **(Lean.)** |
| B | **Upload-only** for the spine (record UI deferred) | Simplest, but diverges from screen 02's live-record framing (a P-V divergence) and weakens the "record on your phone" promise. |
| Custom | Your own | — |

**Lean**: A (MediaRecorder + upload fallback). **Your choice**: ____

## Assumptions

- **Actor**: the capture page actor is an **unauthenticated customer** (no account, no session); the
  request is created by the workspace owner / a seed (manual this slice; webhook + Resend → T7.3).
- **Proof source**: the `proof` row requires a **source**; this slice attaches the capture proof to a
  **capture/link source** for its workspace (the request's origin). The `source.kind` allowlist is
  code-side text, so adding a "link"/"capture" kind is **additive, no migration** — `/plan` confirms the
  exact kind. (Surfaced as an assumption, not a fabricated field.)
- **Customer name**: the brand-addressed prompt + thank-you use the **customer context on the request**;
  if absent, the design's framing degrades honestly (no fabricated name).
- **Brand**: the page renders the workspace **brand kit** (logo/colour/fonts); a missing logo uses the
  existing honest "no logo" handling.
- **Verification basis**: modelled with a **real consent leg** + a **stub transaction leg**; **no
  verified stamp** is derived until T7.5 completes the transaction leg. The proof's `verified` stays
  false.
- **T7.2b fast-follow** (explicitly out): photo (08) + audio capture polish, camera-blocked fallback
  (09), and the **polished** expired-link surface (10). The token can expire/be used **now**; the
  honest block is minimal this slice.
- **Atomicity**: a proof exists only after a **consented send** with stored media (text needs no media);
  partial/abandoned flows write nothing.

## Integration Surface *(byte-stable target — additive, not a swap)*

This slice **adds** a public route + write-path; it does not change any authenticated read seam. A proof
written by the capture page MUST render through these **existing reads with zero edits**:

- **Inbox / `ProofCard`** (`getProofs`) — the new proof appears as an unreviewed card.
- **Dashboard** (`getDashboardSummary`) — counts/recent reflect the new proof.
- **Proof detail** (`getProof`) — the new proof opens, its consent state granted, its words/media shown.
- **Consent ledger** (T5 — `getConsentLedger`/`getConsentHistory`) — the new granted consent appears.
- **Downstream** (Library/showcase/export/clip studio) — unaffected until a clip is generated from the
  proof (existing gates apply).

**If any of these requires an edit to render real captured proof, STOP and surface it as a P-V issue.**
The expectation is **zero edits** because the written proof is shaped identically to the fixtures.
