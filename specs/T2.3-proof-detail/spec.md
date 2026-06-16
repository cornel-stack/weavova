# Feature Specification: Proof Detail (the spine continues)

**Feature Branch**: `T2.3-proof-detail`

**Created**: 2026-06-16

**Status**: Draft

**Tier**: T2 — The spine (T2.3, third slice)

**Input**: User description: "T2.3 — Proof detail (the spine continues). Author the spec for the
single-proof detail view at `/app/proof/[id]`, opened from the inbox — where the
`/app/proof/[id]` placeholder becomes the real screen and `getProof(workspaceId, id)` gets its
first real consumer. Derive it from CLAUDE.md, the constitution, and design-reference/ screen 03.
Port, don't redesign; A-11 governs which controls render."

**Ported from**: `/design-reference/Weavova/The spine/03 _ Proof detail  _app_proof_id_.(html|png)`
(screen 03).

---

## Overview

The Proof detail is the third surface of the spine (Dashboard → Proof inbox → **Proof detail** →
Clip studio). It is the single-proof view opened when an owner activates a card in the inbox Wall
(T2.2's stretched-link → `/app/proof/[id]`). It replaces the current `/app/proof/[id]` minimal
placeholder with the real screen-03 port, inside the existing T1 AppChrome. It is where the owner
reads one piece of proof in full — the customer's testimonial and transcript, the source and capture
metadata, the verified/reviewed state, and the consent state — and from which, in T2.4, they will
open the clip studio. This slice gives `getProof(workspaceId, id)` (the workspace-scoped read whose
signature was fixed in T2.2) its first real consumer.

This slice ports screen 03 faithfully. It does **not** redesign it and it does **not** build the
surfaces screen 03 links to (the clip studio, the carousel/embed format makers, the "ask for more"
request flow, real consent management) — those are later slices/tiers. Per the **honesty rule
(FR-019 carry-over)**, the detail displays only what the fixtures actually contain: every seeded
proof carries `thumbnail = null` (no media file), so no media proof renders a player — the
transcript/quote is the content, behind an honest poster/placeholder.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read one piece of proof in full (Priority: P1)

A workspace owner opens a proof from the inbox and sees that proof in full: the customer's words
(quote or transcript) as the headline, the customer's name, the source, the capture date, the proof
type, and the verified/reviewed state — all read from the workspace-scoped data for that one proof.

**Why this priority**: This is the reason the detail exists and the destination of the inbox's
per-card navigation. It is the MVP of the slice — a real, complete, proof-forward single-proof view
rendered from `getProof(workspaceId, id)`.

**Independent Test**: Navigate from an inbox card to `/app/proof/[id]`; confirm the page renders
inside the AppChrome with that proof's real customer name, words, source, capture date, type, and
verified/reviewed state — nothing hardcoded, the customer's verbatim words the largest element.

**Acceptance Scenarios**:

1. **Given** a seeded proof, **When** the owner opens its `/app/proof/[id]`, **Then** the page renders
   inside the existing AppChrome (rail, top bar, switcher, palette) with a back affordance to the
   inbox, and the proof's content laid out per screen 03.
2. **Given** the proof, **When** it renders, **Then** the customer's verbatim words — the `quote`
   (text proof) or `transcript` (media proof) — are the largest, warmest element (Principle II),
   driven by `getProof` data with no hardcoded content.
3. **Given** the proof's metadata, **When** the detail renders, **Then** the customer name, source
   label, capture date, proof type, and the verified mark / reviewed state reflect that proof's real
   data.
4. **Given** a proof whose effective consent state is not "granted", **When** the detail renders,
   **Then** no path to generate a clip is offered (the consent gate, P-VII).

---

### User Story 2 - Trust the proof is real, consented, and from where it says (Priority: P1)

The owner sees the proof's provenance and permission: the verified-real-customer mark, the source it
came from, and the consent state — so they can trust it is a real, consented customer moment before
acting on it.

**Why this priority**: Proof that can't be trusted or lawfully used is worthless; the verified mark,
source, and consent state are the difference between real customer proof and the synthetic-UGC wave
Weavova is counter-positioned against. Ships with Story 1.

**Independent Test**: Open proofs in each consent state (granted / awaiting / revoked) and confirm the
detail shows the honest consent state for each, shows the verified mark only for verified proof, and
offers no clip path for non-granted proof.

**Acceptance Scenarios**:

1. **Given** a granted proof, **When** the detail renders, **Then** the consent panel shows an honest
   "granted" state and the consent-gated clip affordance is present (inert in this slice).
2. **Given** an awaiting or revoked proof (e.g. the seeded revoked customer), **When** the detail
   renders, **Then** the consent panel shows the honest "awaiting" / "revoked" state and **no** clip
   path is offered.
3. **Given** a verified proof, **When** it renders, **Then** the verified-real-customer mark is shown;
   an unverified proof shows no such mark.
4. **Given** the source, **When** the detail renders, **Then** the real source label (Shopify,
   Stripe, Instagram, Calendly, Square) is shown, and only data Weavova owns is displayed (no
   fabricated product/variant, reach, or sentiment — FR-019).

---

### User Story 3 - A proof that isn't yours (or doesn't exist) is not revealed (Priority: P1)

When the owner (or a crafted URL) requests a proof id that does not exist, or that belongs to another
workspace, the detail shows an honest "not found" state and reveals nothing about that proof — never
another tenant's data, never a raw error.

**Why this priority**: This is the tenant-isolation guarantee. `/app/proof/[id]` takes an arbitrary id
from the URL; the workspace-scoped read must ensure one workspace can never read another's proof. A
leak here is a security and trust failure, so it is P1 alongside the happy path.

**Independent Test**: Request `/app/proof/[id]` for (a) a non-existent id and (b) an id that exists in
a different workspace; confirm both render the same honest not-found state with a way back to the
inbox, exposing no proof content and no raw error.

**Acceptance Scenarios**:

1. **Given** an id with no matching proof, **When** the detail loads, **Then** an honest "proof not
   found" state is shown (with a back-to-inbox affordance) and no proof content is rendered.
2. **Given** an id that belongs to a different workspace, **When** the detail loads in the current
   workspace, **Then** the same not-found state is shown — the other workspace's proof is never
   rendered, named, or otherwise revealed (the scoped read returns nothing).
3. **Given** either not-found case, **When** it renders, **Then** no raw error, stack, digest, or
   database detail is exposed, and the result is indistinguishable between "doesn't exist" and
   "exists but not yours" (no existence oracle).

---

### User Story 4 - The detail is reliable and handles its states (Priority: P2)

The detail surfaces an explicit loading state, recovers transparently from a Neon cold start, and
shows a clear retryable error only on genuine failure — reusing the T2.1/T2.2 reliability patterns —
so the screen the owner drills into feels as reliable as the inbox.

**Why this priority**: Essential for the detail to feel trustworthy, but secondary to the proof
rendering and the isolation guarantee. Reuses proven building blocks (`withDbRetry`, the shared
`<ErrorState>`), distinct from the not-found state (US3).

**Independent Test**: Simulate a slow/transient first read and a persistent failure; confirm the
loading state, transparent recovery, and the shared error state with retry — and that a genuine
failure is visibly distinct from the not-found state.

**Acceptance Scenarios**:

1. **Given** the proof has not loaded, **When** the detail is rendering, **Then** a loading state is
   shown that preserves the layout using Pressroom tokens.
2. **Given** a transient cold-start failure, **When** the detail loads, **Then** the read is retried
   transparently (`withDbRetry`) and the proof renders on recovery, with no error surfaced.
3. **Given** a failure that persists past the retry policy, **When** the detail loads, **Then** the
   shared `<ErrorState>` is shown with a retry affordance and no raw error text — distinct from the
   not-found state (US3), which is not an error.

---

### Edge Cases

- **Media proof with no media file**: every seeded video / photo / audio proof has `thumbnail = null`
  (no real media). The detail MUST render **no media region at all** — no empty frame, poster,
  placeholder, or fake/disabled player — and leads with the transcript as the content (Q1, FR-009).
- **Text proof**: has a `quote` and no transcript; the quote is the content and there is no media
  region (text proofs have no media either way).
- **Not-found vs. error**: a missing/other-workspace id (US3) is an honest not-found state, NOT the
  error state (US4); the two must be visually and semantically distinct.
- **Revoked / awaiting consent**: the detail shows the honest consent state and offers no clip path
  (P-VII), exactly as the inbox and the canonical ProofCard already enforce.
- **Long transcript / long customer name**: content wraps and scrolls within the layout without
  overflow or breaking the chrome.
- **Direct deep-link / refresh on `/app/proof/[id]`**: the page renders correctly when loaded
  directly (not only via in-app navigation from the inbox).
- **Unverified and/or unreviewed proof**: the verified mark is absent for unverified proof; the
  reviewed/unreviewed state is shown honestly; neither blocks reading the proof.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The detail MUST replace the current `/app/proof/[id]` minimal placeholder and render
  inside the existing T1 AppChrome, without modifying the chrome, rail, top bar, switcher, or command
  palette.
- **FR-002**: The detail MUST read its single proof from the **current workspace** via
  `getProof(getCurrentWorkspace().id, id)` — the workspace-scoped read (signature fixed in T2.2),
  wrapped in `withDbRetry`. No proof content may be hardcoded; no schema, seed, or session-seam change
  is made.
- **FR-003**: The detail MUST be a **faithful port of screen 03** (P-V), leading with the customer's
  verbatim words — the `quote` (text proof) or `transcript` (media proof) — as the largest, warmest
  element (P-II), and presenting the proof's content, the metadata panel, and the consent panel as
  pictured (subject to the honesty rules below).
- **FR-004**: The detail MUST show the proof's real metadata: customer name, source label, capture
  date, proof type, the **verified-real-customer mark** (only when `verified`), and the
  **reviewed/unreviewed** state — all from `getProof` data.
- **FR-005**: The detail MUST show the proof's **effective (latest-version) consent state** (granted /
  awaiting / revoked) honestly in the consent panel, **together with the effective consent's date and
  version** — matching screen 03's "granted · {date} · v{n}". The date + version MUST be carried for
  **all** effective states (the seeded revoked proof shows its **revocation** date + version too),
  sourced from the owned `consent` data (not fabricated). To do this without touching the shared read,
  the detail reads a **detail-specific richer projection** — `ProofDetailView` = `ProofView` + the
  effective consent's date + version — so the shared `ProofView`, `getProofs`, and the canonical
  ProofCard stay byte-stable (A-12). This is a **projection-only** change: no schema, seed, or seam
  change. The full multi-version "Record" history stays **deferred** (later tier).
