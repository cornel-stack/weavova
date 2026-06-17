# Feature Specification: Library (the home for generated clips)

**Feature Branch**: `T3.1-library`

**Created**: 2026-06-17

**Status**: Draft — **clarifications RESOLVED** (human decision, 2026-06-17): **Q1→A** clips-only Library;
**Q2→C** card is display + a link to the source proof (no clip-detail nav, no inline sample play); **Q3**
source-proof link only (re-make hidden). Folded into FR-004/011/012 below. Ready for `/speckit.plan`.

**Tier**: T3 — Derived-asset surfaces & states (T3.1 — Library; the first T3 slice, building on the
`derived_asset` rows the clip studio T2.4b now writes).

**Input**: User description: "T3.1 — Library (the home for generated clips). Author the spec for the
Library surface at /app/library — currently a T1 placeholder — where a merchant browses every clip their
workspace has generated. Port, don't redesign; A-11 governs which controls render; FR-019 honesty governs
every value; P-VII governs visibility."

**Ported from**: `/design-reference/Weavova/The Workspace/09 _ Library  _app_library.(html|png)` (screen 09).

---

## Overview

The Library is **the home for the clips a workspace has generated** — the destination that answers "show me
everything I've made." It replaces the current T1 placeholder at `/app/library` with a real surface that
reads the **`derived_asset`** rows the clip studio (T2.4b) writes, and presents them as a browsable
collection inside the existing AppChrome.

