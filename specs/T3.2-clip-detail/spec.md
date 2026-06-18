# Feature Specification: Clip detail (a generated clip's focused view)

**Feature Branch**: `T3.2-clip-detail`

**Created**: 2026-06-17

**Status**: **ACTIVE — building now** (human decision, 2026-06-18; un-deferred). Built **early**, ahead of
the rest of T4, as the second (and now final-by-build-order) T3 surface. Clarifications Q1–Q3 are RESOLVED
(below); ready for `/speckit.plan`.

**Built early (not at T8) — the deferral reasoning and how it's handled now**:
- **No clip-detail screen exists in `/design-reference`** (the export has the studio 04, Library 09,
  clipping skeletons 16, Export B4 — none for a per-clip detail), so **P-V cannot apply literally**: this is
  a **derived surface**, built faithfully from the proof-detail (03) two-column layout + no-oracle tenant
  isolation, the studio (04) clip/sample framing, and the render spec — **not** a reinvented design.
- **Pre-T8 the clip is a non-playing stub** and the **fixtures carry no source media** — handled honestly
  (Q1): the clip is shown as a **non-playing labelled "Sample preview" still** in the chosen format, an
  explicit stand-in for the real render (FR-019). The same UI seam swaps in real playback at T8 (so the
  early build is not throwaway — the T8 media swap stays mechanical, as the studio's stub did).
- **Q3 completes the A-11 wiring**: the T3.1 Library card (today pointing at the source proof) is re-pointed
  to this clip detail, and the source-proof link **relocates INTO the detail** as provenance.

**Settled read shape + resolutions** (start from these; see Requirements + Clarifications): `getClip` → **one
content-free `notFound()`** funnelling **withdrawn / missing / cross-workspace** indistinguishably (P-VII +
T2.3 tenant isolation), gated on the shared `effectiveConsentGranted`; the **additive `ClipDetailView`**
(clip metadata + source-proof provenance + the **made-under** consent vs the **current** gating consent),
`ClipView`/`LibraryClipView`/existing reads byte-stable. **Q1** non-playing labelled still; **Q2** route
**`/app/clip/[id]`**; **Q3** card → clip detail with the source-proof link relocated inside.

**Tier**: T3 — Derived-asset surfaces & states (T3.2 — Clip detail; the second T3 slice, the destination
the T3.1 Library cards graduate to).

**Input**: User description: "T3.2 — Clip detail (a generated clip's focused view). The per-clip detail —
the destination that graduates the T3.1 Library cards from a source-proof link to actually opening the clip.
Port, don't redesign; A-11 governs which controls render; FR-019 honesty governs every value; P-VII governs
visibility."

**No design-reference screen exists for the clip detail** (the export has the studio 04, the Library 09,
the clipping skeletons 16, and Export B4 — but no clip-detail). Per P-V + P-XII this is a **derived surface**:
built faithfully from the closest established patterns — the **proof-detail (screen 03)** two-column layout +
tenant-isolation, the **studio (screen 04)** clip/sample framing, and the render spec — **not** an invented
new design language. This is raised honestly (see Constitution Alignment) rather than papered over.

---

## Overview

The Clip detail is a **generated clip's focused view** — the destination a T3.1 Library card opens. Where
the Library shows the whole collection, the detail gives one clip room: the clip itself (an honest
sample/preview pre-T8), its **owned metadata** (format, the brand hook, the created date), and its
**provenance** — the **source customer/proof** it was made from and the **consent version it was made
under**. It is the read sibling of the proof detail (T2.3): the proof detail focuses one testimonial; the
clip detail focuses one derived asset.

It is governed by the same three laws. **P-VII**: the clip is visible **iff** its source proof's effective
consent is currently `granted` — a **withdrawn** clip (consent revoked) is not viewable, and the read
funnels a withdrawn / missing / cross-workspace id to **one content-free `notFound()`** (no existence
oracle — the exact T2.3 tenant-isolation pattern, now also covering withdrawal). **FR-019**: every value is
one Weavova **owns** — format, brand hook, source customer, consent provenance, created date — and the clip
is shown as an explicit **sample/preview** stand-in, never as a finished personalised render (the engine is
T8). **A-11**: only controls whose destination/data exist render — a link to the **source proof**
(provenance, exists) and **re-make** (which routes to the consent-gated studio via that proof); **download /
export / publish / share are not rendered** (T4 / T9).

Completing this slice **graduates the Library card**: the card's destination — until now the source proof,
because the clip detail didn't exist — becomes the clip detail (the A-11 "wire-when-the-home-exists"
completion), appearance-preserving (the card looks identical; only where it leads changes — see Q3).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open a clip and see it framed with its provenance (Priority: P1)

