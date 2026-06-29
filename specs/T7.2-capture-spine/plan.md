# Implementation Plan: Capture spine + request primitive (the public `/c/[token]` flow)

**Branch**: `T7.2-capture-spine` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T7.2-capture-spine/spec.md`

**Resolved clarifications (settled)**: Q1 expiry = **72h** (config-overridable) · Q2 prompt shows **all
four** options (photo/audio → honest "coming") · Q3 **MediaRecorder for video + upload fallback**.

---

## Summary

Build the **public, unauthenticated `/c/[token]` capture flow** — a faithful **mobile-first port** of
`design-reference/Weavova/Capture/` (screens 01–07) — plus the **request primitive** (per-request,
single-use, 72h-expiring token) that addresses a customer to it. A customer records a **video**
(01→02→03) or **writes text** (01→07), grants **real T7.1 scoped consent** (04, least-privilege
`organic`, display via `resolveDisplay`), and sends (05→06). On send, the system writes a **real `proof`
row shaped identically to the fixtures**, a **real granted consent version**, and a **verification-basis
stub** — so the proof flows into the **existing inbox / dashboard / proof-detail with zero edits**.

**Five resolved architecture decisions (the crux set):**

1. **Proof-source (the integration crux)** — captured proof needs a `source` (proof.sourceId is NOT
   NULL). Resolution: add a **`link` source kind** to the code-side `SOURCE_KINDS` allowlist (`kind` is
   text → **no migration**), and the **request carries a `sourceId`** (its capture channel). The written
   proof's `source.label` (e.g. "Capture link") is **real owned data**; `getProofs`/`getProof` render any
   label, so **zero read-side edits** (confirmed against the real reads below). **No P-V read-side risk.**
2. **Unauthenticated route** — `/c/[token]` is **already outside** the middleware gate (matcher is
   `["/app/:path*"]`). It inherits only the **root layout** (fonts + ThemeProvider), **not** the `/app`
   chrome. Workspace + brand are resolved **from the token** (`token → request → workspace → brand kit`),
   never from a session. The capture Server Actions are **token-scoped** (they do **not** call
   `getCurrentWorkspace()` — the token is the capability).
3. **Atomic send without interactive transactions** — the DB client is **`neon-http`** (no
   `db.transaction()`). The write-path is: **(a) consume the token first** via one **conditional
   `UPDATE … WHERE status='open' AND expiresAt>now() RETURNING`** (the atomic single-use guard — the same
   "atomic guard via conditional/unique write" idiom as the `(proofId,version)` index); **(b)** if a row
   came back, **`db.batch([...])`** the proof + consent + verification-basis inserts (client-generated
   UUIDs so dependent ids are known up front) as **one transaction**. No partial proof (the batch is
   atomic); a post-consume batch failure burns the token honestly (single-use security — customer gets a
   new link). **No new driver, no new dep.**
4. **Media upload** — reuse the **B2 presigned-PUT pattern**: a token-scoped `presignCaptureUpload`
   action validates the token, signs a short-lived R2 PUT URL (new additive `captureMediaKey` helper in
   `r2.ts`); the **browser PUTs bytes directly to R2** (never through Vercel). Video is captured via
   **MediaRecorder** with an **upload (file-input) fallback** (the seam screen-09 plugs into at T7.2b).
5. **Verification basis = separate additive table** (not proof columns) — keeps the proof shape
   **byte-identical to the fixtures**. Its **consent leg is real** (timestamped at capture); its
   **transaction leg is null/stub** (T7.5). `proof.verified` stays **false**; **no stamp** is derived.

**One open clarification (C1):** runtime **QR generation needs a dependency** (we're at 11, no-new-dep);
the link display this slice can show a **copyable URL** and defer the QR image, or we add a tiny QR dep.
Surfaced below — not assumed.

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 15 App Router, React 19 — unchanged (P-III).

**Primary Dependencies**: Neon + Drizzle (migration `0006`), existing R2 helper (`r2.ts`), the T7.1
consent model (`resolveDisplay`, `consentScopeEnum`), `next-themes` + `next/font` (already in root
layout). **MediaRecorder / getUserMedia** are browser-native (no dep). **No new dependency** unless C1
resolves to "add QR lib."

**Storage**: additive migration `0006` — one enum `capture_request_status` (open|used|expired); one
table `capture_request`; one table `verification_basis`. **No existing table/column changed.** Plus a
**code-side** `SOURCE_KINDS += 'link'` (no migration).

**Testing**: no test runner (P-III) — verification via `typecheck`/`lint`/`build` + the quickstart
(seed a request → walk `/c/[token]` video + text → confirm proof appears in inbox/dashboard/detail).

**Target Platform**: Vercel (Neon serverless, R2). The capture page is a public mobile web surface.

**Project Type**: single Next.js app (`src/`).

**Performance/Constraints**: media bytes never transit the app server (presigned PUT); the page is
mobile-first; the flow completes in well under the 90s SC-001 target.

**Scale/Scope**: the spine — 2 proof paths (video, text), 6 ported screens (01–07 minus 08), the
request primitive, the write-path. T7.2b: photo/audio polish, camera-blocked, polished expired surface.

## Constitution Check

*GATE: re-checked post-design — PASS.*

- [x] **Customer is the headline (P-II)**: the page is the customer's own act on the brand's surface;
      their words/video are the whole content; chrome ("powered by Weavova") is quiet — framed per the
      Capture designs.
- [x] **Locked stack (P-III)**: Neon/Drizzle/R2/next-themes/next-font; MediaRecorder is browser-native.
      **No new dep** (C1 is the only place one could enter — flagged, not assumed).
- [x] **Pressroom tokens (P-IV)**: ported in tokens (Fraunces/Hanken/JetBrains), light + dark,
      mobile-first; persimmon stays scarce; the workspace **brand colour** themes the page via an inline
      CSS variable with auto-contrast (`contrastOn`, reused) — **no** persimmon misuse, **no** verified
      mark shown.
- [x] **Port, don't redesign (P-V)**: every built screen names its `Capture/` reference (01–07);
      08/09/10-polished are explicitly **out** (T7.2b), not reinvented. The proof-source decision adds
      **zero** read-side edits (the integration crux — confirmed below).
- [x] **Fixtures-first (P-VI)**: the written proof is shaped **identically to the fixtures** — that is
      what makes the owner-surface integration zero-change.
- [x] **Consent (P-VII)**: **real** scoped consent — least-privilege `organic`, display via
      `resolveDisplay` (sole sanctioned write path), screen-04 wording, full-terms link, takedown
      expectation. A partial write (proof before consent) is impossible (atomic batch); even a
      hypothetical no-consent proof **fails closed** (withheld) under the existing gate.
- [x] **No editor (P-VIII)**: record → review (retake/use) → submit. **No** timeline/track/scrubber.
- [x] **SDD scope (P-IX)**: the spine only; T7.2b fast-follow named; no speculative work.
- [x] **Ambiguity (P-XII)**: C1 (QR) surfaced, not guessed; Q1–Q3 pre-resolved.
- [x] **Port-completeness (P-XIII)**: photo/audio on the prompt are honest **"coming"** states; the
      expired/used token shows an honest block; the **verification basis is an honest stub** (no faked
      stamp).
- [x] **Owned data only (P-XIV)**: only the real workspace brand + real request/customer context; the
      basis is honestly incomplete (transaction leg null), never a fabricated badge.
- [x] **Plan-not-code (P-XV) / No-LLM-in-render (P-XVI)**: **N/A — non-render slice.**
- [x] **Microcopy (P-XVII)**: verbatim Capture-screen copy; plain takedown/terms language.

**Definition of done (P-Governance)**: ports the named screens in tokens, light + dark, mobile-first;
empty/loading/error/sending states (per 05 + honest upload-retry + empty-text reject); keyboard-
accessible; a captured proof renders in the existing owner surfaces unchanged; builds green.

## Project Structure

### Documentation (this feature)

```text
specs/T7.2-capture-spine/
├── plan.md              # this file
├── research.md          # the 5 architecture decisions + C1
├── data-model.md        # capture_request, verification_basis, the 'link' source, write-path states
├── contracts/
│   ├── capture-actions.md   # token-scoped Server Actions (resolve / presign / submit) + write-path
│   └── capture-ui.md        # screen-by-screen port map (01–07) + states
├── quickstart.md        # seed a request → walk video + text → confirm owner-surface integration
└── checklists/requirements.md
```

### Source Code (files this slice adds / touches)

```text
src/
├── db/
│   ├── schema.ts        # + captureRequestStatusEnum; + captureRequest table; + verificationBasis table
│   ├── queries.ts       # + getCaptureRequestByToken (public, token-scoped); + consumeCaptureToken
│   │                    #   (conditional UPDATE guard); + submitCapture batch write; + listCaptureRequests (dev)
│   └── seed.ts          # + a 'link' source per workspace; + a few seeded capture_requests (open/expired/used)
├── lib/
│   ├── r2.ts            # + captureMediaKey(workspaceId, suffix) (additive pure helper)
│   ├── capture.ts       # NEW — client-safe view/types: CaptureRequestView, proof-path types, allowed
│   │                    #   content types, expiry constant (72h), the "coming" path set
│   └── schema.ts        # SOURCE_KINDS += 'link' (code-side allowlist; no migration)
├── app/
│   └── c/[token]/
│       ├── page.tsx     # public server component: resolve token → request → workspace → brand; render flow
│       ├── capture-flow.tsx        # client: the ported multi-screen flow (state machine 01→…→06)
│       ├── actions.ts   # token-scoped Server Actions: presignCaptureUpload, submitCapture
│       └── not-found.tsx / expired UI  # honest invalid/expired/used block (minimal; polished 10 → T7.2b)
└── app/styleguide/data  # (dev-only) + seeded capture-request links display (copyable URL; QR per C1)
drizzle/
└── 0006_*.sql           # additive: enum + capture_request + verification_basis
```

**Structure Decision**: the public flow lives at `src/app/c/[token]/` (sibling of `/app`, inheriting
only the root layout — no chrome, no auth). The write-path + token logic live in `src/db/queries.ts`
(token-scoped, no session). UI ports into `capture-flow.tsx` (a client state machine), each sub-screen a
faithful port of its named reference.

---

## Design

### D1 — The request primitive + token model (additive migration `0006`)

`capture_request`:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `workspaceId` | uuid FK → workspace (cascade) | the tenant |
| `sourceId` | uuid FK → source (restrict) | the capture channel (the `link` source) → the proof's source |
| `token` | text **unique** | per-request, high-entropy, URL-safe (`crypto.randomUUID`/random bytes) |
| `customerName` | text null | the brand-addressed prompt + thank-you name |
| `transactionRef` | text null | the transaction leg context for the T7.5 verified bar |
| `status` | `capture_request_status` (open\|used\|expired) | single-use lifecycle |
| `expiresAt` | timestamptz | **now + 72h** at creation (config-overridable constant) |
| `usedAt` | timestamptz null | set when consumed |
| `createdAt` | timestamptz default now | |

`status='expired'` is derived/settable; the **authoritative expiry check is `expiresAt > now()`** at
read/consume time (a stale `status` never grants access). Single-use is enforced by the **conditional
consume** (D3), not by trusting `status` alone.

### D2 — Public resolution (token → request → workspace → brand), no session

- `getCaptureRequestByToken(token)` (public, **not** workspace-scoped by a session): returns the request
  + its workspace + brand kit (`getBrandKit`), or a discriminated **not-found / expired / used** result.
  The page renders: **valid** → the ported flow themed by the brand kit; **expired/used** → the honest
  block (minimal screen-10 copy); **unknown** → not-found block. **No workspace leak** on bad tokens.
- The page is a **server component** under `src/app/c/[token]/`; it passes the resolved
  `CaptureRequestView` (brand, customer name, allowed paths) to the client `capture-flow.tsx`.
- Brand theming: the brand colour is applied as an **inline CSS variable** on the flow root with
  **`contrastOn`** (reused) deriving the on-colour — exactly the brand-kit precedent. Light + dark via
  the existing ThemeProvider.

### D3 — The atomic-ish send write-path (neon-http, no interactive txn)

```
submitCapture(token, payload):
  1. consumeCaptureToken(token):              // ATOMIC single-use guard — one statement
       UPDATE capture_request
         SET status='used', usedAt=now()
         WHERE token=$1 AND status='open' AND expires_at > now()
         RETURNING id, workspace_id, source_id, customer_name, transaction_ref
     → 0 rows  ⇒ already used / expired / unknown ⇒ honest block, NO writes
     → 1 row   ⇒ proceed (the token is now consumed)
  2. resolve display = resolveDisplay(workspaceDefault, customerOverride)   // T7.1 sole write path
  3. db.batch([                                // ONE transaction (client-generated UUIDs)
       insert proof   {id: proofId, workspaceId, customerName, proofType,
                       quote|transcript, sourceId, capturedAt: now, reviewed:false, verified:false,
                       thumbnail:null},
       insert consent {id: consentId, proofId, state:'granted', grantedAt: now, version:1,
                       useScope:['organic'], nameDisplay: display.nameDisplay, showFace: display.showFace,
                       captureContext: {method:'capture_page', requestId, ...}},
       insert verification_basis {id, proofId, requestId, consentCapturedAt: now,
                       transactionVerifiedAt: null},        // STUB leg
     ])
  4. revalidate the owner surfaces (inbox/dashboard) so the new proof appears
