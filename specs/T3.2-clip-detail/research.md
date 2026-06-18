# Phase 0 — Research: T3.2 Clip detail

The spec's Q1–Q3 are resolved, so no `NEEDS CLARIFICATION` remain. This file records the implementation
design decisions (D1–D6).

---

## D1 — A derived surface, not a port (honest P-V exception)

**Decision**: Build the clip detail as a **derived surface** from the established patterns — the proof-detail
(screen 03) two-column layout + no-oracle tenant isolation, the studio (screen 04) clip/sample framing, and
the render spec — **not** as a port of a clip-detail screen.

**Rationale**: There is **no clip-detail screen in `/design-reference`** (the export has studio 04, Library
09, clipping skeletons 16, Export B4 — none per-clip). P-V ("port, don't redesign") cannot apply literally
when there is nothing to port. Reusing the proof-detail's settled layout/idioms keeps it faithful and avoids
inventing a new design language.

**Alternatives considered**: Invent a bespoke clip-detail design (rejected — drift from the design system,
P-V spirit). Defer to T8 (was the prior decision; un-deferred by the human to build early).

---

## D2 — `getClip` three-into-one null (no oracle), reusing the shared gate

**Decision**: `getClip(workspaceId, clipId)` returns the detail projection or `null`; a **missing** id, a
**cross-workspace** id, and a **withdrawn** clip (source proof's effective consent ≠ granted) **all** return
`null` → one content-free `notFound()`.

**Rationale**: The exact T2.3 tenant-isolation pattern, extended to withdrawal (P-VII). Reusing the shared
`effectiveConsentGranted` makes the clip detail's visibility **identical** to the Library/dashboard/detail —
a withdrawn clip is unreachable, not merely absent from lists, and the viewer can't tell which of the three
cases occurred (no existence oracle, no cross-tenant or withdrawal leak).

**Alternatives considered**: Distinct "withdrawn" / "not found" / "forbidden" states (leak existence +
whether a clip was withheld — rejected). A separate visibility check after fetch (drift from the shared
gate — rejected; fold it into the query predicate).

---

## D3 — `ClipDetailView` (new); `ClipView`/`LibraryClipView` unchanged

**Decision**: Add a new `ClipDetailView` interface carrying owned fields only: clip metadata + source-proof
provenance + **two consent roles** — the **made-under** consent (version + date, from `derived_asset.consentId`)
and the proof's **current effective** consent (state + version + date, reusing the proof-detail subqueries).

**Rationale**: The focused detail needs provenance (the source proof + the consent the clip was made under)
that the collection views (`ClipView` for the proof detail, `LibraryClipView` for the Library) deliberately
omit. A separate, additive view keeps those byte-stable. Showing **made-under vs current** consent honestly
distinguishes provenance from the live gate (FR-006).

**Alternatives considered**: Widen `LibraryClipView` (ripples into the Library card/read — rejected).

---

## D4 — Non-playing "Sample preview" still (Q1 / FR-019)

**Decision**: Represent the clip as a **non-playing labelled "Sample preview" still** in the chosen format —
no `<video>`, no play control.

**Rationale**: The clip is a stubbed sample (no real per-proof render pre-T8) and the source proof carries no
media in fixtures — so there is nothing real to play. Playing the generic sample would imply a finished
personalised render (FR-019). The honest stand-in is a labelled still, consistent with the studio result +
Library card, just given more room. Real playback swaps in **behind the same frame** at T8 (the early build
is the seam, not throwaway).

**Alternatives considered**: Play the sample stub (implies a finished render — rejected pre-T8); lead with
source-proof footage (none exists in fixtures — rejected).

---

## D5 — Route `/app/clip/[id]` (Q2)

**Decision**: Top-level `/app/clip/[id]`.

**Rationale**: A durable canonical clip URL, reusable wherever a clip is referenced (the Library now; the
dashboard latest-clip, the proof-detail "Generated assets", future showcase/campaigns later), consistent
with `/app/proof/[id]`. Avoids coupling the clip URL to the library path.

**Alternatives considered**: `/app/library/[clipId]` nested (couples to the library path; awkward from
non-library surfaces — rejected).

---

## D6 — Library-card re-wire (Q3 — A-11 completion)

**Decision**: Re-point the T3.1 Library card to `/app/clip/[id]`; the source-proof link **relocates into**
the clip detail (its side panel). The card is otherwise **appearance-preserving**.

**Rationale**: Now that the clip detail exists, the card's single clear primary destination is the clip
(A-11). The source proof stays one hop away as provenance on the detail. Only the card's `href`/`aria-label`
change; markup/classes/appearance are unchanged.

**Alternatives considered**: Keep both destinations on the card (the "two primaries" A-11 concern — rejected).

---

**Output**: all design decisions resolved; proceed to Phase 1 design artifacts.
