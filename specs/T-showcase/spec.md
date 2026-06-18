# Feature Specification: Showcase (curate + preview the wall of proof)

**Feature Branch**: `T-showcase`

**Created**: 2026-06-18

**Status**: Draft — **clarifications RESOLVED** (human decision, 2026-06-18): **Q1→A** curate + preview now
(distribution → T9); **Q2→A** AUTO — read-only, **no schema change** (the curation + publish/embed cluster
defers to T9 as one coupled feature); **Q3→A** both proof + clips, all-consented, verified surfaced as a
mark (not a gate), withdrawal-filtered. Folded into the requirements below. Ready for `/speckit.plan`.

**Tier**: T-Showcase — the last deferred surface, built ahead of the distribution tier (T9). The Showcase's
*real* (public/embed) form is **T9**; this slice is its honest **pre-distribution** half.

**Input**: User description: "T-Showcase — /app/showcase, the curated, public-style 'wall of proof' of a
workspace's consented testimonials and clips (the thing that eventually gets shared/embedded). What does a
Showcase DO before there is any publishing/embedding/sharing (that machinery is T9)?"

**Ported from**: `/design-reference/Weavova/The Workspace/10 _ Showcase manager  _app_showcase.(html|png)`
(screen 10). **A screen DOES exist to port** (unlike the clip detail) — but it depicts both the **owned
curate/preview** half *and* the **T9 distribution** machinery (a LIVE/"public set", an embed `<script>`
snippet, "Copy embed", layout-and-embed presets). Per A-11 only the owned half is built here; the embed/
publish/LIVE controls are **deferred to T9** (hidden, not dead). A **separate** export — `Public site →
Public showcase _showcase` — is the public-facing wall itself; that is **T9**, not this slice.

---

## Overview

The Showcase is a workspace's **wall of proof** — its consented testimonials and clips, arranged as a
public-style display (distinct from the working inbox and the Library). It is the surface that *eventually*
gets published, embedded, and shared as acquisition (CLAUDE.md §2: "the public showcase feeds growth").

**But that publishing/embedding/sharing is the distribution tier (T9), and none of its machinery exists
yet** — no public URL, no embed CDN, no "go live". So the central question (Q1): **what does the Showcase
honestly DO today?** The recommended framing — an internal **curate + preview** surface: assemble and
preview your showcase wall from consented proof + clips, with the actual **publish / embed / share /
public-URL / "go live"** controls **deferred to T9** (rendered nowhere — A-11, hidden not dead). Screen 10
is literally a *"manager"* + an embed panel, which fits: build the manager/preview, defer the embed.

Governed by the three laws. **P-VII**: the wall shows a proof/clip **iff** its (source) proof's effective
consent is currently `granted` — a withdrawn item is **absent**, via the same shared `effectiveConsentGranted`
that governs the dashboard/Library/detail; records are retained (audit). **FR-019**: every value is owned —
the customer, their words, the clip's format/hook, dates — and **no** fabricated metric (views, reach,
likes, "social proof" counts, LIVE-since). **A-11**: only controls whose data/destinations exist render; the
T9 distribution controls and (per Q2) any unbacked curation control are **not** rendered.

Two scope forks must be resolved before planning (Q2, Q3): **does the merchant curate the set** (select
what's featured — which needs a **featured/membership flag = a schema change** + a curation control + the
"Add from library" picker, faithful to screen 10) **or does it auto-show all eligible** consented proof+clips
(no schema change, read-only, leaner)? And **what's in it** — clips, proof, or both; verified-only or
all-consented? The spec is written against the leaner recommended defaults (auto, both, all-consented) and
flags exactly where the curated path changes it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Preview the wall of proof (Priority: P1)

A workspace owner opens the Showcase and sees their wall — the workspace's consented testimonials and clips
arranged as a public-style display — so they can see what their proof looks like assembled, before any of it
is published (T9).