- **FR-006**: The detail MUST honour the **consent gate (P-VII)**: a path to make a clip is offered
  ONLY when the effective consent state is "granted". No clip path is ever offered from awaiting or
  revoked proof.
- **FR-007**: The **"Make a clip"** affordance (the consent-gated primary action that leads to the
  clip studio, T2.4) MUST be **present-but-inert** in this slice — keyboard-reachable, on-brand
  (persimmon), a no-op that never errors (the T2.1/T2.2 inert pattern). It is shown only for granted
  proof (FR-006).
- **FR-008**: Per the honesty rule (FR-019 carry-over), the detail MUST display only data Weavova owns
  end-to-end. It MUST NOT render the screen-03 **sentiment/warmth panel** ("Glowing · NN/100 warmth"
  and the sentiment read) — that signal does not exist in the schema and would be fabricated; it is
  the same un-owned signal deferred to T4/B3 (A-10). No warmth/sentiment number, label, or quote is
  shown.
- **FR-009 (media availability — conditional region)**: The media region MUST render **only when the
  proof actually has media** (a real media reference). When media is **absent** — true for all current
  fixtures (`thumbnail = null`) — the detail MUST render **no media region at all**: no empty frame, no
  poster, no placeholder, and no fake or disabled player (no fabricated duration, no scrubber, no no-op
  play). In that case the customer's words (transcript/quote) lead as the content. The
  presence/absence test is the **same seam logic as the T2.1 clip cells**: real media (T7/T8) drops
  into the same region with no relayout. The detail never fabricates or implies media that does not
  exist (FR-019).