The Library is the **read counterpart** to the studio's write: the studio makes one clip from one proof;
the Library shows them all. It is governed by the same three laws as the rest of the app — **P-VII**: a clip
whose source proof's effective consent is no longer `granted` is **withheld** from the Library exactly as it
is from the dashboard and proof detail (read-time withdrawal; the audit row is retained — "pull, don't
destroy"). **FR-019**: every value shown is one Weavova **owns** — format, the brand-authored hook, the
source customer/proof, the created date, and the honest **sample/preview** label — and **no** fabricated
metric (views, reach, engagement, performance, render "status") appears. **A-11**: only controls whose data
and destinations exist are rendered; the screen-09 controls that depend on later tiers are **not** rendered
as dead or fabricated affordances.

In this slice the clips are still **sample-stubbed renders** (the real engine is T8): each clip points at the
shared pre-made sample, so the Library presents each as an honest stand-in, never as a finished personalized
render of the customer. The Library is **read-only browsing** — it does not select, export, publish, or
distribute.

**Design divergence (raised honestly, P-V + A-11).** Screen 09 depicts a **unified** library of **proof AND
clips** with a Kind filter (Everything / Proof / Clips), Source and Consent filters, a List/Grid toggle, a
"Download clips (N)" bulk action, and a Status column (Ready / Queued). This slice is scoped to **clips
only** and to the controls whose data/destinations exist today; the broader unified library, filters, bulk
export, and render-status are later tiers and are **not** rendered here. See **Clarifications Q1–Q3** and
**Assumptions** for exactly what that means.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse every generated clip (Priority: P1)

A workspace owner opens the Library from the nav and sees every clip their workspace has generated — each
showing the source customer, the brand hook, the format, the created date, and an honest sample/preview
mark — newest first. This is the reason the Library exists: a single home for made clips.

**Why this priority**: It is the slice's core value and its MVP — a real, honest, consent-filtered home for
the `derived_asset` rows the studio writes. Without it the studio's output has no gallery.

**Independent Test**: With seeded clips under granted proofs, open `/app/library`; confirm the collection
lists those clips (newest first) with owned fields only and the sample/preview label, inside the AppChrome.

**Acceptance Scenarios**:

1. **Given** a workspace with generated clips under granted proofs, **When** the owner opens `/app/library`,
   **Then** the Library shows those clips as a collection (newest first), each with the source customer, the
   brand hook (when set), the format, the created date, and an explicit **sample/preview** label.
2. **Given** the collection renders, **When** it shows each clip, **Then** it shows **only owned** values —
   **no** views/reach/engagement/performance and **no** fabricated render "status" (FR-019).
3. **Given** the collection, **When** it renders, **Then** it shows an **honest count** of the clips shown
   (e.g. "N clips") that matches the number of consent-visible clips.

---

### User Story 2 - Revoked-consent clips are withheld (Priority: P1)

A clip whose source proof's consent has been revoked does **not** appear in the Library — the same read-time
withdrawal that already governs the dashboard and proof detail — while its row is retained for audit.

**Why this priority**: Consent Is Sacred (P-VII). The Library is a new place a withdrawn clip could leak; it
must apply the identical withdrawal so consent governs visibility everywhere, uniformly.

**Independent Test**: With a seeded born-then-withdrawn clip (its source proof revoked), open the Library;
confirm that clip is **absent**, the active clips are **present**, and the count excludes the withheld one.

**Acceptance Scenarios**:

1. **Given** a clip whose source proof's effective consent is `revoked` (or `awaiting`), **When** the Library
   reads its clips, **Then** that clip is **withheld** from the collection and the count.
2. **Given** the same data, **When** the source proof's consent is later granted again, **Then** the clip
   reappears (visibility follows the proof's **current effective** consent, read each time).
3. **Given** withdrawal, **When** a clip is withheld, **Then** its underlying record is **not deleted** (audit
   retained); withdrawal is visibility-only.

---

### User Story 3 - Honest empty, loading, and error states (Priority: P2)

The Library handles its full state set: a clear empty state when the workspace has no (visible) clips yet, a
loading state while the read is in flight, transparent recovery from a transient cold start, and the shared
error surface on a genuine failure.

**Why this priority**: A surface is only trustworthy if its non-populated states are honest and on-brand.
Secondary to showing the clips, but required for the Definition of Done.

**Independent Test**: With zero clips, confirm the empty state (no fabricated rows/counts); simulate a
slow/transient read and a persistent failure; confirm loading, transparent recovery, and the shared error
state with retry.

**Acceptance Scenarios**:

1. **Given** a workspace with no visible clips (none generated, or all withheld), **When** the Library
   renders, **Then** it shows an **honest empty state** (no fabricated rows, no "0 of N", no placeholder
   clips) that orients the merchant toward making one.
2. **Given** the Library is loading, **When** the read is in flight, **Then** an on-token **loading state**
   shows; a transient cold start is **retried transparently** and the Library renders on recovery.
3. **Given** a failure that persists past the retry policy, **When** the read fails, **Then** the **shared
   error state** is shown with a retry affordance and **no raw error text**.

---

### Edge Cases

- **All clips withheld**: if every generated clip is currently consent-withheld, the Library shows the
  **empty state**, not an empty table with a non-zero count (the count reflects what is shown).
- **A clip with no hook**: the hook is optional; a clip generated without one renders without a hook (no
  fabricated placeholder hook, no customer words used as the hook — render spec §7.4).
- **Source proof later deleted** (hard delete, not revocation): the clip is gone (FK hard-delete integrity);
  the Library simply doesn't show it — no orphan, no broken reference.
- **Mixed proof types**: clips made from text / video / photo / audio proof all appear; nothing implies a
  spoken/played render of a text or photo proof (the clips are sample stubs — render spec §1).
- **Large collection**: the Library remains usable and on-layout as the clip count grows (ordering stable,
  newest first); any volume cap or pagination is an explicit later concern (see Assumptions), surfaced — not
  a silent truncation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Library MUST render at **`/app/library`**, **replacing the T1 placeholder**, inside the
  existing AppChrome — without modifying the chrome, rail, top bar, workspace switcher, or command palette.
- **FR-002**: The Library MUST read **all of the workspace's generated clips** via a **workspace-scoped**
  read of `derived_asset` (a new read, e.g. `getLibraryClips(workspaceId)`), ordered **newest first**. No
  clip content is hardcoded. The read MUST reuse the established reliability pattern (transient cold-start
  retried transparently behind a loading state; a genuine failure surfaces the shared error state).
- **FR-003 (P-VII — read-time withdrawal)**: The read MUST **withhold** any clip whose **source proof's
  effective (latest-version) consent** is not `granted`, using the **same shared effective-consent logic**
  that governs the dashboard and proof-detail clip reads (one source of truth) — so a clip is visible in the
  Library **iff** it is visible on those surfaces. Withheld clips are **excluded from the collection and the
  count**; their records are **retained** (audit; "pull, don't destroy").
- **FR-004 (faithful port — A-11)**: The Library MUST port screen 09's clip collection faithfully for the
  controls whose data/destinations exist. It MUST **NOT** render: a **Kind filter** or **proof rows** (this
  slice is clips-only — Q1); a **Source** or **Consent** filter (deferred — and a "Consent: Revoked" filter
  would contradict read-time withdrawal); a **List/Grid toggle** unless both views are built (Q-default:
  single view); a **"Download clips (N)"** bulk action (export is T4); a **render "Status"** (Ready/Queued)
  column (no owned render-pipeline status exists pre-T8 — FR-019).
- **FR-005 (owned fields only — FR-019)**: Each clip MUST display only values Weavova owns: the **source
  customer** (and/or a reference to the source proof), the **brand hook** (when set), the **format**, the
  **created date**, and an explicit **sample/preview** label. It MUST NOT display any view/reach/engagement/
  performance metric or any fabricated value.
- **FR-006 (honest sample/preview)**: Because clips are still **stubbed sample renders** (the real engine is
  T8), each clip MUST be presented as an honest **sample/preview** stand-in — never as a finished,
  personalized render of the customer's words/voice/footage. No fabricated transcript/caption/scene is shown
  as the customer's.
- **FR-007 (honest count)**: The Library MUST show an **honest count** of the clips it displays, equal to the
  number of consent-visible clips — never a total that includes withheld clips, never a fabricated number.
- **FR-008 (empty state)**: When there are no visible clips, the Library MUST show an **honest empty state**
  (no fabricated rows/counts/placeholder clips) that orients the merchant toward generating one (e.g. via the
  existing studio entry on a proof). The empty state MUST be reached when all clips are withheld, too.
- **FR-009 (loading state)**: The Library MUST present an explicit **on-token loading state** while its read
  is in flight, consistent with the spine's loading conventions.
- **FR-010 (error state)**: A genuine read failure (after the retry policy) MUST render the **shared error
  surface** with a retry affordance and **no raw error text**; a transient cold start MUST be retried
  transparently (no error surfaced).
- **FR-011 (card boundary — A-11; Q2→C resolved)**: A Library clip card MUST NOT render any control whose
  destination does not exist. The card is **display + a link to the source proof** (`/app/proof/[id]`, which
  exists); it MUST **NOT** link to a per-clip detail (that surface is **T3.2**, not yet built) and MUST
  **NOT** offer inline sample playback (there is no real rendered clip to play — the asset is a stand-in,
  FR-019).
- **FR-012 (per-clip actions — A-11; Q3 resolved)**: The Library MUST NOT render a per-clip action that
  lacks a home. A **source-proof link** is rendered (its destination exists); **re-make / re-generate is NOT
  rendered** here (its home is the consent-gated studio reached from the proof). Export/publish/share are out
  of scope (later tiers) and not rendered.
- **FR-013 (workspace isolation)**: The Library MUST show **only the current workspace's** clips; no clip
  from another workspace is ever read or shown (tenant isolation, consistent with the spine's scoped reads).
- **FR-014 (responsive + keyboard)**: The Library MUST be **responsive** across the Pressroom breakpoints
  (480 / 1024 / 1280 + 1240 max) — the collection reflows without horizontal scroll or overlap — and
  **keyboard-accessible** (the collection and any rendered link/affordance reachable and operable with
  visible focus).
- **FR-015 (microcopy / honesty)**: All microcopy MUST match screen 09's wording where it specifies it, be
  honest about the sample stub and any absent data, and avoid "amazing"/"awesome" and emoji (P-XI).
- **FR-016 (scope)**: The slice MUST NOT build: bulk select/export (T4); publishing, distribution, or the
  Showcase (later tiers); the real render engine (T8 — clips stay sample-stubbed); a per-clip detail surface
  (T3.2). It MUST make **no schema change** (reads the existing `derived_asset`) and introduce **no new
  dependency**. It MUST keep the canonical ProofCard and the shared proof/clip read shapes unchanged unless
  the slice is explicitly extending them.

### Key Entities *(include if feature involves data)*

- **Derived asset / clip** (existing — T2.4a): the generated clip the Library lists — its `format`, brand
  `hook`, source `proof`, governing `consent`, the stubbed sample reference, and `createdAt`. The Library is
  a new **reader** of these rows; it does not create or modify them.
- **Proof** (existing — T0.3): the source testimonial a clip was made from; supplies the **customer** (and
  the source-proof link target). Read workspace-scoped.
- **Consent** (existing — T0.3): versioned, revocable; its **effective** state governs whether a clip is
  shown (P-VII withdrawal). The Library reads it through the shared effective-consent logic; it never
  changes consent.
- **NOT modelled here**: any view/engagement/performance metric, render-pipeline status, export/publish
  state, or a per-clip detail entity — all later tiers; not fabricated (FR-019, A-11).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the nav, a merchant reaches the Library and sees every consent-visible generated clip
  (newest first) in one place, each with the source customer + format + created date + sample label, in under
  3 seconds on the seeded data.
- **SC-002**: **100%** of clips whose source proof's effective consent is not `granted` are **absent** from
  the Library and its count; **0** withheld clips leak — matching the dashboard/detail exactly.
- **SC-003**: **0** fabricated or un-owned values appear — no views/reach/engagement/performance, no
  Ready/Queued render status, no placeholder clips — verifiable by inspection (FR-019).
- **SC-004**: **0** rendered controls lead nowhere or act on absent data — no Kind/Source/Consent filter, no
  bulk download, no per-clip-detail link, no inline play (per the resolved Q1–Q3), verifiable by inspection
  (A-11).
- **SC-005**: The Library shows an honest empty state when there are no visible clips (including when all are
  withheld), with **0** fabricated rows or counts.
- **SC-006**: On a transient cold-start the Library recovers without the user seeing an error; an error state
  appears only on persistent failure and a retry from it succeeds.
- **SC-007**: The Library renders without horizontal scroll, overlap, or unreachable controls at each
  breakpoint (≤480, 1024, 1280, 1240px max) and is fully keyboard-operable.
- **SC-008**: The clip count shown equals the number of consent-visible clips in the workspace, verifiable
  against the seed (and it tracks fixture changes: generate/revoke → reseed → the count changes accordingly).

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: Each clip card leads with the **customer** (the source testimonial's
  person/words) and the brand hook is clearly the brand's framing, separate from the customer's quote (render
  spec §7.4); the Library chrome stays quiet.
- **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, R2 for the
  sample reference. **No new dependency.** Heavy render stays off Vercel (clips remain sample-stubbed → T8).
- **Pressroom tokens (P-IV)**: Token utilities only; persimmon reserved for the primary action and the
  "verified real customer" mark — the Library is largely quiet chrome around loud proof.
- **Port, don't redesign (P-V)**: Ported from **screen 09**. The **A-11 port-completeness rule** governs:
  the clip collection renders; the un-owned/later-tier controls (Kind/Source/Consent filters, List/Grid
  toggle unless both built, bulk download, render status) are **not** rendered. The screen-09 → clips-only
  divergence and the card-boundary are raised as **Q1–Q3**, not guessed (P-XII).
- **Fixtures-first (P-VI)**: Reads the existing fixtures/seed via the query layer; the `derived_asset` shape
  is the contract; the read is the Library counterpart to the studio's write.
- **Consent (P-VII)**: The defining law of this slice's **visibility** — read-time withdrawal via the shared
  effective-consent logic; a withheld clip is excluded from the collection + count; the row is retained.
- **No editor (P-VIII)**: N/A — the Library is read-only browsing; it never edits a clip or a video.
- **Scope (P-IX, P-XI)**: A single vertical slice — the Library read + surface + states. Export, publishing,
  showcase, the real engine, and the per-clip detail are out of scope. No speculative additions.
- **Microcopy (P-XI)**: Matches screen 09, honest about the stub and absent data, avoids "amazing"/"awesome"
  and emoji.
- **Handling ambiguity (P-XII)**: The screen-09 scope/port and card-boundary ambiguities are surfaced as
  **Q1–Q3** against the named reference screen rather than guessed.

## Assumptions

- **A-01 (clips-only Library — Q1 default A)**: T3.1 is the home for **generated clips** (reads
  `derived_asset`), not the unified proof+clips library screen 09 depicts. The Kind filter and proof rows are
  not rendered. (Confirm in Q1.)
- **A-02 (read-only browsing)**: The Library reads and displays; it does not select, export, publish,
  distribute, or edit. Those are later tiers.
- **A-03 (sample-stubbed clips)**: Every clip still points at the shared pre-made sample (the real render is
  T8); the Library presents each honestly as a sample/preview, and offers **no inline playback** of a real
  render that doesn't exist (Q2 default).
- **A-04 (withdrawal mirrors the spine)**: Visibility uses the **same** shared effective-consent logic as the
  dashboard/detail clip reads — so the Library can never show a clip those surfaces withhold, and vice versa.
- **A-05 (no render status)**: Screen 09's "Ready / Queued" status reflects a render pipeline that does not
  exist pre-T8; it is **not** rendered (FR-019). The honest per-clip signal is the **sample/preview** label.
- **A-06 (filters & List/Grid deferred)**: Source/Consent/Kind filters and the List/Grid toggle are **not**
  rendered in T3.1 — a clean collection + an honest count. (A Consent filter is additionally incoherent with
  read-time withdrawal, which already removes non-granted clips.) These are candidate later enhancements,
  surfaced here, not silently dropped.
- **A-07 (no per-page search)**: The global ⌘K palette already serves jump/search; a Library-specific search
  box is not built in T3.1.
- **A-08 (ordering & volume)**: Clips are ordered **newest first** (by created date). At demo scale the full
  collection renders; any pagination / volume cap is an explicit later concern (and would be surfaced, not a
  silent truncation).
- **A-09 (reuse the spine's building blocks)**: The Library reuses the established workspace-scoping,
  cold-start-retry, loading-skeleton, shared-error, and server-first conventions; its empty state is an
  honest derived state (a designed empty exists on screen 09 / 17-family if applicable, otherwise derived —
  P-XII).
- **A-10 (no schema/seed change required)**: The Library reads the existing `derived_asset` the studio
  writes; the existing seed already carries active + withheld clips, sufficient to exercise every state.

## Clarifications

> Three ambiguities were surfaced (P-XII + A-11 + the data-honesty law) rather than guessed. **All three are
> now RESOLVED** (human decision, 2026-06-17) and folded into FR-004 / FR-011 / FR-012 / the Assumptions:
> **Q1→A** clips-only, **Q2→C** display + source-proof link, **Q3** source-proof link only.

### Question 1 — RESOLVED (A): clips-only Library (not the unified proof+clips screen 09)

**Context**: Screen 09 depicts a **unified** library — proof AND clips with a Kind filter
(Everything / Proof / Clips). The T3.1 brief scopes this to **clips** (reads `derived_asset`).

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **Clips-only Library** | T3.1 shows only generated clips; no Kind filter, no proof rows. Matches the brief + the `derived_asset` read; smallest honest slice. The unified library is a later concern. |
| B | Unified proof + clips | Ports screen 09 more literally (Kind filter, proof rows). Larger scope; overlaps the inbox (T2.2) for proof; needs a combined read. Beyond the stated T3.1 scope. |
| Custom | — | Provide your own (e.g. clips-only now, unified later as T3.x). |

**Resolution**: **A** — clips-only, per the brief and the derived-asset read.

### Question 2 — RESOLVED (C): card is display + source-proof link (A-11: never render a control whose destination doesn't exist)

**Context**: A clip card could navigate to a per-clip detail, play the sample inline, or stay display-only.
A per-clip **detail is its own slice (T3.2)** and does **not** exist yet; clips are **sample stubs** (no real
rendered video to play).

| Option | Answer | Implications |
|--------|--------|--------------|
| **C ★** | **Display + source-proof link** | The card shows the clip (sample/format/hook/customer/date) and links to the **source proof** (`/app/proof/[id]`, which exists). No clip-detail nav, no inline play. Fully A-11-clean today; the clip-detail link is added in T3.2. |
| A | Navigate to a per-clip detail | Cleanest long-term, but the destination (T3.2) doesn't exist → would be a dead link now (A-11 violation) unless T3.2 is pulled into this slice (scope growth). |
| B | Play the sample inline | The "clip" is a shared sample stub, not a real per-proof render; inline play risks implying a finished render exists (FR-019). Revisit at T8 when real renders exist. |
| Custom | — | e.g. display-only (no link at all) until T3.2. |

**Resolution**: **C** — display + a link to the source proof (the one destination that exists), no inline
play, no clip-detail link until T3.2.

### Question 3 — RESOLVED: per-clip actions — source-proof link only (re-make hidden)

**Context**: Candidate per-clip actions: a **source-proof link**, a **re-make/re-generate**, and (later)
export/publish/share. A-11: render only those with a home today.

| Option | Answer | Implications |
|--------|--------|--------------|
| **★** | **Source-proof link only** | The source-proof link has a home (the proof exists, and re-making lives in the consent-gated studio reached from it). Re-make is **not** rendered on the card (redundant; its home is the proof/studio). Export/publish/share are out of scope. Cleanest A-11. |
| B | Add a re-make action | Adds a "make another clip" affordance on the card → would need to route to the studio for that proof; arguably duplicates the proof's "Make a clip" and needs its own consent-gating consideration. Defer unless wanted. |
| Custom | — | e.g. no actions at all (pure display) in T3.1. |

**Resolution**: the source-proof link only; re-make hidden until it has a clearly-scoped home.
