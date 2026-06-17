# Phase 0 — Research: T3.1 Library

The spec's open questions (Q1–Q3) were resolved with the human before this plan, so no `NEEDS
CLARIFICATION` remain. This file records the implementation design decisions (D1–D6).

---

## D1 — Reuse the T2.4a clip-read pattern for `getLibraryClips`

**Decision**: `getLibraryClips(workspaceId)` is the **same shape** as the existing `getProofClips` and the
`getDashboardSummary` clip reads: `withDbRetry`-wrapped, a `derived_asset`⋈`proof` join, and the **shared
`effectiveConsentGranted(derivedAsset.proofId)`** withdrawal filter. It differs only in scope — the whole
workspace (no `proofId` filter) — and in projecting the source customer + proof id for the card/link.

**Rationale**: Reusing the shared `effectiveConsentGranted` (→ `effectiveConsentState`) makes the Library's
withdrawal **provably identical** to the dashboard/detail (one source of truth — P-VII). A clip is visible
in the Library **iff** it is visible there. No existing read changes.

**Alternatives considered**: A bespoke consent subquery (drift risk — rejected). Widening `getProofClips` to
serve both (would change a byte-stable read — rejected; see D2).

---

## D2 — New `LibraryClipView`; `ClipView` stays byte-unchanged

**Decision**: Add a new `LibraryClipView` interface (= `ClipView`'s owned fields **plus** `proofId`,
`customerName`, `verified`) alongside `ClipView` in `src/lib/clip.ts`. `getLibraryClips` returns
`LibraryClipView[]`; `getProofClips` still returns `ClipView[]` unchanged.

**Rationale**: The Library card needs the source customer + the proof-link target + the verified mark, which
the proof-detail's `ClipView` deliberately omits (the detail already sits in a proof context). A separate
view keeps `ClipView`/`getProofClips` byte-stable while adding exactly the owned fields the new surface
needs (FR-019 — owned only; no metrics).

**Alternatives considered**: Widen `ClipView` (ripples into the detail read + its component — rejected).

---

## D3 — A grid of clip cards, not screen-09's proof+clip table

**Decision**: Render the clips as a responsive **grid of clip cards** (newest first), not screen-09's
List/Grid table of proof + clips.

**Rationale**: Clips are visual (vertical video); a card grid is the faithful "clip collection" and matches
the brief (clips-only — Q1). Screen-09's table carries un-owned columns (Status) and a List/Grid toggle
whose List half isn't built — porting it literally would violate A-11/FR-019. The grid mirrors the inbox
Wall's responsive multi-column approach (no JS masonry dependency).

**Alternatives considered**: Port the table literally (un-owned Status column + half-built toggle —
rejected). A List/Grid toggle (both views unbuilt → a dead control — rejected, A-11).

---

## D4 — The whole card is a `Link` to the source proof (Q2→C)

**Decision**: Each card is (or wraps) a `Link` to `/app/proof/[proofId]` — the source proof, the one
destination that exists today. Built directly into the new card.

**Rationale**: Q2→C. Unlike the inbox (whose byte-frozen ProofCard needed a sibling stretched-link overlay),
the Library card is **new**, so the link is built in directly — simpler, keyboard-focusable, visible focus.
No per-clip-detail link (T3.2 unbuilt) and no inline play (no real render — FR-019).

**Alternatives considered**: Navigate to a clip detail (T3.2 doesn't exist → dead link — rejected). Inline
sample play (implies a finished render — FR-019 — rejected until T8).

---

## D5 — A-11 omissions: hidden, not dead

**Decision**: Do **not** render: Kind/Source/Consent filters; the List/Grid toggle; the "Download clips (N)"
bulk action; the Ready/Queued render-status column; any per-clip-detail link; inline play; any
view/engagement/performance metric.

**Rationale**: A-11 + FR-019 + scope. Filters are deferred (and a Consent: Revoked filter is incoherent with
read-time withdrawal, which already removes non-granted clips); export is T4; render status needs the T8
pipeline (un-owned); the clip detail is T3.2; inline play needs a real render (T8). The honest per-clip
signal is the **sample/preview** chip.

**Alternatives considered**: Greying the controls out (still a dead control + implies coming-soon scope —
rejected; the port-completeness rule [[port-completeness-rule]] says don't render what can't work).

---

## D6 — Honest count + honest empty

**Decision**: The count shown = the length of the **withdrawal-filtered** rows (owned, honest). The empty
state is reached when there are zero clips **or** when all are withheld; it shows no fabricated rows/counts
and orients the merchant toward making one (a quiet link to the proof inbox, where "Make a clip" lives).

**Rationale**: FR-007/FR-008 + FR-019. The count must equal what's shown (never a total that includes
withheld clips). The empty state must not imply clips exist.

**Alternatives considered**: A total-vs-visible count ("3 of 4" — leaks the existence of withheld clips,
contradicts withdrawal — rejected).

---

**Output**: all design decisions resolved; proceed to Phase 1 design artifacts.