A workspace owner clicks a clip in the Library and lands on its detail: the clip framed as an honest
sample/preview, with its format, brand hook, source customer, the consent it was made under, and the created
date — everything owned, nothing fabricated.

**Why this priority**: It is the reason the slice exists and the Library card's destination. MVP — a real,
honest focused view of one generated clip.

**Independent Test**: From the Library, open a clip under a granted proof; confirm the detail renders the
clip (sample/preview), its owned metadata, and its provenance (source customer/proof + consent version/date),
inside the AppChrome, with a close/back affordance to the Library.

**Acceptance Scenarios**:

1. **Given** a clip whose source proof's consent is granted, **When** the owner opens it from the Library,
   **Then** the clip detail renders inside the AppChrome with a back affordance to the Library.
2. **Given** the detail renders, **When** it shows the clip, **Then** the clip is presented as an explicit
   **sample / preview** standing in for the real render (FR-019) — never a finished personalised render of
   the customer, no fabricated transcript/caption/scene shown as theirs.
3. **Given** the detail renders, **When** it shows metadata, **Then** it shows only **owned** values —
   format, the brand hook (when set, clearly the brand's words — render spec §7.4), the source customer, the
   created date — and **no** view/reach/engagement/performance metric.
4. **Given** the detail renders, **When** it shows provenance, **Then** it shows the **source proof** (the
   customer it was made from) and the **consent it was made under** ("made under consent v{n}", with that
   consent's date) — owned provenance, distinct from the proof's current consent state.

---

### User Story 2 - Withdrawn, missing, and cross-workspace clips funnel to one no-oracle not-found (Priority: P1)

A clip whose source proof's consent has been revoked is **not viewable**; nor is a clip id that doesn't
exist or belongs to another workspace. All three resolve to the **same** content-free not-found — the viewer
can never tell which case it was.

**Why this priority**: Consent Is Sacred (P-VII) + tenant isolation. A withdrawn clip must not be reachable
by deep-link, and the not-found must not leak whether a clip exists in another workspace or was withheld.

**Independent Test**: Deep-link to (a) a revoked clip's id, (b) a non-existent id, (c) a clip id from
another workspace; confirm all three render the identical content-free not-found, with no clip data and no
hint distinguishing the cases.

**Acceptance Scenarios**:

1. **Given** a clip whose source proof's effective consent is `revoked`/`awaiting`, **When** its detail is
   requested (e.g. a stale Library link or a crafted URL), **Then** the **same** content-free not-found is
   shown — no clip content, no "withdrawn" label that would confirm the clip exists.
2. **Given** a non-existent clip id OR a clip id belonging to another workspace, **When** its detail is
   requested, **Then** the **same** content-free not-found is shown (no existence oracle, no cross-tenant
   leak).
3. **Given** the withdrawn case, **When** the not-found is shown, **Then** the clip's underlying record is
   **retained** (audit; withdrawal is read-time visibility, not a delete).

---

### User Story 3 - Honest provenance + re-make actions only (no export yet) (Priority: P2)

The detail offers only actions whose destination exists: a link to the **source proof** (provenance) and
**re-make** (which routes to the consent-gated studio via that proof). Download / export / publish / share
are **not** rendered.

**Why this priority**: Faithful A-11 + the product loop (the clip leads back to its proof and to making
more). Secondary to viewing the clip, but it is what makes the detail a node in the loop rather than a
dead end.

**Independent Test**: Inspect the detail's actions; confirm a working source-proof link and a re-make that
reaches the studio for the source proof (consent-gated as ever); confirm no download/export/publish/share
control is present.

**Acceptance Scenarios**:

1. **Given** the detail, **When** it shows actions, **Then** a **source-proof link** opens `/app/proof/[id]`
   (the existing proof detail — provenance).
2. **Given** the detail, **When** the owner activates **re-make**, **Then** they reach the **consent-gated
   studio** for the source proof (the same studio entry that lives on the proof — consent re-checked there,
   P-VII); the clip detail itself never generates.
3. **Given** the detail, **When** it renders, **Then** **no** download / export / publish / share control
   appears (those are T4 / T9) — not greyed-out, not fabricated (A-11).

---

### User Story 4 - Reliable; handles its states; the Library card now leads here (Priority: P2)

The detail surfaces loading and the shared error state, recovers transparently from a cold start, and the
T3.1 Library card now leads to it (its destination exists) without changing how the card looks.

**Why this priority**: The state set + the card wiring make the detail a trustworthy, reachable node.
Secondary to the view, gate, and actions.

**Independent Test**: Simulate a slow/transient then a persistent read; confirm loading, transparent
recovery, and the shared error state with retry; confirm the Library card opens the clip detail and looks
identical to before.

**Acceptance Scenarios**:

1. **Given** the detail is loading, **When** the read is in flight, **Then** an on-token loading state shows;
   a transient cold start is retried transparently and the detail renders on recovery.
2. **Given** a failure that persists past the retry policy, **When** the read fails, **Then** the shared
   error state is shown with a retry affordance and no raw error text.
3. **Given** the T3.1 Library, **When** the owner activates a clip card, **Then** it opens **this clip
   detail** (its destination now exists) and the card's appearance is **unchanged** from T3.1.

---

### Edge Cases

- **Consent revoked between Library render and clip open**: the open re-reads current effective consent; if
  no longer granted → the no-oracle not-found (US2), not a stale view.
- **Clip with no hook**: renders without a hook (no fabricated placeholder, no customer words used as the
  hook — render spec §7.4).
- **Clip whose source proof has no real media** (every fixture): the detail does not fabricate footage; the
  sample/preview is an honest stand-in (Q1), and the source-proof provenance is shown as data, not media.
- **The consent it was made under differs from the proof's current consent**: the provenance shows the
  *made-under* version (e.g. v1 granted); visibility is gated on the *current* effective consent. Both are
  shown honestly and are not conflated.
- **Direct deep-link by a logged-in owner to another workspace's clip**: the same not-found as a missing id
  (tenant isolation; no leak).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The clip detail MUST render inside the existing AppChrome (no change to the chrome/rail/top
  bar/switcher/palette), reached from a T3.1 Library card, with a back/close affordance to the Library.
- **FR-002 (the read — `getClip`)**: A new **workspace-scoped** read MUST return a single clip's detail
  projection by id, or **null**. It MUST return null for (a) a missing id, (b) an id in another workspace,
  and (c) a clip whose source proof's **effective consent is not `granted`** (withdrawn) — all three
  **indistinguishable**, funnelling to **one content-free `notFound()`** (no existence oracle; the T2.3
  pattern, extended to withdrawal). The read MUST reuse the **shared `effectiveConsentGranted`** gate (so
  visibility matches the Library/dashboard/detail) and be wrapped in the established cold-start retry.
- **FR-003 (the projection — `ClipDetailView`)**: A new projection MUST carry only **owned** data: the clip
  metadata (format, brand hook, created date, the stubbed sample reference, kind) + the **source-proof
  provenance** (proof id, source customer, proof type, verified mark, capture source label) + the **consent
  provenance** (the version the clip was made under and that consent's date). `ClipView`, `LibraryClipView`,
  and all existing reads MUST stay byte-stable (the projection is additive).
- **FR-004 (honest clip representation — Q1; FR-019)**: The clip MUST be shown as an explicit
  **sample / preview** standing in for the real render (the engine is T8) — never a finished personalised
  render of the customer, no fabricated transcript/caption/scene presented as theirs. The exact framing
  (labelled poster/still vs playing the sample stub vs leading with source-proof footage) is set by **Q1**;
  whichever is chosen MUST read unmistakably as a stand-in (FR-019).
- **FR-005 (owned metadata only — FR-019)**: The detail MUST display only owned values — format, the brand
  hook (when set), the source customer, the created date — and MUST NOT display any view/reach/engagement/
  performance metric or any fabricated value.
- **FR-006 (provenance)**: The detail MUST show the clip's provenance: the **source proof** (the customer it
  was made from) and the **consent it was made under** ("made under consent v{n}", with that consent's
  date). The made-under consent is provenance and is shown distinctly from the proof's current consent
  state; the brand hook is clearly the brand's words, separate from the customer's quote (render spec §7.4).
- **FR-007 (actions — A-11)**: The detail MUST render only actions whose destination exists: a **link to the
  source proof** (`/app/proof/[id]`) and **re-make**, which routes to the **consent-gated studio** for the
  source proof (the clip detail never generates; consent is re-checked at the studio — P-VII). It MUST NOT
  render **download / export / publish / share** (T4 / T9) — hidden, not dead, not fabricated.
- **FR-008 (the route — Q2)**: The clip detail MUST have a stable route. The choice between
  `/app/library/[clipId]` (nested under the Library) and `/app/clip/[id]` (top-level) is set by **Q2**; the
  Library card links to whichever is chosen, and a direct/crafted URL still enforces the consent +
  tenant-isolation gate (FR-002).
- **FR-009 (card wiring — Q3; A-11 completion)**: The T3.1 Library card MUST be wired to lead to the clip
  detail now that it exists, with a **single clear primary destination**. Whether the card leads to the
  **clip detail** (with the source-proof link relocating **into** the detail as provenance) or retains both
  is set by **Q3**. The card's **appearance MUST be unchanged** from T3.1 (only its destination changes).
- **FR-010 (loading state)**: The detail MUST present an on-token loading state while its read is in flight,
  consistent with the spine conventions; a transient cold start MUST be retried transparently.
- **FR-011 (error state)**: A genuine read failure (after the retry policy) MUST render the shared error
  surface with a retry affordance and **no raw error text** — structurally distinct from the not-found.
- **FR-012 (not-found)**: The not-found MUST be content-free and **identical** across the missing /
  cross-workspace / withdrawn cases (FR-002), inside the AppChrome, with a back-to-Library affordance — no
  clip data, no case-distinguishing hint.
- **FR-013 (responsive + keyboard)**: The detail MUST be responsive across the Pressroom breakpoints
  (480 / 1024 / 1280 + 1240 max) — reflows without horizontal scroll/overlap — and keyboard-accessible (the
  clip frame, the provenance links, and re-make reachable/operable with visible focus).
- **FR-014 (microcopy / honesty)**: All microcopy MUST be honest about the sample stub and the absent data,
  read consistently with the studio/Library sample framing, and avoid "amazing"/"awesome" and emoji (P-XI).
- **FR-015 (scope)**: The slice MUST NOT build: the Showcase (deferred — a separate scope call when wrapping
  T3; its real form is the distribution tier); the real render engine (T8); bulk/export (T4) or publishing
  (T9). It MUST make **no schema change** (reads the existing `derived_asset`) and introduce **no new
  dependency**. It MUST keep ProofCard, the shared proof/clip view shapes, and all existing reads unchanged
  (only the `ClipDetailView` projection + the `getClip` read are added; the Library card's destination is
  the one in-scope edit to existing UI).

### Key Entities *(include if feature involves data)*

- **Derived asset / clip** (existing — T2.4a): the clip the detail focuses — its format, brand hook, stubbed
  sample reference, created date, and the `consentId` of the version it was made under. Read-only here.
- **Proof** (existing — T0.3): the source testimonial — supplies the customer, proof type, verified mark,
  capture source, and the source-proof link/re-make target. Its **current effective consent** gates
  visibility (P-VII).
- **Consent** (existing — T0.3): two roles here — the **made-under** version (provenance, via the clip's
  `consentId`) shown on the detail, and the **current effective** state (gates visibility). Never modified.
- **NOT modelled here**: any view/engagement/performance metric, export/publish state, real rendered media,
  or Showcase entity — later tiers; not fabricated (FR-019, A-11).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the Library, an owner opens a clip and sees it framed with its owned metadata + provenance
  (source customer + consent version/date) in under 3 seconds on the seeded data.
- **SC-002**: The clip is shown as an explicit sample/preview in **100%** of cases; **0** details present a
  finished personalised render or fabricated customer words/voice/footage/captions (FR-019), across all four
  source proof types.
- **SC-003**: **100%** of withdrawn / missing / cross-workspace clip ids resolve to the **identical**
  content-free not-found; **0** leak which case occurred or that a withheld clip exists (P-VII + tenant
  isolation).
- **SC-004**: **0** fabricated or un-owned values appear — no views/reach/engagement/performance, no
  download/export/publish/share control — verifiable by inspection (FR-019, A-11).
- **SC-005**: The detail's actions reach only existing destinations — the source proof and the consent-gated
  studio (re-make); **0** actions lead nowhere.
- **SC-006**: On a transient cold start the detail recovers without an error shown; an error appears only on
  persistent failure and a retry succeeds; the not-found is structurally distinct from the error.
- **SC-007**: The detail renders without horizontal scroll, overlap, or unreachable controls at each
  breakpoint (≤480, 1024, 1280, 1240px max) and is fully keyboard-operable.
- **SC-008**: From the Library, activating a clip card opens **this** clip detail; the card's appearance is
  **identical** to T3.1 (verified by inspection — only the destination changed).

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: The detail keeps the **source customer** and their proof primary; the
  clip's brand hook is clearly the brand's framing, separate from the customer's words (render spec §7.4).
  Chrome stays quiet.
- **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, R2 for the
  sample reference. **No new dependency.** The clip stays sample-stubbed (real render is T8).
- **Pressroom tokens (P-IV)**: Token utilities only; persimmon reserved for the primary action (re-make) and
  the verified mark.
- **Port, don't redesign (P-V)**: **No clip-detail screen exists in `/design-reference`** — so this is a
  **derived surface**, built faithfully from the established patterns (proof-detail 03 layout +
  tenant-isolation, studio 04 clip/sample framing, the render spec), **not** a reinvented design. This
  divergence-by-necessity is surfaced here (P-XII), and the sample-framing/route/card-nav choices are raised
  as Q1–Q3 rather than guessed.
- **Fixtures-first (P-VI)**: Reads the existing `derived_asset`/`proof`/`consent` via the query layer; the
  `ClipDetailView` projection is additive; the existing seed (active + withdrawn clips) exercises every
  state including the withdrawal not-found.
- **Consent (P-VII)**: Visibility is gated on the source proof's **current effective** consent via the
  shared helper; a withdrawn clip funnels to the no-oracle not-found; the made-under consent is shown as
  provenance; re-make re-checks consent at the studio. The record is retained (audit).
- **No editor (P-VIII)**: N/A here — the detail is read-only; re-make routes to the studio (a format picker,
  not an editor).
- **Scope (P-IX, P-XI)**: A single vertical slice — the read + the projection + the surface + states + the
  card wiring. Showcase, the real engine, export, and publishing are out of scope. No speculative additions.
- **Microcopy (P-XI)**: Honest about the sample stub and absent data; consistent with the studio/Library
  framing; avoids "amazing"/"awesome" and emoji.
- **Handling ambiguity (P-XII)**: The absent design screen is surfaced; the sample representation, route, and
  card navigation are raised as Q1–Q3, not guessed.

## Assumptions

- **A-01 (no clip-detail design screen → derived surface)**: There is no `/design-reference` clip-detail
  export; the surface is derived faithfully from screens 03 (proof detail) + 04 (studio) + the render spec.
  (Reinforces Q1.)
- **A-02 (read-only)**: The detail reads and displays; it never generates, edits, deletes, exports, or
  publishes. Re-make routes to the studio; that is the only path to a new clip.
- **A-03 (sample-stubbed clip)**: The clip still points at the shared pre-made sample (real render is T8);
  the detail presents it honestly as a sample/preview (Q1). Source proofs also carry no real media in
  fixtures.
- **A-04 (visibility = the shared gate)**: Visibility uses the **same** `effectiveConsentGranted` as the
  Library/dashboard/detail, so the clip detail can never show a clip those surfaces withhold; a withdrawn
  clip is unreachable (not-found), not merely hidden from lists.
- **A-05 (two consent roles)**: The clip's `consentId` is the **made-under** provenance (shown); the proof's
  **current effective** consent is the **visibility gate** (enforced). They are shown/handled distinctly,
  never conflated.
- **A-06 (reuse T2.3 building blocks)**: The detail reuses the proof-detail conventions — the workspace
  seam, `withDbRetry`, the shared `<ErrorState>`, the content-free tenant-isolated not-found, and
  server-first composition.
- **A-07 (Library card wiring is appearance-preserving)**: Re-pointing the T3.1 card to the clip detail
  changes only its destination; the card's markup/appearance is unchanged (FR-009 / SC-008).
- **A-08 (no schema/seed change)**: Reads the existing `derived_asset` (+ `proof`/`consent`); the existing
  seed already carries active + withdrawn clips, sufficient to exercise the view and the withdrawal
  not-found.

## Clarifications

> Three ambiguities were surfaced (P-XII + A-11 + the data-honesty law) and are **RESOLVED** (human decision,
> 2026-06-18) so T8 inherits the answers, not the questions: **Q1→A** non-playing labelled still, **Q2→A**
> `/app/clip/[id]`, **Q3→A** card → clip detail with the proof link relocated inside. (The slice itself is
> DEFERRED to T8 — see Status; these resolutions are its starting point.)

### Question 1 — RESOLVED (A): non-playing labelled sample/preview still (FR-019)

**Context**: On a focused detail there is room to frame the clip — but the clip is a **stubbed sample**
(no real per-proof render pre-T8), and the **source proof carries no real media** in fixtures either.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **Labelled sample/preview still (poster), non-playing** | A clear "Sample preview" frame in the chosen format, explicitly a stand-in — honest (FR-019), nothing pretends to be a finished render or to play real footage. Consistent with the studio result + Library card. |
| B | Play the sample stub (a `<video>` of the shared sample) | Plays a *generic* sample that isn't this proof's render → risks implying a finished personalized clip exists; the sample is an `r2://` reference, not a served file. Defer real playback to T8. |
| C | Lead with the source-proof footage as the real grounding | The source proof has **no real media** in fixtures (neutral placeholders) — there is no footage to lead with; would fabricate media. |

**Resolution**: **A** — a labelled, non-playing sample/preview still; real playback arrives with the engine
(T8).

### Question 2 — RESOLVED (A): the route is `/app/clip/[id]` (top-level)

**Context**: The clip detail needs a stable URL. The proof detail is `/app/proof/[id]`; the Library is
`/app/library`.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **`/app/clip/[id]` (top-level)** | A durable canonical clip URL, reusable from anywhere a clip is referenced (Library now; dashboard latest-clip, proof-detail "Generated assets", future showcase/campaigns later). Consistent with `/app/proof/[id]`. |
| B | `/app/library/[clipId]` (nested) | Reads as "a clip within the Library", but couples the clip URL to the library path; awkward when linked from non-library surfaces (the dashboard/detail already reference clips). |
| Custom | — | e.g. `/app/library/clip/[id]`. |

**Resolution**: **A** — top-level `/app/clip/[id]`, the durable canonical URL.

### Question 3 — RESOLVED (A): card → clip detail; source-proof link relocates into the detail (A-11)

**Context**: The T3.1 card currently links to the **source proof** (because the clip detail didn't exist).
Now it does. A-11 wants one clear primary destination per control.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **Card → clip detail; the source-proof link moves INTO the detail (as provenance)** | The card's one job becomes "open the clip"; the proof link lives on the detail as provenance (FR-006/007). Single clear destination; the proof is one hop away. Appearance-preserving. |
| B | Card keeps both (clip detail + a separate source-proof link) | Two destinations on one card → the A-11 "one primary" concern the brief calls out; risks a busier card. |
| Custom | — | e.g. card → proof still, clip detail reached elsewhere (contradicts the slice's purpose). |

**Resolution**: **A** — the card leads to the clip detail; the source-proof link relocates into the detail
as provenance. (Applied at T8, when the clip detail is built.)