**Why this priority**: It is the honest, buildable core today and the slice's MVP — a real preview of the
assembled wall from consented proof+clips, distinct from the inbox/Library.

**Independent Test**: With consented proof+clips seeded, open `/app/showcase`; confirm the wall renders them
as a public-style display (owned data only), inside the AppChrome.

**Acceptance Scenarios**:

1. **Given** a workspace with consented proof+clips, **When** the owner opens `/app/showcase`, **Then** the
   wall renders them as a public-style display (distinct from the inbox/Library layouts), with an honest
   count of what's shown.
2. **Given** the wall renders, **When** it shows each item, **Then** it shows only **owned** values (the
   customer, their words/quote or the clip's sample-preview + format/hook, the date) — **no** views/reach/
   likes/"social proof"/LIVE-since metric (FR-019).
3. **Given** the wall renders, **When** it shows clips, **Then** a clip is an honest **sample/preview**
   stand-in (pre-T8), never a finished personalised render.

---

### User Story 2 - Withdrawn-consent items are absent (Priority: P1)

A proof or clip whose consent has been revoked does **not** appear on the wall — the same read-time
withdrawal that governs the rest of the app — while its record is retained for audit.

**Why this priority**: Consent Is Sacred (P-VII), and the Showcase is the surface closest to being *public*
— a withdrawn item leaking here is the highest-stakes version of the violation the product exists to prevent.

**Independent Test**: With a seeded withdrawn item (e.g. Leo M.'s proof + its clip), open the Showcase;
confirm both are absent while consented items are present, and the count excludes them.

**Acceptance Scenarios**:

1. **Given** a proof/clip whose effective consent is `revoked`/`awaiting`, **When** the Showcase reads its
   items, **Then** that item is **absent** from the wall and the count — via the shared
   `effectiveConsentGranted` gate, identical to the dashboard/Library.
2. **Given** the same data, **When** consent is later granted again, **Then** the item reappears (visibility
   follows current effective consent, read each time).
3. **Given** withdrawal, **When** an item is withheld, **Then** its record is **not deleted** (audit
   retained); withdrawal is visibility-only.

---

### User Story 3 - Honest empty, loading, and error states (Priority: P2)

The Showcase handles its full state set: an honest empty wall when there's nothing (yet) consented to show, a
loading state, transparent cold-start recovery, and the shared error surface.

**Why this priority**: A surface is only trustworthy if its non-populated states are honest. Secondary to
showing the wall, but required for the Definition of Done.

**Independent Test**: With zero eligible items, confirm the empty state (no fabricated rows/counts); simulate
a slow/transient read and a persistent failure; confirm loading, transparent recovery, and the shared error
state with retry.

**Acceptance Scenarios**:

1. **Given** a workspace with no consented (eligible) proof/clips, **When** the Showcase renders, **Then** it
   shows an honest empty state (no fabricated rows/counts) that orients the merchant toward capturing/making
   proof.
2. **Given** the Showcase is loading, **When** the read is in flight, **Then** an on-token loading state
   shows; a transient cold start is retried transparently and the wall renders on recovery.
3. **Given** a failure that persists past the retry policy, **When** the read fails, **Then** the shared
   error state is shown with a retry affordance and no raw error text.

---

### User Story 4 - The distribution controls are honestly absent (Priority: P2)

The publish / embed / share / public-URL / "go live" controls screen 10 depicts are **not** rendered (their
machinery is T9) — the Showcase is unmistakably a curate/preview surface today, not a half-wired publishing
tool.

**Why this priority**: Faithful A-11 porting of a screen whose controls outrun the current tier. The Showcase
must feel complete *for previewing*, not be a panel of dead "Copy embed"/"Go live" buttons.

**Independent Test**: Inspect the Showcase; confirm no embed snippet/"Copy embed", no publish/"go live", no
public-URL, no share control, and no fabricated LIVE/published state.

**Acceptance Scenarios**:

1. **Given** the Showcase renders, **When** it shows the wall, **Then** it does **not** render the embed
   `<script>` snippet, "Copy embed", a publish/"go live" toggle, a public URL, or a share control (all T9).
2. **Given** the Showcase renders, **When** it shows items, **Then** it does **not** show a fabricated
   "LIVE"/published badge or a "live since" date (no publishing state exists to back it — FR-019).
3. **Given** the layout-and-embed presets (Single highlight / Carousel / Wall of Love) screen 10 shows,
   **When** the Showcase renders, **Then** presets that only matter for embed/publish output are not
   rendered as functional controls (they configure a T9 artifact that doesn't exist) — see Q1/Q2.

---

### Edge Cases

- **All items withheld**: if every eligible item is currently consent-withheld, the Showcase shows the
  **empty state**, not an empty wall with a non-zero count.
- **Mixed proof types + clips**: text/video/photo/audio proof and clips all appear; clips read as honest
  sample/preview stills, nothing implies a played render or fabricated footage (pre-T8).
- **An item consented but not verified**: shown or not per Q3 (verified-only vs all-consented); if shown, the
  verified mark appears only when actually verified (owned, never fabricated).
- **Curated path (if Q2 = curated) with an empty set**: if the merchant has curated **nothing** into the
  set, the empty state distinguishes "nothing curated yet" from "nothing eligible" honestly (no fabricated
  members).
- **Large wall**: remains usable and on-layout as the item count grows; any volume cap/pagination is an
  explicit later concern, surfaced — not a silent truncation.

## Requirements *(mandatory)*

> Several requirements branch on Q1–Q3. Each is written against the recommended default and flags the
> alternative.

### Functional Requirements

- **FR-001**: The Showcase MUST render at **`/app/showcase`**, replacing the T1 placeholder, inside the
  existing AppChrome (no change to chrome/rail/top bar/switcher/palette).
- **FR-002 (the read — `getShowcase`)**: A new **workspace-scoped** read MUST return the wall's items
  (consented proof and/or clips per Q3), **consent-withdrawal-filtered** via the **shared
  `effectiveConsentGranted`** (visibility identical to the dashboard/Library), `withDbRetry`-wrapped. Honest
  counts only (FR-019). **Default (Q2 = auto)**: it reads **all eligible** consented items (no schema
  change). **If Q2 = curated**: it reads the **featured set** (requires a membership flag/table — a schema
  change — see FR-009).
- **FR-003 (a public-style wall — port screen 10's display)**: The Showcase MUST present the items as a
  **public-style wall** (distinct from the inbox masonry and the Library grid — the screen-10 display),
  showing only **owned** data: the customer, their verbatim words/quote (or, for clips, the sample-preview +
  format/hook), the verified mark when actually verified, and the date. It MUST keep the customer the
  headline (P-II).
- **FR-004 (honest clip representation — FR-019)**: Clips on the wall MUST read as honest **sample/preview**
  stand-ins (pre-T8), never finished personalised renders; no fabricated transcript/caption/footage.
- **FR-005 (owned data only — FR-019)**: The Showcase MUST NOT display any view/reach/engagement/likes/
  "social proof"/published-since metric, or any fabricated value. The count is the honest number of items
  shown.
- **FR-006 (P-VII withdrawal)**: A proof/clip whose (source) proof's effective consent is not `granted` MUST
  be **absent** from the wall and the count, via the shared gate; the record is **retained** (audit).
- **FR-007 (distribution controls NOT rendered — A-11)**: The Showcase MUST NOT render the **embed snippet /
  "Copy embed", publish / "go live", public URL, or share** controls (T9 machinery does not exist) — hidden,
  not dead, not fabricated. No fabricated **LIVE/published** badge or "live since" date.
- **FR-008 (empty state)**: When there are no items to show (none eligible, or — if curated — none curated,
  or all withheld), the Showcase MUST show an honest **empty state** (no fabricated rows/counts) orienting
  the merchant appropriately.
- **FR-009 (curation — Q2-dependent)**: **Default (Q2 = auto)**: the Showcase has **no curation control** and
  **no schema change** — it auto-shows all eligible items; "Add from library" and the LIVE/"public set"
  membership from screen 10 are **not rendered** (A-11 — no backing). **If Q2 = curated**: a **featured/
  membership flag (a schema change)** + a **curation control** ("Add from library", per screen 18 the proof
  picker) + add/remove-from-set are in scope — and the schema must be written before the screen reads it
  (P-VI).
- **FR-010 (layout presets — Q1/Q2-dependent)**: Screen 10's **Single highlight / Carousel / Wall of Love**
  presets configure embed/publish *output*. **Default**: render at most a single honest preview layout (the
  wall); preset *switchers* that only shape a T9 embed artifact are **not** rendered (A-11). (If a
  preview-only layout toggle is wanted with no embed coupling, that is a small in-scope option — see Q1.)
- **FR-011 (loading state)**: The Showcase MUST present an on-token loading state while its read is in flight;
  a transient cold start MUST be retried transparently.
- **FR-012 (error state)**: A genuine read failure (after the retry policy) MUST render the shared error
  surface with retry and **no raw error text**.
- **FR-013 (workspace isolation)**: The Showcase MUST show only the current workspace's items; no other
  workspace's proof/clip is read or shown.
- **FR-014 (responsive + keyboard)**: Responsive across the Pressroom breakpoints (480 / 1024 / 1280 + 1240
  max) — the wall reflows without horizontal scroll/overlap — and keyboard-accessible.
- **FR-015 (microcopy / honesty)**: Microcopy MUST match screen 10 where it specifies it, be honest that
  publishing/embedding is not yet available, and avoid "amazing"/"awesome" and emoji (P-XI).
- **FR-016 (scope)**: The slice MUST NOT build: publishing, embedding, sharing, public URLs, or any
  distribution (T9); the public-facing `/showcase[/slug]` page (T9); the real render engine (T8 — clips stay
  sample-stubbed). It MUST introduce **no new dependency**. **Schema change**: **none** under Q2 = auto;
  **one additive membership flag/table** under Q2 = curated (no change to existing tables either way). It
  MUST keep ProofCard, the shared proof/clip view shapes, and all existing reads unchanged unless the slice
  explicitly extends them.

### Key Entities *(include if feature involves data)*

- **Proof** (existing — T0.3): a consented testimonial shown on the wall; its current effective consent gates
  visibility (P-VII).
- **Derived asset / clip** (existing — T2.4a): a generated clip shown on the wall (sample/preview pre-T8);
  gated by its source proof's effective consent.
- **Consent** (existing — T0.3): the **effective** state governs wall visibility via the shared helper.
- **Showcase membership / featured flag** (**NEW — only if Q2 = curated**): which proof/clips the merchant
  has curated into the public set. A schema change (a `showcase_item` table or a `featured` boolean), written
  before the screen reads it (P-VI). **Not modelled under Q2 = auto.**
- **NOT modelled here**: any view/engagement/social metric, publish/embed/public-URL state, layout/embed
  artifact, the public page — all T9; not fabricated (FR-019, A-11).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the nav, a merchant reaches the Showcase and previews their wall of consented proof+clips
  as a public-style display in under 3 seconds on the seeded data.
- **SC-002**: **100%** of items whose effective consent is not `granted` are **absent** from the wall and its
  count; **0** withheld items leak — matching the dashboard/Library exactly (P-VII).
- **SC-003**: **0** fabricated or un-owned values appear — no views/reach/likes/social-proof, no LIVE/
  published badge or "live since", no finished-render claim — verifiable by inspection (FR-019).
- **SC-004**: **0** distribution controls render — no embed snippet/"Copy embed", publish/"go live", public
  URL, or share — and no curation control unless Q2 = curated (A-11), verifiable by inspection.
- **SC-005**: The Showcase shows an honest empty state when there's nothing to show (none eligible / none
  curated / all withheld), with **0** fabricated rows or counts.
- **SC-006**: On a transient cold start the Showcase recovers without an error shown; an error appears only on
  persistent failure and a retry succeeds.
- **SC-007**: The wall renders without horizontal scroll, overlap, or unreachable controls at each breakpoint
  (≤480, 1024, 1280, 1240px max) and is fully keyboard-operable.
- **SC-008**: The item count equals the number of consent-visible (and, if curated, curated) items;
  verifiable against the seed and tracking fixture changes.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: The wall leads with real customers' faces/words; chrome quiet. The
  Showcase is the strongest expression of "the customer is the headline" — it *is* the wall of customers.
- **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, R2 for clip
  samples. **No new dependency.** Clips stay sample-stubbed (T8). Heavy render/distribution off Vercel until
  their tiers.
- **Pressroom tokens (P-IV)**: On-token only; persimmon reserved for the primary action + the verified mark.
- **Port, don't redesign (P-V)**: **Screen 10 exists and is ported** — but its T9 distribution machinery
  (embed snippet/"Copy embed"/LIVE/publish/presets) is **not** rendered (A-11); the owned curate/preview half
  is. The separate Public-site "Public showcase" export is the T9 public wall, not this slice. The
  curated-vs-auto and pre-distribution-scope questions are raised as Q1–Q3 (P-XII), not guessed.
- **Fixtures-first (P-VI)**: Reads existing fixtures via the query layer (Q2 = auto → no schema change). If
  Q2 = curated, the membership schema is written **before** the screen reads it.
- **Consent (P-VII)**: Wall visibility uses the **shared** effective-consent gate — a withdrawn item is
  absent everywhere uniformly; the public-most surface inherits the same withdrawal; records retained.
- **No editor (P-VIII)**: N/A — read-only preview (Q2 = auto), or curate-by-selection (Q2 = curated), never a
  video editor.
- **Scope (P-IX, P-XI)**: One vertical slice — the wall read + the preview surface + states (+ curation iff
  Q2 = curated). Publishing/embedding/sharing/public page (T9) and the real engine (T8) are out of scope. No
  speculative additions.
- **Microcopy (P-XI)**: Matches screen 10; honest that publishing/embedding isn't available yet; no
  "amazing"/"awesome"/emoji.
- **Handling ambiguity (P-XII)**: The pre-distribution scope, curated-vs-auto, contents, and (resolved)
  design questions are surfaced against the named screen 10 rather than guessed.

## Assumptions

- **A-01 (screen 10 exists → port the owned half)**: Unlike the clip detail, `/app/showcase` HAS a design
  screen (10 "Showcase manager"). It is ported — but its T9 distribution machinery (embed/"Copy embed"/LIVE/
  publish/presets) is not rendered (A-11). The Public-site "Public showcase" export is the T9 public wall,
  out of scope.
- **A-02 (pre-distribution = curate + preview — Q1 default)**: The honest-now Showcase is an internal
  assemble-and-preview surface; publish/embed/share/public-URL → T9.
- **A-03 (auto, no schema change — Q2 default)**: The wall auto-shows all eligible consented items; no
  featured flag, no curation control, no "Add from library", no LIVE membership (A-11 — no backing). Curation
  is the curated-path alternative (a schema change), deferrable to when distribution (T9) gives a public set
  a purpose.
- **A-04 (both proof + clips, all-consented — Q3 default)**: The wall shows both consented proof and clips;
  not verified-only (verified is a shown mark, not a gate). Clips are sample/preview pre-T8.
- **A-05 (withdrawal mirrors the app)**: Visibility uses the shared `effectiveConsentGranted`, so the
  Showcase can never show an item the dashboard/Library withhold.
- **A-06 (reuse the spine building blocks)**: `withDbRetry`, the shared `<ErrorState>`, the loading skeleton,
  the workspace seam, server-first; the empty state is an honest derived state.
- **A-07 (no public page / no embed)**: `/showcase[/slug]` (public), the embed CDN/snippet, and "go live" are
  T9; nothing here implies they exist.
- **A-08 (ordering & volume)**: A sensible wall order (e.g. newest or verified-first — to confirm at plan);
  full set at demo scale; any cap/pagination surfaced, not silent.

## Clarifications

> The pre-distribution scope, curated-vs-auto, and contents questions were surfaced (P-XII + A-11 + the
> data-honesty law) and are **RESOLVED** (human decision, 2026-06-18): **Q1→A** curate + preview now, **Q2→A**
> AUTO / no schema change (curation + publish/embed defer to T9 as one coupled cluster), **Q3→A** both proof
> + clips, all-consented, verified-marked. The **design** question was resolved by inspection: **screen 10
> exists** (port the owned half; the embed/publish machinery is T9). Folded into the requirements above.

### Question 1 — RESOLVED (A): curate + preview now; distribution → T9

**Context**: Publishing / embedding / sharing / public URLs are T9, with no machinery today. Screen 10 is a
*"manager"* + an embed panel.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **Curate + preview now; publish/embed → T9** | Build the internal assemble-and-preview wall; the embed snippet/"Copy embed"/publish/"go live"/public-URL controls are not rendered (A-11). An honest, useful surface today; the T9 distribution swaps in behind it later. |
| B | Showcase is inherently a T9 surface — build nothing now | Re-defer entirely (re-deferring the piece you just un-deferred). Leaves `/app/showcase` a placeholder until T9. |
| Custom | — | e.g. preview-only with a non-functional "preview as public" toggle. |

**Resolution**: **A** — curate + preview now; distribution deferred to T9.

### Question 2 — RESOLVED (A): AUTO — show all eligible; no schema change (curation+publish defer to T9 together)

**Context**: Screen 10 shows a curated "public set" (LIVE membership) + "Add from library". Curation needs a
**featured/membership flag = a schema change** + a curation control + the proof picker (screen 18).

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **Auto — show all eligible consented proof+clips; NO schema change; read-only** | Leanest, honest, consistent with the read-only T3.1/T3.2 slices. "Add from library" + LIVE membership are **not** rendered (A-11 — no backing). Curation added later (when T9 gives a public set a purpose). Less faithful to screen 10's curation, but the *display* is faithful. |
| B | Curated — a featured/membership flag (schema change) + "Add from library" + add/remove | Faithful to screen 10 (it IS a curation manager). Bigger: the first schema change since T2.4a, a curation mutation, and the proof-picker (screen 18). Schema written before the screen (P-VI). |
| Custom | — | e.g. auto now, curated as a follow-up slice. |

**Resolution**: **A** — auto / no schema change (read-only). Curation is **coupled to publishing** (you
curate *what goes live*), so the whole curate + publish/embed cluster defers to **T9** as one feature; this
slice is the honest read-only preview of the eligible wall.

### Question 3 — RESOLVED (A): both proof + clips, all-consented, verified-marked

**Context**: Screen 10 shows proof (quotes/photos) **and** clips (videos/voice), consented.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **Both proof + clips; all-consented** | The fullest honest wall; verified is a shown mark, not a gate. Withdrawal-filtered (P-VII). |
| B | Clips only | A wall of generated clips (closer to the Library); omits text/photo/audio proof. |
| C | Verified-only (proof+clips) | Only "verified real customer" items — a stricter, higher-trust wall; fewer items on the seed. |
| Custom | — | e.g. both, verified-first ordering. |

**Resolution**: **A** — both proof + clips, all-consented (withdrawal-filtered); verified shown as a mark,
not a gate.
