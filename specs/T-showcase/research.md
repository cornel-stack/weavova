# Phase 0 — Research: T-Showcase

The spec's Q1–Q3 are resolved, so no `NEEDS CLARIFICATION` remain. This file records the implementation
design decisions (D1–D5).

---

## D1 — Port screen 10's owned half (the design question, resolved)

**Decision**: A Showcase screen **exists** — screen 10 "Showcase manager" at `/app/showcase`. Port its
**owned curate/preview wall**; do **not** render its T9 distribution machinery (LIVE/"public set", "Add from
library", Single highlight / Carousel / Wall of Love presets, the embed `<script>` + "Copy embed").

**Rationale**: P-V (port) applies — there's a screen — but A-11 governs *which controls* render: the
distribution/curation machinery has no backing pre-T9, so it is omitted (hidden, not dead). The separate
Public-site "Public showcase" export is the public wall itself — that is the T9 distribution surface, not
this internal preview.

**Alternatives considered**: Build a derived surface (unnecessary — a screen exists). Render the embed/
publish controls greyed-out (dead controls — rejected, A-11 / [[port-completeness-rule]]).

---

## D2 — `getShowcase` = a combined, withdrawal-filtered read

**Decision**: `getShowcase(workspaceId)` runs two queries in one `withDbRetry` block — **consented proof**
(reusing `proofColumns`/`toView`, gated by `effectiveConsentGranted(proof.id)`) and **consented clips** (the
`getLibraryClips` shape, gated by `effectiveConsentGranted(derived_asset.proofId)`) — then merges them into a
`ShowcaseItem[]`, **newest-first** by each item's date.

**Rationale**: The wall shows both proof + clips, **all-consented** (Q3). Reusing the **shared
`effectiveConsentGranted`** makes withdrawal identical to the dashboard/Library (one source of truth — P-VII).
Reusing `proofColumns`/`toView` (read-only) keeps the proof projection consistent and existing reads
unchanged. **Note**: this is **distinct from `getProofs`**, which is deliberately *not* consent-filtered (the
inbox shows all states); the Showcase shows only granted, so it is its own query — not a change to `getProofs`.

**Alternatives considered**: Reuse `getProofs` (wrong — it's unfiltered; would show awaiting/revoked on the
public-most surface — rejected). One UNION query (less readable; the two-query + merge is clearer and reuses
existing projections).

---

## D3 — `ShowcaseItem` reuses the existing view shapes

**Decision**: `ShowcaseItem = { kind:'proof'; proof: ProofView } | { kind:'clip'; clip: LibraryClipView }`,
added to `src/lib/showcase.ts`.

**Rationale**: The wall items are exactly proof views + clip views with a discriminant; reusing `ProofView` /
`LibraryClipView` avoids duplicating fields and keeps them byte-stable. Additive — nothing they depend on
changes.

**Alternatives considered**: A new flattened `ShowcaseItemView` (duplicates fields, drift risk — rejected).

---

## D4 — The wall has its own item presentation, not ProofCard

**Decision**: The wall renders a new `showcase-item` (a proof testimonial card / a clip sample-preview card),
**not** the canonical ProofCard.

**Rationale**: ProofCard carries internal chrome — the consent dot, the "Unreviewed" stamp, the "Make" link —
inappropriate for a **public-style** wall (it would look like the inbox and expose internal state). The wall
needs its own presentation; per the brief, it's added **without touching the shared ProofCard contract**.
Small display idioms (the verified mark, initials) may be re-expressed locally, as the dashboard hero already
does — no import/alteration of ProofCard.

**Alternatives considered**: Reuse ProofCard verbatim (wrong chrome + indistinct from the inbox — rejected).

---

## D5 — The curation + publish/embed cluster defers to T9 as one coupled feature

**Decision**: This slice is a **read-only preview** of the eligible wall (Q2→A). No curation control, no
membership flag, **no schema change**; no publish/embed/share. The whole curate + publish/embed cluster
defers to T9.

**Rationale**: Curation is **coupled to publishing** — the merchant curates *what goes live*. Building a
"public set" before there's anything to publish it to (T9) would be a control whose purpose doesn't exist yet
(A-11), and a schema change with no read that needs it (against fixtures-first/schema-before-screens — there'd
be no screen consuming a "live" flag until T9). The honest slice is the read-only preview; the coupled cluster
lands together at T9.

**Alternatives considered**: Curated now (a featured/membership flag + curation mutation + the proof picker —
faithful to screen 10, but premature without distribution; a schema change with no current consumer beyond
the manager itself — deferred to T9 with publishing). Auto-show but render disabled embed/publish (dead
controls — rejected).

---

**Output**: all design decisions resolved; proceed to Phase 1 design artifacts.