- **FR-010**: The detail MUST present the proof's **transcript** (media proofs) or **quote** (text
  proofs) as the readable content of the screen, matching screen 03's transcript treatment, with no
  fabricated transcript when the field is absent.
- **FR-011 (tenant isolation)**: When `getProof(workspaceId, id)` returns no proof — because the id
  does not exist OR belongs to another workspace — the detail MUST render an honest **not-found**
  state with a back-to-inbox affordance, MUST NOT render any proof content, and MUST be
  indistinguishable between "does not exist" and "exists but not in this workspace" (no existence
  oracle, no cross-tenant leak).
- **FR-012**: The not-found state (FR-011) MUST be **distinct** from the genuine-failure error state
  (FR-014): not-found is an expected, non-error outcome; the error state is for read failures.
- **FR-013**: The detail MUST reuse the T2.1/T2.2 reliability pattern: the workspace-scoped read is
  wrapped in `withDbRetry` so a transient Neon cold start is retried transparently behind a loading
  state.
- **FR-014**: The detail MUST present an explicit **loading state** (preserving the screen-03 layout,
  on-token) and a genuine-failure **error state** using the **shared `<ErrorState>`** (with retry, no
  raw error text) introduced in T2.1.
- **FR-015**: The detail MUST provide a **back affordance to the inbox** (`/app/proof`), matching
  screen 03's "← Proof" navigation, keyboard-operable.
