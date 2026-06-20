# Feature Specification: Export (post-ready content out of a proof clip)

**Feature Branch**: `T4-B4-export`

**Created**: 2026-06-21

**Status**: Draft — **3 clarifications OPEN** (see "Clarifications to resolve" below). Do **not**
`/speckit-plan` until Q1–Q3 are answered by the human.

**Tier**: T4 — Bulk & exports (T4-B4 — Export; the **last T4 slice**, the demo loop's payoff:
capture → review → transform → **export to post**).

**Input**: User description: "T4-B4 — Export: take a proof clip OUT as post-ready content the user
can publish. … export only what we genuinely own and produce (post-text is real; the video is the
labeled sample / T8 seam, NEVER exported as the finished clip)."

**Ported from**: `/design-reference/Weavova/Bulk & exports/B4 _ Export _download a finished clip_`
(B4). **Critical port finding (P-V / P-XII):** the B4 reference export screen **renders the B1
Batch-studio modal** — both its HTML and PNG are the batch-studio "one recipe → many clips" layout,
not an export/download layout. **There is no dedicated export layout to port.** Export is therefore a
**derived surface** (precedent: T3.2 clip-detail, also a derived surface where no design-reference
screen existed), built from the owned data already on the clip-detail / Library surfaces. The
filename's promise — "download a finished clip" — is exactly what the honesty reality forbids
pre-T8 (there is no finished clip yet), so the screen title is treated as aspirational, not as the
spec.

---

## Overview

Export is the demo loop's **payoff**: a proof clip leaves the app as **post-ready content the user
takes to their platform**. The honest, owned deliverable is the **post-text package** — the
brand-authored **hook/caption**, the **customer headline** (the customer's verbatim proof — the
headline, P-II), and the **proof attribution** (which customer, the "verified real customer" mark,
the capture source) — all real, owned data the app genuinely produces.

**The honesty reality shapes the whole slice.** The clip's rendered **video** is T8 (real Remotion
render). Today every clip is the openly-labeled **sample** (the shared `SAMPLE_CLIP_URL`; surfaces
show a non-playing "Sample preview" still). So Export **MUST NOT** hand over a finished customer clip
video — there isn't one. Export packages the **real** post-text, and treats the video strictly as an
**openly-labeled sample reference** ("sample — your rendered clip replaces this when rendering ships
at T8"), never presented or exported as the finished clip. This is the same T8 seam the real render
swaps into later, untouched.

**Consent is re-respected at export (P-VII).** A clip is exportable **only if its source proof's
current effective consent is `granted`**. Export reads through the **same withdrawal-gated reads**
every other surface uses (the Library already filters withdrawn proof via the shared
`effectiveConsentGranted`; the clip detail is withdrawal-gated via the shared `getClipDetail` path).
Export re-checks at **read time** — a clip whose consent was withdrawn after it was listed is **not
exportable**, with no fabricated payload.

**The export control genuinely works (A-11).** The action really produces a file and/or really
copies the text — no dead "Export" button. The **only** deferred part is the real rendered video,
which stays the honest T8 seam.

**No schema change.** Export is **read + produce** — it reads existing owned fields and emits text /
a file. No new tables, columns, or enums. **Byte-stable:** `ProofCard`, the proof / `ClipView` /
`LibraryClipView` / `ClipDetailView` / showcase read shapes, `generateClip`, `generateBatch`, and
the nav rail are **unchanged**. The export action + UI are **additive**; if bulk export adds a
Library selection mode, it is an **additive overlay** (a sibling of the clip card, like B1's inbox
selection cluster sits *around* the byte-unchanged `ProofCard`), never a change to
`LibraryClipView` or the clip-card shape.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Export one clip's post-ready text (Priority: P1)

From a clip's detail surface, a workspace owner exports the clip's **post-text package** — the
hook/caption, the customer headline, and the proof attribution — as post-ready content they can paste
into (or carry to) their social platform. The export genuinely produces the text (really copies
and/or really downloads). The video is referenced only as an openly-labeled sample.

**Why this priority**: This is the slice's core value and MVP — the single honest deliverable that
closes the loop (capture → transform → **export**). It can ship and demo on its own.

**Independent Test**: Open a consented clip's detail, activate Export; confirm the post-text package
(hook + customer headline + attribution) is genuinely produced (copied to clipboard and/or downloaded
as a file), the text contains only owned data, and the video is labeled as a sample, never as a
finished clip.

**Acceptance Scenarios**:

1. **Given** a clip whose source proof's effective consent is `granted`, **When** the owner activates
   Export on its detail surface, **Then** the post-text package — hook/caption, customer headline
   (verbatim proof), and proof attribution (customer name, verified mark, capture source) — is
   genuinely produced (copied and/or downloaded), containing only owned data.
2. **Given** the export, **When** the owner reviews what was produced, **Then** the video is present
   only as an **openly-labeled sample reference** ("sample — replaced by your rendered clip at T8"),
   never labeled or named as the finished customer clip.
3. **Given** the export action, **When** it completes, **Then** the result reflects what genuinely
   happened (e.g. "Copied" / "Downloaded"), with no fabricated "finished video exported" claim.

---

### User Story 2 - A withdrawn-consent clip is not exportable (Priority: P1)

When a clip's source proof has its consent withdrawn, that clip is **not exportable** — the export
re-checks current effective consent at read time and refuses, exactly as every other read does.

**Why this priority**: Consent Is Sacred (P-VII). Export is an **outbound** action — the
highest-stakes place to leak non-consented proof outside the app. The withdrawal gate must hold at
export, not only at listing time.

**Independent Test**: Withdraw a proof's consent, then attempt to export its clip (directly, or after
it was already visible in a list); confirm no post-text is produced for it and the refusal is honest.