```

- **Single-use** is the conditional UPDATE (atomic at the DB). **No partial proof**: the batch is one
  transaction (all-or-nothing). A **post-consume batch failure** → token burned, no proof, honest error
  ("couldn't save — ask {brand} for a new link") — acceptable under single-use security.
- **P-VII safety**: proof and its granted consent are written in the **same batch**, so a proof never
  exists without consent. (Even if it somehow did, the read-time gate fails closed → withheld.)
- **Testimony-verbatim**: text is stored as the proof `quote`/`transcript` exactly as typed.

### D4 — Media upload (MediaRecorder → presigned PUT), bytes off-server

- `presignCaptureUpload(token, contentType, sizeBytes)` (token-scoped): validates the token is
  **open + unexpired** (a read, not a consume), validates content type (`video/webm`, `video/mp4`,
  `video/quicktime`) and size (a capture `MAX_BYTES`), resolves workspace from the request, signs an R2
  PUT URL with `captureMediaKey(workspaceId, \`${uuid}.${ext}\`)`. Returns `{uploadUrl, key}`.
- **Browser**: MediaRecorder captures to a Blob → `fetch(uploadUrl, {method:'PUT', body: blob})` →
  **bytes go straight to R2**. On unsupported MediaRecorder/getUserMedia → **upload fallback**
  (`<input type=file accept="video/*" capture>`), same presign+PUT. The key is passed to `submitCapture`.
- The proof references the media via the **asset URL for the key** (`assetUrlForKey`, reused), exactly
  like B2 / the stubbed clip pattern.

### D5 — The proof-source resolution (the integration crux — zero read-side edits)

- `SOURCE_KINDS` gains **`'link'`** (code-side allowlist; `source.kind` is text → **no migration**).
- The **seed** creates one **`link` source** per workspace (label e.g. **"Capture link"**) and a few
  `capture_request` rows (open / expired / used) pointing at it.
- A captured proof's `sourceId` = the request's `sourceId` (the `link` source). `getProofs`/`getProof`
  select `source: source.label` and render **any** label — so the new proof shows source "Capture link"
  and is otherwise **fixture-shaped**. **No read selects or branches on `source.kind`** ⇒ **zero edits**
  to inbox/dashboard/proof-detail. (Verified against the real queries in §Integration.)

### D6 — The UI port (screen-by-screen, mobile-first, binding references)

| Step | Built screen | Binding reference | Notes |
|---|---|---|---|
| Entry | Prompt | `01 _ Prompt _live _ tap Record_` | brand-addressed; **all four** options; photo/audio → "coming" (Q2) |
| Video | Recording | `02 _ Recording` | MediaRecorder, timer, "~20 seconds" |
| Video | Review | `03 _ Review` | "Looks good? Not sent yet — you can retake." Use this / Retake — **no edit** |
| Text | Write it | `07 _ Write it` | "In your own words —" textarea; empty rejected |
| Consent | Consent | `04 _ Consent` | screen-04 line + "Read the full terms"; least-privilege organic; display via resolveDisplay; takedown copy |
| Send | Sending | `05 _ Sending` | submit transition; honest upload/save error |
| Done | Thank-you | `06 _ Thank-you` | "Thank you, {name}… — {brand}", "Follow {brand} →" |
| Block | Expired/used | `10 _ Expired link` (minimal) | honest block; polished surface → T7.2b |

`capture-flow.tsx` is a **client state machine** (`prompt → record → review → consent → sending →
thanks`, with `prompt → write → consent → …` for text). Each state renders its ported sub-component.
Light + dark, mobile widths (`480` and below the primary target).

### D7 — Display prefs at capture (resolved: shown, more-private-only)

The consent screen shows the customer their **name + face** choice, **pre-filled from the workspace
default** (`workspace.defaultNameDisplay` / `defaultShowFace`, with `BUILTIN_DISPLAY_DEFAULT` fallback).
The customer may pick a **more private** option; the submit routes the choice through **`resolveDisplay`**
server-side (the sole sanctioned write path), so the stored value is **never less private** than the
default. If the screen-04 design does not depict this control prominently, it is a documented **P-V
note** — the control is required by P-VII (research R6), placed faithfully within the consent screen.

### D8 — Request creation + link display (this slice) / webhook + Resend (T7.3)

- Requests are **seeded** (D5) and creatable via a small **dev-only** path; their **link** (`/c/[token]`)
  is displayed as a **copyable URL** on the existing dev-only `styleguide/data` surface (404 in prod) —
  enough to point a test customer at the page. **QR is C1.** The webhook + Resend send are **T7.3**.

---

## Integration Surface — byte-stable owner reads (FR-015, confirmed against real queries)

A capture-written proof must render through these **unchanged**. All select **explicit columns** and key
on `source.label` / `proofType` / consent **state** — none branches on `source.kind` or the new tables:

| Consumer | Read | Why zero-edit |
|---|---|---|
| Inbox / `ProofCard` | `getProofs` | selects `source: source.label`, proof cols, `consentState` (state-only) — renders the `link`-sourced proof as an unreviewed card |
| Dashboard | `getDashboardSummary` | counts proofs / recent; the new proof is a normal row |
| Proof detail | `getProof` | opens the proof; consent granted; words/media shown via existing fields |
| Studio gate | `getGrantedConsentId` | the granted consent (organic) passes the generate gate unchanged |
| T5 consent ledger | `getConsentLedger`/`getConsentHistory` | the new granted version appears via `latestConsent*` |

**If any of these needs an edit to render real captured proof, STOP and surface it as a P-V issue.** The
expectation is **zero edits** (the proof is fixture-shaped; the only novelty is a real `source.label`).

## Phase 0 — research.md

R1 proof-source (link kind, no migration, zero read edits) · R2 unauthenticated route + token resolution
(no middleware/session) · R3 atomic send on neon-http (consume-conditional-UPDATE + `db.batch`) · R4
MediaRecorder + presigned-PUT + upload fallback · R5 verification-basis as a separate stub table · R6
display-prefs-at-capture + `resolveDisplay` server enforcement · R7 expiry/single-use semantics (72h;
`expiresAt>now()` authoritative). **Open: C1 (QR dep vs link-only).**

## Phase 1 — data-model.md, contracts/, quickstart.md

- **data-model.md** — `capture_request`, `verification_basis`, the `link` source, the write-path state
  machine + token lifecycle.
- **contracts/capture-actions.md** — `getCaptureRequestByToken`, `consumeCaptureToken`,
  `presignCaptureUpload`, `submitCapture` signatures + the batch write contract + failure semantics.
- **contracts/capture-ui.md** — the screen-by-screen port map + states (loading/sending/error/empty).
- **quickstart.md** — seed → open `/c/[token]` → video path + text path → confirm the proof in
  inbox/dashboard/detail → expired/used token block → build green.

## Clarifications to resolve *(blocking — human decision)*

### C1: QR display — add a (small) dependency, or link-only this slice?

**Context**: FR-002 mentions link **and** QR. Runtime QR generation needs a library; we're at **11 deps,
no-new-dep** is a standing constraint. The webhook + Resend (and the polished merchant request surface
05/06) are later slices.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Link-only this slice; defer QR** (copyable `/c/[token]` URL on the dev surface) | Honors no-new-dep; the link fully enables testing + pointing a customer; QR lands with the merchant request surface (T7.4) or T7.3. **(Recommended.)** |
| B | **Add a tiny QR dependency now** (e.g. a single-file QR encoder) | Faithful to "link and QR" now, but breaks the no-new-dep guard — needs your explicit approval (P-III). |
| C | Custom | Your own (e.g. a build-time/static QR for the seeded demo request only). |

**Recommendation: A** — link-only this slice; QR with the merchant surface later. **Your choice**: ____

## Complexity Tracking

No constitution violations. The only raw SQL is the conditional consume `UPDATE` inside a query function
(Drizzle-expressed) and the additive migration — both permitted. No new dependency unless C1→B.