- **FR-016**: Screen 03's later-tier secondary controls MUST be handled per the port-completeness
  meta-rule (A-11): kept visible only when they read as a working "coming soon" inside a working
  control or as a standalone entry-point with a committed home; hidden when dead standalone,
  undesigned, or coupled machinery that cannot function alone. Specifically:
  - **FR-016a**: Of screen 03's tab strip (Transcript / Suggested formats / Generated assets /
    Activity), **only Transcript has owned data**. The detail MUST **hide the tab chrome** and present
    the transcript directly as the content section — the same treatment as T2.2's hidden Wall/List
    toggle. It MUST NOT render the dataless/undesigned **"Suggested formats"** or **"Activity"** tabs,
    and MUST NOT show **"Generated assets · N"** with a fabricated count (that entity arrives at
    T2.4/T8). These tabs return when their data exists (A-09).
  - **FR-016b**: The **"Use this as the hook"** transcript action (clip-studio hook selection, T2.4)
    MUST be inert or hidden per A-11 (it is coupled to the studio that does not exist yet).
  - **FR-016c**: The **"Carousel"** (T4), **"Embed"** (T5), and **"Ask this customer for more"**
    (outreach, later tier) secondary actions MUST **NOT be rendered** in this slice — **deferred whole**
    until their tiers (A-11 defer, like T2.2's batch cluster), so the detail is not a "dead toolbar". The
    **only** kept action is **"Make a clip"** (FR-007, consent-gated, present-but-inert). (Resolved,
    human decision 2026-06-16; see A-09.)
- **FR-017**: The detail MUST omit data the schema does not carry: the **product/variant** line
  ("Soy candle · Fig & Cedar") and any **capture-channel phrasing** not backed by owned data are not
  fabricated (carry-over of T2.1's A-06; FR-019).
- **FR-018**: The detail MUST NOT introduce real **consent-management actions** (grant/revoke/edit) —
  the consent panel is **read-only** in this slice; real consent management is a later tier. Any
  consent-history disclosure (screen 03's "Record") is read-only if shown, and deferred otherwise
  (tied to Q2).
- **FR-019 (data-ownership, carry-over)**: The detail MUST only display data Weavova owns end-to-end
  (proof, consent, source). It MUST NOT display or imply any metric from an integration Weavova does
  not have (social reach/views/engagement, or an un-owned warmth/sentiment signal) — consistent with
  the T2.1/T2.2 governing rule. (Directly informs FR-008 and Q1.)
- **FR-020**: The detail MUST be **responsive** across the Pressroom breakpoints (480 / 1024 / 1280 +
  1240 max): screen 03's two-column layout (content + side panel) reflows to a single column on narrow
  viewports without horizontal scroll or overlap.
- **FR-021**: The detail MUST be **keyboard-accessible**: the back affordance, the (inert) "Make a
  clip" action where shown, and any retained interactive control are reachable and operable by
  keyboard with a visible focus indicator.
- **FR-022**: All product **microcopy** MUST match screen 03's wording where it specifies it, MUST be
  honest about absent data, and MUST avoid "amazing"/"awesome" and emoji (P-XI).
- **FR-023**: The slice MUST NOT introduce any new dependency, MUST NOT alter the database schema,
  seed, or the auth/session seam, MUST keep the canonical ProofCard byte-unchanged if it is referenced,
  and MUST NOT build the clip studio, carousel/embed makers, the request flow, or real consent
  management.

### Key Entities *(include if feature involves data)*

- **Workspace**: the tenant the detail is scoped to; resolved via the session seam. The detail reads
  only this workspace's proof — the basis of the tenant-isolation guarantee (US3). (Existing, T0.3.)
- **Proof**: the single captured piece of proof (text / video / photo / audio) with customer name,
  quote or transcript, source, capture date, `reviewed` / `verified` flags, and an (absent in
  fixtures) media reference. The subject of the screen. (Existing, T0.3.)
- **Consent**: versioned, revocable; the effective (latest-version) state — plus its **date and
  version** — drives the consent panel and the per-proof clip gate. The effective state's date+version
  is owned data, surfaced via the detail-specific projection (A-12, FR-005); the full multi-version
  history stays deferred. (Existing, T0.3.)
- **Source**: the origin label (Shopify, Stripe, …) shown in the metadata panel. (Existing, T0.3.)
- **ProofDetailView (read projection, not a stored entity)**: the detail-only read shape =
  `ProofView` + the effective consent's date + version. It exists so the detail can be faithful to
  screen 03 without changing the shared `ProofView`/`getProofs`/ProofCard. Projection-only; no schema
  change. (A-12, FR-005.)
- **Media file (conditionally present)**: the real recording/image a media proof would display. The
  fixtures carry none (`thumbnail = null`), so **no media region renders now**; when real media lands
  (T7/T8) it renders in the same region with no relayout. (Informs Q1, FR-009.)
- **Warmth / sentiment signal (NOT modelled)**: the data behind screen 03's "warmth" panel. It does
  not exist in the T0.3 schema and is not introduced or fabricated here (FR-008/019, A-10).
- **Derived asset / clip (NOT present)**: the data behind "Generated assets" and the format makers.
  The entity arrives at T2.4/T8; no count or asset is fabricated here (FR-016a).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From an inbox card, an owner reaches that proof's full detail and can read its complete
  testimonial/transcript, source, capture date, and consent state in one view, without leaving the
  page, in under 5 seconds on the seeded workspace.
- **SC-002**: 100% of the detail's content (words, metadata, verified/reviewed/consent state) is
  derived from that proof's data — verifiable by changing a fixture (edit the quote/transcript, toggle
  `reviewed`/`verified`, revoke consent) and observing the detail change with no code edit.
- **SC-003**: For every proof type, no media region is shown for a proof with no media file — 0 fake
  players, 0 fabricated durations/scrubbers, and 0 empty frames/posters/placeholders across the seeded
  video / photo / audio proofs — and the transcript/quote is always the readable content.
- **SC-004**: No clip path is offered for any proof whose effective consent state is not "granted" (0
  violations across the seeded granted / awaiting / revoked fixtures).
- **SC-005**: 100% of not-found requests (non-existent id and other-workspace id) render the honest
  not-found state with 0 bytes of the requested/other proof's content exposed and 0 raw errors, and
  the two cases are indistinguishable (no existence oracle).
- **SC-006**: On a transient cold-start failure the detail recovers and renders without the user
  seeing an error; the error state appears only when the failure persists, a retry from it succeeds,
  and it is never confused with the not-found state.
- **SC-007**: No un-owned metric (warmth/sentiment, social reach/views, product/variant) appears
  anywhere on the detail (0 fabricated data points).
- **SC-008**: The detail renders without horizontal scroll, overlap, or unreachable controls at each
  breakpoint (≤480, 1024, 1280, and the 1240px content max), and no new dependency is added.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: The detail's largest, warmest element is the customer's verbatim
  words (quote/transcript); the metadata, consent, source, and (inert) actions stay quiet chrome. With
  no media file, the words lead — honestly — rather than a placeholder pretending to be a video.
- **Port, don't redesign (P-V)**: Ported from `/design-reference` screen 03 — the content/transcript
  area, the metadata panel, the consent panel, the back affordance, and the consent-gated primary
  action. Faithful porting follows the **port-completeness meta-rule (A-11)**: the un-owned warmth
  panel and the unbacked "Generated assets/Activity" tabs are not shown with fabricated data (FR-019),
  the clip studio / carousel / embed / ask-for-more actions are inert-or-hidden per the hide-vs-keep
  test, and any state the design does not cover (not-found, loading, error) is surfaced as a derived
  state, not invented as a new layout (P-XII). Screen-03 ambiguities are raised as Q1–Q3, not guessed.
- **Fixtures-first (P-VI)**: All data flows through the T0.3 query layer (`getProof`, workspace-scoped)
  over the seeded fixtures; the fixture/`ProofView` shape is the schema contract; the T6 multi-tenant
  swap stays mechanical.
- **Consent (P-VII)**: The consent state is shown honestly and is read-only here; the clip path is
  gated to granted proof only. No clip can be made from non-consented proof. Revocation cascade is a
  property of the model (already established at T0.3) — this slice surfaces consent state, it does not
  manage it.
- **No editor (P-VIII)**: N/A — the detail reads one proof and links toward the studio; it builds no
  timeline/track/scrubber and no format picker. (The "Make a clip" action is an inert link target, not
  an editor.)
- **Scope (P-IX, P-XI)**: A single vertical slice (T2.3) within tier T2 — the proof-detail surface
  only. It does not build the studio, the format makers, the request flow, or consent management;
  affordances that point at those are inert-or-hidden. No speculative additions.
- **Microcopy (P-XI)**: Product copy matches screen 03's wording where specified, is honest about
  absent data, and avoids "amazing"/"awesome" and emoji.

## Assumptions

- **A-01 (opened from the inbox; id from the URL)**: The detail is reached via T2.2's per-card
  stretched-link to `/app/proof/[id]`; the `[id]` is an arbitrary URL segment, so the workspace-scoped
  read is the trust boundary (US3), and the page must also render correctly on direct deep-link/refresh.
- **A-02 (content = quote ?? transcript)**: Consistent with the ProofCard and T2.2, the proof's
  "words" are the `quote` for text proofs and the `transcript` for media proofs; the detail leads with
  whichever the proof carries. (All seeded media proofs carry a transcript; all text proofs a quote.)
- **A-03 (no media in fixtures → no media region; CONDITIONAL render)**: All 15 fixtures have
  `thumbnail = null`; no proof has a media file. The detail therefore renders **no media region at
  all** for the current data — no empty frame, poster, placeholder, or fake/disabled player (Q1→A
  refined, FR-009). The region is conditional on the proof actually having media, using the **same
  seam logic as the T2.1 clip cells**: real media (T7/T8) renders in the same place with no relayout.
- **A-04 (warmth/sentiment not modelled — not shown)**: Screen 03's "warmth/sentiment" panel has no
  backing field in the T0.3 schema; it is the same un-owned signal as T2.2's "Warmest" sort. It is
  **not rendered** here (FR-008/019); the real signal arrives at **T4/B3** (A-10). No owned-data proxy
  is relabelled "warmth".
- **A-05 (reuse T2.1/T2.2 building blocks)**: The read uses `withDbRetry`; the error state uses the
  shared `<ErrorState>`; the loading state mirrors the established skeleton approach. No new patterns
  invented.
- **A-06 (not-found is a state, not an error)**: The scoped `getProof` returning `null` is an expected
  outcome rendered as an honest not-found state (US3/FR-011), distinct from the genuine-failure error
  boundary (FR-012/FR-014). The design-reference has no not-found screen, so it is surfaced as a
  derived state (P-XII), not invented as a new layout.
- **A-07 (product/variant and capture-channel phrasing omitted)**: Screen 03's product/variant line
  ("Soy candle · Fig & Cedar") and "submitted via collection link" phrasing are not backed by owned
  schema fields; they are omitted rather than fabricated (carry-over of T2.1's A-06).
- **A-08 (sample data differs from fixtures)**: Screen 03's sample customer ("Maria L.", the "8:24"
  video, the "94/100 warmth", "Generated assets · 1") is export sample content; the detail renders OUR
  seeded proof, so the specific values differ and the un-owned ones are absent — expected (computed,
  not hardcoded).
- **A-09 (DEPENDENCIES — later-tier actions and their homes; governed by A-11; RESOLVED 2026-06-16)**:
  **"Make a clip"** → the **only kept action**, present-but-inert + consent-gated, real target = clip
  studio (**T2.4**, screen 04). **HIDDEN / deferred-whole until their tiers** (FR-016c): **"Carousel"** →
  make-carousel (**T4**, screen 22); **"Embed"** → make-embed (**T5**, screen 21); **"Ask this customer
  for more"** → ask-for-more / request flow (**outreach, later tier**, screen 23). **Also not rendered**:
  **"Use this as the hook" / "Suggested formats" / "Generated assets"** → clip studio / derived-asset
  machinery (**T2.4 / T8**); **"Activity"** → not modelled (no committed tier). The **tab strip chrome is
  hidden** (Q3→A): only the Transcript content shows. Each returns when it actually works (same
  defer-whole logic as the T2.2 batch cluster) — the detail is not a panel of dead controls.
- **A-10 (consent panel is read-only)**: The consent panel displays the effective **state + date +
  version** (Q2→B, FR-005) for all states; it provides no grant/revoke/edit action in this slice. Real
  consent management, and the full multi-version "Record" history, are later tiers.
- **A-12 (DECISION — detail-specific projection `ProofDetailView`)**: To show the consent date+version
  faithfully (Q2→B) without contract churn, the detail reads `ProofDetailView` = `ProofView` + the
  effective consent's date + version. The shared `ProofView`, `getProofs`, and the canonical ProofCard
  are **not** changed (T2.2 and the inbox stay byte-stable). This is a **projection-only** change to
  the read layer — no schema/seed/seam change, no new dependency. The richer view carries date+version
  for granted / awaiting / revoked alike (so the revoked proof shows its revocation date+version).
- **A-11 (PORT-COMPLETENESS meta-rule — carried from T2.2)**: A faithful port does not render a
  pictured control that cannot work. The detail must feel complete for **reading one proof**, not be a
  panel of greyed-out buttons and fabricated metrics. This rule governs every "pictured but
  not-yet-functional" decision here (the warmth panel, the tabs, the format/ask actions, the hook
  action). (Established T2.2, human decision 2026-06-15.)

## Clarifications

> Three screen-03 ambiguities were surfaced (Principle XII + the carry-over data-honesty rule) rather
> than guessed, mirroring how T2.1's clip-cells and T2.2's Warmest/List were handled. **All three are
> now RESOLVED** (human decisions, 2026-06-16) and folded into the requirements/assumptions above. The
> tenant-isolation not-found behaviour (US3/FR-011) and the data-ownership rule (FR-019) are unchanged;
> no schema/seed/seam change and no new dependency.

### Question 1 — RESOLVED: Media region with no media file

**Context**: Screen 03 leads with a large media player (poster + play + "customer video · 8:24").
Every seeded proof has `thumbnail = null` — no media file, no duration. FR-019/FR-009 forbid a broken
or fake player.

**Resolution** (human decision, 2026-06-16): **Option A, refined to a CONDITIONAL media region.** Do
**not** render an empty placeholder for media that doesn't exist. The media region renders **only when
the proof actually has media**; when absent (every current fixture), the transcript/quote leads and
**no empty media frame or placeholder shows**. Honest now, forward-compatible for real media (T7/T8)
into the same region — the **same seam logic as the T2.1 clip cells**. Captured in **FR-009** and
**A-03**.

### Question 2 — RESOLVED: Consent panel fidelity (state + date + version)

**Context**: Screen 03's consent panel shows "Consent granted · 12 May · v2 · Record". The consent
**data** (state, grantedAt/revokedAt, version) is owned (in the `consent` table), but the shared
`getProof` → `ProofView` projects only the effective state string. Real consent **management** is out
of scope regardless (FR-018).

**Resolution** (human decision, 2026-06-16): **Option B, implemented as a DETAIL-SPECIFIC projection.**
Showing the owned date+version is faithful, not fabricated. Add a `getProof`-specific richer view —
**`ProofDetailView` = `ProofView` + the effective consent's date + version** — and do **not** change
the shared `ProofView` or `getProofs`, so T2.2 and the ProofCard stay byte-stable. Projection-only, no
schema change. Date+version are carried for **all** effective states (so the revoked proof shows its
revocation date+version too). The full multi-version "Record" history stays **deferred** (option C).
Captured in **FR-005**, **A-10**, and **A-12**.

### Question 3 — RESOLVED: The screen-03 tab strip

**Context**: Screen 03 shows a tab strip — **Transcript** (real), **Suggested formats** (T2.4),
**Generated assets · 1** (derived-asset entity; the "· 1" is fabricated), **Activity** (not modelled).
Only Transcript has owned backing — the same "one-sided toggle" shape as T2.2's Wall/List.

**Resolution** (human decision, 2026-06-16): **Option A.** Only Transcript has data: **hide the tab
chrome and show the transcript as the content** — the same treatment as T2.2's hidden Wall/List
toggle. "Suggested formats", "Generated assets" (never with a fabricated count), and "Activity" return
when their data exists (T2.4+). Recorded with tiers in **A-09**; captured in **FR-016a**.