**Acceptance Scenarios**:

1. **Given** a clip whose source proof consent is **withdrawn**, **When** export is attempted, **Then**
   no post-text package is produced for that clip (the read returns nothing exportable), consistent
   with the clip already being filtered from the consent-gated reads.
2. **Given** a clip listed for export and then its consent is withdrawn **before** export runs,
   **When** export runs, **Then** it re-checks at read time and that clip is excluded — no payload,
   no fabricated success.

---

### User Story 3 - Export several clips from the Library at once (Priority: P2)

*(In scope only if Q1 resolves to single + bulk.)* From the Library, a workspace owner selects
several clips and exports them together — the bulk form of US1, parallel to B1's selection model. The
result is honest about which clips were included and which were skipped (e.g. consent withdrawn).

**Why this priority**: This is the **bulk tier** (T4); bulk export is the natural scale form of the
payoff. It is P2 because US1 (single export) is a complete, demonstrable MVP on its own; bulk is
additive value on top.

**Independent Test**: In the Library, enter a selection mode (additive overlay; clip card shape
unchanged), select 2–3 consented clips plus optionally one withdrawn, activate Export; confirm a
combined post-text deliverable for the consented clips, with an honest summary of what was included
and what was skipped.

**Acceptance Scenarios**:

1. **Given** the Library, **When** the owner enters selection and picks several clips, **Then** a
   selection affordance reflects the chosen clips and an Export action is available — added **around**
   the byte-unchanged clip card, not inside it.
2. **Given** a multi-clip selection, **When** the owner activates Export, **Then** the post-text for
   each **consented** clip is produced together (mechanism per Q3 — e.g. a single text/CSV/JSON
   manifest, or sequential downloads), with **no** finished video in the bundle.
3. **Given** the selection includes a clip whose consent is withdrawn, **When** Export runs, **Then**
   that clip is **skipped** and the result reports honestly — N exported, which (if any) were skipped
   and why — no all-or-nothing fiction (the B1 honest-partial pattern, FR-019).

---

### Edge Cases

- **No exportable text fields**: a clip with no brand hook set and/or a proof with an empty
  headline — the export still produces the attribution and whichever owned fields exist; it never
  fabricates a caption to fill the gap.
- **Consent withdrawn between list and export** (the B1 race, applied to reads): re-checked at read
  time; excluded; reported honestly in bulk.
- **Empty Library / empty selection**: the export affordance is unavailable or a no-op with honest
  copy; no empty file claiming content.
- **Clipboard unavailable** (if copy is a mechanism): the action falls back to / also offers the file
  download so the control still genuinely works (A-11); never a silent dead button.
- **The sample video reference**: always rendered/labeled as a sample; an export consumer must not be
  able to mistake it for the finished customer clip.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST let a workspace owner export a single clip's **post-text package** from
  the clip's detail surface, producing post-ready content the user can take to their platform.
- **FR-002**: The post-text package MUST contain only **owned, produced** data: the brand-authored
  **hook/caption**, the **customer headline** (the customer's verbatim proof — quote or transcript),
  and the **proof attribution** (customer name, the "verified real customer" mark, the capture
  source). It MUST NOT contain any view/reach/engagement/performance metric (FR-019).
- **FR-003**: The system MUST NOT export the clip's **rendered video as a finished customer clip**.
  The video MAY appear only as an **openly-labeled sample reference** ("sample — replaced by your
  rendered clip when rendering ships at T8"), never named or presented as the finished clip. The real
  rendered video is the honest **T8 seam**, deferred.
- **FR-004**: The export control MUST genuinely work (A-11): it MUST really produce a file and/or
  really copy the text. No dead export button; the only deferred capability is the real video.
- **FR-005**: Export MUST respect **current effective consent** (P-VII): a clip is exportable **only
  if its source proof's effective consent is `granted`**, re-checked at **read time** through the
  same withdrawal-gated reads every other surface uses. A withdrawn-consent clip MUST NOT yield an
  exportable payload.
- **FR-006**: The export result MUST be **honest** about what happened — what was produced
  (copied / downloaded), and, in bulk, **how many** were exported and which (if any) were skipped and
  why. No fabricated success, no all-or-nothing fiction (FR-019, mirroring B1's honest partial).
- **FR-007**: Export MUST add **no schema change** (no new tables, columns, or enums). It is read +
  produce over existing owned fields.
- **FR-008**: Export MUST keep these surfaces **byte-stable**: `ProofCard`, the proof / `ClipView` /
  `LibraryClipView` / `ClipDetailView` / showcase read shapes, `generateClip`, `generateBatch`, and
  the nav rail. The export action + UI are additive.
- **FR-009**: *(Conditional on Q1 = single + bulk.)* The system MUST let a workspace owner select
  several clips in the Library and export them together. Any Library selection mode MUST be an
  **additive overlay** added **around** the clip card — it MUST NOT change `LibraryClipView` or the
  clip-card shape.
- **FR-010**: *(Conditional on Q1 = single + bulk.)* Bulk export MUST apply FR-002, FR-003, FR-005,
  and FR-006 **per clip** — each clip's post-text is owned-only and consent-gated, the bundle carries
  no finished video, and the result reports the honest partial.
- **FR-011**: Product copy MUST avoid "amazing"/"awesome" and emoji (P-XI); the export must not
  overclaim ("post-ready text", not "your finished viral clip").

### Key Entities *(include if feature involves data)*

- **Post-text package**: the owned, post-ready content produced for one clip — **hook/caption**
  (brand-authored, owned provenance; from `ClipView.hook` / `ClipDetailView.hook`), **customer
  headline** (the customer's verbatim proof — `ProofView.quote` or `.transcript`), and **proof
  attribution** (`customerName`, `verified`, capture `source`). No metrics. This is the real export
  payload; it is **derived/produced** at export time, not a new stored entity.
- **Sample video reference**: the openly-labeled placeholder pointer to `SAMPLE_CLIP_URL` (or its
  resolved sample file — see Q2), carried as a clearly-marked *sample*, never as the finished clip.
  This is the T8 seam.
- **Bulk export selection** *(conditional on Q1)*: the transient, UI-only set of chosen Library clips
  — an additive selection state around the clip cards, not a persisted entity and not part of any
  read shape.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a consented clip, a user can produce its post-ready text in **one action**, and
  the produced text contains the hook/caption, the customer headline, and the attribution — and
  nothing the app does not own (0 metrics, 0 fabricated captions).
- **SC-002**: In **100%** of exports, the rendered video is labeled as a sample and is **never**
  presented or named as the finished customer clip.
- **SC-003**: A clip whose source proof's consent is withdrawn is **never** exportable — **0**
  withdrawn-consent clips produce a payload, verified by withdrawing consent and re-attempting export.
- **SC-004**: The export control genuinely produces an artifact (copied text and/or a downloaded
  file) on **every** activation against a consented clip — **0** dead-button outcomes.
- **SC-005**: *(If bulk in scope.)* When a bulk selection mixes consented and withdrawn clips, the
  result reports the exact count exported and the exact count/identity skipped — **0** all-or-nothing
  or fabricated-success outcomes.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: the **customer headline** (the customer's verbatim proof) is
  the centerpiece of the exported package and of the export surface — the customer's words are the
  largest, warmest element; the brand hook is clearly the brand's words, secondary.
- **Port, don't redesign (P-V)**: ported from `/design-reference` B4 — **but** the B4 export screen
  is a **duplicate of the B1 Batch-studio modal** (no dedicated export layout exists). Per **P-XII**,
  the missing export layout is **raised, not invented**: Export is treated as a **derived surface**
  (precedent: T3.2 clip-detail), composed from the owned fields already on the clip-detail / Library
  surfaces and the existing Pressroom tokens. The exact export affordance layout is **part of the
  open clarifications** (Q3 mechanism / placement), not a free redesign.
- **Fixtures-first (P-VI)**: built and demonstrated on the existing fixtures, which are shaped exactly
  like the real schema; export reads the same owned fields real data will carry. No schema change.
- **Consent (P-VII)**: export re-respects current effective consent at read time, reusing the shared
  withdrawal gate (`effectiveConsentGranted` / the `getClipDetail` / `getLibraryClips` reads);
  withdrawn proof yields no exportable clip — revocation already cascades to derived assets, and
  export is just one more consent-gated read.
- **No editor (P-VIII)**: N/A — Export adds no studio/timeline/scrubber; it is a read-and-produce
  action, not an editing surface.
- **Scope (P-IX, P-XI)**: a single vertical slice — the export of owned post-text from a clip (single,
  and conditionally bulk). No publishing, no platform integration, no real video render, no analytics
  — those are later tiers (T8 render, T9 distribute/publish).
- **Microcopy (P-XI)**: export copy avoids "amazing"/"awesome" and emoji; it does not overclaim a
  finished video.

## Clarifications to resolve *(blocking — human decision, like B1's Q1–Q3)*

The user asked these be **surfaced, not assumed**. Leans are noted but **not** baked in.

### Question 1: Scope — single only, or single + bulk?

**Context**: It is the **bulk tier** (T4); B1/B2/B3 all leaned bulk. US1 (single export) is a
complete MVP; US3 (bulk) is additive scale.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Single-clip export only** (from clip detail) | Smallest honest slice; no Library selection mode; defers bulk. FR-009/FR-010 drop. |
| B | **Single + bulk** (Library selection → export all) | Matches the bulk tier; adds an additive Library selection overlay (clip card byte-stable) + honest partial. Pulls in the bulk-mechanism/zip decision (a plan-stage call, like aws4fetch). |
| Custom | Provide your own scope | e.g. bulk-only, or single now + bulk as a fast follow. |

**Lean**: not pre-assumed. (Bulk fits the tier, but single is the honest MVP.) **Your choice**: _____

### Question 2: Asset honesty — labeled placeholder, or promote the sample to a real R2 file?

**Context**: Today the video is the shared `SAMPLE_CLIP_URL` placeholder (`r2://…/press-run-sample.mp4`).
B2 wired real R2 (aws4fetch), so the sample *could* be promoted to a real, clearly-labeled sample
object that export hands over as a real file.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Keep the labeled placeholder reference** | `SAMPLE_CLIP_URL` + byte-stable surfaces untouched; export references the sample by its labeled pointer only — no real video file leaves. Smallest, honesty-safe. |
| B | **Promote the sample to a real R2 object** | Export hands over a real, clearly-labeled **sample** file (a genuine artifact, not the finished clip). Uses the B2 R2 path; adds a sample-object step; still never the finished clip. |
| Custom | Provide your own | e.g. promote only for single export, reference-only for bulk. |

**Lean (user)**: A — keep the placeholder; preserves `SAMPLE_CLIP_URL` and byte-stable surfaces.
**Your choice**: _____

### Question 3: Mechanism — download a file, copy to clipboard, or both?

**Context**: A-11 requires the control genuinely works. The post-text can be **copied** (paste into
the platform) and/or **downloaded** (a `.txt`/`.json`/`.csv` caption/manifest file).

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Copy to clipboard** | Fastest "paste into your post" path; needs a clipboard-unavailable fallback to stay non-dead (A-11). Less natural for bulk. |
| B | **Download a file** | A durable artifact (caption file / manifest); natural for bulk; one mechanism for single + bulk. |
| C | **Both** | Copy for single, download for single + bulk; most complete, slightly more UI. |
| Custom | Provide your own | — |

**Lean**: not pre-assumed. **Your choice**: _____

> **Deferred to plan stage (not a spec decision):** if bulk export (Q1=B) wants a **.zip**, that is a
> potential **second new dependency** (a zip lib) — to be flagged as a conscious plan-stage decision
> exactly as `aws4fetch` was, with a **no-dep path preferred** (a single CSV/JSON manifest of the
> selected clips' post-text, or sequential downloads) if it is clean enough. The user explicitly said:
> **do not pick the bulk mechanism in the spec.**

## Assumptions

- The owned post-text fields already exist on the read shapes: `hook` (`ClipView`/`ClipDetailView`),
  the customer headline (`ProofView.quote` / `.transcript`), and attribution (`customerName`,
  `verified`, `source`). Export reads these; it adds no new stored fields.
- Export is **read + produce** only — no publishing, no platform/API integration, no scheduling
  (those are T9 distribute). No real video render (T8). No analytics/metrics ever (FR-019).
- The consent gate is the **existing** shared withdrawal filter
  (`effectiveConsentGranted` / `getClipDetail` / `getLibraryClips`); export introduces no new
  consent logic — it reuses the same read-time gate.
- The export surface is a **derived surface** (no portable B4 layout exists), composed from existing
  Pressroom tokens and the owned fields on clip-detail / Library — not a redesign.
- Single-clip export attaches to the existing clip-detail surface (`/app/clip/[id]`); any bulk
  selection attaches to the Library as an additive overlay around the byte-unchanged clip card.
- Workspace owner is the actor (the only role in the fixtures/stub session today).
