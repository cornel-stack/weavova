# Feature Specification: Warmth sort (rank the proof inbox by content-readiness)

**Feature Branch**: `T4-B3-warmth-sort`

**Created**: 2026-06-21

**Status**: Draft — **3 clarifications OPEN** (see "Clarifications to resolve"). Do **not** `/speckit-plan`
until Q1–Q3 are answered by the human.

**Tier**: T4 — Bulk & exports (T4-B3 — Warmth sort; **the last remaining T4 slice** — B1 batch / B2
brand-asset store / B4 export already shipped).

**Input**: User description: "T4-B3 — Warmth sort: prioritize the proof inbox by which proofs are most
worth turning into content, using a REAL computed signal from owned data. … Warmth is CONTENT-READINESS
/ OPPORTUNITY, computed ONLY from facts we genuinely own — never a conversion/engagement prediction."

**Ported from**: `/design-reference/Weavova/Bulk & exports/B3 _ Warmth _ sorted warmest`. The B3 screen
is the **proof inbox (screen 02) with "Sort · Warmest" active** — the Wall **re-ordered**, no separate
per-card numeric score shown. So B3 is the existing inbox **re-ordered**, not a new layout — and it
**lights up the seam T2.2 left**: the inbox sort already renders **"Warmest — coming soon" (disabled)**
beside the working "Newest"; the `SortKey` type is deliberately `"newest"` only, with a comment that
"the real warmth ranking is T4/B3, gated on a signal the schema does not carry." B3 makes that control
**real**.

---

## Overview

Warmth answers **"where do I spend effort?"** Now that proof arrives and the bulk tools (B1 batch, B2
brand assets, B4 export) can act on it, the inbox needs an ordering that floats the proof **most ready
and worth turning into content** to the top.

**Warmth is CONTENT-READINESS / OPPORTUNITY — an honest, transparent function of owned facts.** It is
**not** a conversion, engagement, or popularity prediction: the product holds **no** views, likes, or
conversion data, so warmth must **never** imply or fabricate one (FR-019). The owned-signal palette
warmth may compose from — every one a real fact the app already holds:

- **Recency** — how recent the proof is (its capture/created timeliness). Fresher proof is timelier
  content.
- **Completeness** — how rich the proof is: does it carry a verbatim quote / transcript / media? The
  richer, the more content-ready.
- **Un-tapped** — whether any clip has been made from it yet. A proof with **no clips** is untapped
  opportunity; an already-harvested one is less urgent.
- **Consent (a gate, not a booster)** — effective consent must be **granted** for a proof to become
  content at all. A **withdrawn** proof **can't** become content, so it is **not warm** — warmth ranks
  it cold. This reuses the **shared `effectiveConsentState`**; it adds **no new consent gate**.

Warmth is a **read-time** computation over these current owned facts — never a hand-typed number, never
a stored/stale column, never a metric the app doesn't actually have. The signal must be **explicable
from owned data** ("warmer because it's recent, has a full quote, and hasn't been clipped yet").

**The inbox still shows every proof in every state.** Warmth is an **ordering**, layered on the
existing inbox — `getProofs` stays **unfiltered** (the inbox needs all consent/review states); warmth
just decides the order (and, if chosen, a per-proof indicator). Withdrawn proof still appears; it
simply ranks cold. This is the inbox **re-ordered** (like B1's selection mode is the inbox in a mode),
**no new route**.

**Byte-stable & additive.** The existing `getProofs` read **shape** (`ProofView`), `ProofCard`, and the
proof / clip / showcase reads stay **byte-unchanged**. Warmth is additive — the inbox gains a real
**sort toggle** (Warmest ↔ Newest) and, if chosen, a per-proof warmth indicator. **No new dependency**
(pure computation over owned data). **A-11**: the sort control genuinely re-orders; any indicator
reflects the **real** computed signal — no dead control, no decorative fake badge.

> **A signal gap that shapes scope (flagged for the plan, surfaced in Q1):** three of the four signals —
> recency, completeness, consent — are **already on `ProofView`** (the inbox's current read). The
> fourth, **un-tapped (clip count per proof)**, is **NOT** projected by `getProofs` today. Composing
> warmth **with** un-tapped therefore needs an **additive** read/annotation of each proof's clip status
> (computed at read time, byte-stable to existing shapes) — whereas a recency+completeness+consent
> warmth can be computed purely from fields the inbox already has. Q1 decides whether un-tapped is in.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sort the inbox by warmth to find the most content-ready proof (Priority: P1)

A workspace owner switches the inbox sort to **Warmest** and the Wall re-orders so the proof most ready
and worth turning into content rises to the top — computed live from owned facts. They can switch back
to **Newest** at any time.

**Why this priority**: It is the slice's core value and MVP — the real ordering that tells the user
where to act, and it makes the long-stubbed "Warmest — coming soon" control real.

**Independent Test**: In the inbox, switch Sort to Warmest; confirm the order changes to a warmth
ranking (not the newest order), the control genuinely re-orders, and switching back to Newest restores
the recency order.

**Acceptance Scenarios**:

1. **Given** the inbox sorted Newest, **When** the owner selects **Warmest**, **Then** the proof
   re-orders by the computed warmth ranking (most content-ready first) — a real re-order, not the same
   list (A-11).
2. **Given** the inbox sorted Warmest, **When** the owner selects **Newest**, **Then** the order
   returns to most-recent-first (the existing behaviour, unchanged).
3. **Given** a fresh, complete, un-clipped, **granted** proof and an older / sparser / already-clipped
   one, **When** sorted Warmest, **Then** the former ranks **above** the latter.

---

### User Story 2 - Withdrawn-consent proof ranks cold, but still shows (Priority: P1)

When a proof's effective consent is **withdrawn**, warmth ranks it **cold** (it can't become content) —
but the inbox still **shows** it (the inbox surfaces every state). Warmth never hides proof; it only
orders it.

**Why this priority**: Consent Is Sacred (P-VII) and honesty (FR-019). Warmth must reflect that a
withdrawn proof is not a content opportunity, **without** turning into a second consent gate or hiding
proof the inbox is meant to show.

**Independent Test**: Include a withdrawn-consent proof; sort Warmest; confirm it ranks at/near the
bottom (cold), is **still visible** in the inbox, and that no proof is filtered out by warmth.

**Acceptance Scenarios**:

1. **Given** a withdrawn-consent proof, **When** sorted Warmest, **Then** it ranks **cold** (below
   granted, content-ready proof) yet remains **visible** in the inbox.
2. **Given** any warmth sort, **When** the list renders, **Then** the **count is unchanged** from the
   same filters under Newest — warmth re-orders, it never filters (`getProofs` stays unfiltered).

---

### User Story 3 - Understand why a proof is warm (honest, explicable) (Priority: P2)

The warmth shown is **explicable from owned facts** — the user can tell warmth means content-readiness
(recency / completeness / un-tapped / consent), **not** an engagement or conversion prediction. If a
per-proof warmth indicator is shown (Q2), it reflects the real computed signal and reads honestly.

**Why this priority**: Honesty (FR-019) — warmth must not read as a fabricated metric. It is P2 because
the ordering (US1) delivers value even with no per-proof badge; the explicability/indicator is the
honesty layer on top.

**Independent Test**: Read the warmth control / any indicator copy; confirm it frames warmth as
content-readiness from owned facts and never claims views/likes/conversion/popularity.

**Acceptance Scenarios**:

1. **Given** the Warmest sort (and any indicator), **When** the user reads the copy, **Then** it
   conveys **content-readiness / opportunity** and never implies an engagement/conversion metric.
2. **Given** a per-proof warmth indicator (if Q2 chooses bands/score), **When** it renders, **Then** it
   matches the proof's real computed warmth (a colder proof never shows warmer than a warmer one).

---

### Edge Cases

- **Ties**: two proofs with equal computed warmth — fall back to a stable secondary order (e.g. most
  recent) so the sort is deterministic, never random.
- **All-equal inputs** (e.g. a fresh empty workspace, or every proof identical on the signals): Warmest
  degrades gracefully to the recency order; the control still genuinely works (no error, no fake spread).
- **A proof with neither quote nor transcript nor media** (low completeness): ranks lower on
  completeness, never fabricated upward.
- **Withdrawn but recent/complete**: consent-as-gate dominates — it still ranks cold (can't become
  content), regardless of how fresh/complete it is.
- **Filtered + sorted**: warmth applies **after** the existing status/type/search filters, ordering
  only what's visible; counts match the Newest view of the same filters.
- **Empty inbox**: the sort control is present but inert-by-emptiness (nothing to order); no error.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The inbox MUST offer a **Warmest** sort that genuinely re-orders the visible proof by a
  computed warmth ranking, and a **Newest** sort (the existing recency order). The control MUST really
  re-order (A-11) — no dead/decorative option.
- **FR-002**: Warmth MUST be computed **only from owned facts** — drawn from {recency, completeness,
  un-tapped (clip status), effective consent}. It MUST NOT use or imply any view / like / reach /
  engagement / conversion / popularity metric — the product holds none (FR-019).
- **FR-003**: Warmth MUST be a **transparent, explicable** function of those owned facts — never a
  hand-typed number and never a stored warmth value. It MUST be computed at **read time** so it always
  reflects the **current** owned facts (current recency, current clip status, current consent).
- **FR-004**: Effective **consent** MUST act as warmth's **gate**, reusing the **shared
  `effectiveConsentState`**: a **withdrawn**-consent proof MUST rank **cold** (not content-ready). This
  MUST add **no new consent gate** and MUST NOT filter proof out.
- **FR-005**: The inbox MUST continue to **show every proof in every state** — `getProofs` stays
  **unfiltered**; warmth only orders (and optionally annotates). The visible **count** under Warmest
  MUST equal the count under Newest for the same filters.
- **FR-006**: Warmth MUST order **only the currently-visible proof** — applied **after** the existing
  status / type / search filters, consistent with the inbox's current in-memory derivation.
- **FR-007**: Warmth ordering MUST be **deterministic** — equal-warmth ties resolve by a stable
  secondary key (e.g. recency); no random or unstable ordering.
- **FR-008**: Any UI copy for the warmth control / indicator MUST frame warmth as **content-readiness /
  opportunity** and MUST NOT over-claim predictive or engagement power (P-XI; FR-019).
- **FR-009**: The slice MUST keep these **byte-stable**: the `getProofs` read **shape** (`ProofView`),
  `ProofCard`, and the proof / clip / showcase read shapes. Warmth is **additive** (a sort control, an
  additive read/annotation or client-side compute, and — if chosen — an indicator), with **no new
  route** and **no new dependency**.
- **FR-010**: *(Conditional on Q2)* If a per-proof warmth **indicator** is shown, it MUST reflect the
  **real** computed warmth (no decorative fake badge; a colder proof never appears warmer).
- **FR-011**: *(Conditional on Q1 = include un-tapped)* The **clip status per proof** needed for the
  un-tapped signal MUST be obtained **additively** (a read-time annotation/read), **without** changing
  the `getProofs` shape or `ProofCard`.

### Key Entities *(include if feature involves data)*

- **Warmth signal (computed, not stored)**: a read-time value derived per proof from owned facts —
  recency (capture/created time), completeness (presence/richness of quote / transcript / media),
  un-tapped (whether any clip exists for the proof), and consent (effective state as a gate). Produced
  at read/render time; **not** a persisted column.
- **Proof (existing)**: the inbox row. Its `ProofView` already carries recency, the quote/transcript/
  media presence (completeness), and the effective consent state. It does **not** carry clip status —
  the un-tapped signal's missing input (see Q1).
- **Clip status per proof (existing data, not yet projected here)**: whether the proof has any derived
  clip. The data exists (`derived_asset`), but `getProofs` does not project it; the un-tapped signal
  needs it surfaced additively.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Switching Sort to Warmest re-orders the inbox in **one action**, and a fresh / complete /
  un-clipped / granted proof appears **above** an older / sparser / already-clipped one — verifiable on
  fixtures.
- **SC-002**: In **100%** of warmth sorts, **no** proof is filtered out — the visible count equals the
  Newest count for the same filters (warmth orders, never hides).
- **SC-003**: A withdrawn-consent proof ranks **cold** (below content-ready proof) in **100%** of
  warmth sorts, while remaining **visible**.
- **SC-004**: Warmth is explicable from owned facts — **0** references to views / likes / reach /
  engagement / conversion / popularity in the warmth logic or copy (FR-019).
- **SC-005**: The warmth ordering is **deterministic** — the same inbox state produces the same order
  every time (ties stably resolved); **0** random reorderings.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: warmth re-orders the proof Wall but does **not** change the
  ProofCard — the customer's quote/face stays the largest, warmest element; warmth chrome (the sort
  control / any indicator) stays quiet.
- **Port, don't redesign (P-V)**: ported from `/design-reference` B3, which is the **inbox (screen 02)
  with Warmest active** — the existing Wall re-ordered. B3 makes the **already-rendered** "Warmest —
  coming soon" sort option real; no new layout. If a per-proof indicator is chosen (Q2) and the
  reference shows none prominently, the indicator is a **minimal additive** on-token annotation, raised
  here, not a redesign (P-XII).
- **Fixtures-first (P-VI)**: computed and demonstrated on the existing fixtures (which already include a
  born-then-withdrawn proof/clip and varied completeness); warmth reads the same owned facts real data
  carries. No schema change.
- **Consent (P-VII)**: warmth reuses the shared `effectiveConsentState`; withdrawn proof ranks cold and
  stays visible; the inbox stays unfiltered; **no new gate**, no change to the generation/withdrawal
  gates or the cascade.
- **No editor (P-VIII)**: N/A — warmth adds no studio/timeline/scrubber; it is a sort over a list.
- **Scope (P-IX, P-XI)**: one vertical slice — the inbox re-ordered by a real warmth signal. No
  scoring of clips/showcase, no campaign prioritisation, no recommendations engine, no stored ranking —
  those are out of scope.
- **Microcopy (P-XI)**: warmth copy avoids "amazing"/"awesome" and emoji and never over-claims a
  predictive/engagement power; it says content-readiness.

## Clarifications to resolve *(blocking — human decision, the B1/B2/B4 Q-pattern)*

Surfaced, not assumed. Leans noted where the user gave one.

### Question 1: Signal composition — which owned signals compose warmth (and does it include un-tapped)?

**Context**: Three signals (recency, completeness, consent) are **already on `ProofView`**; **un-tapped**
(clip status per proof) is **not** projected by `getProofs` and needs an additive read-time annotation.
This is the scope/mechanism fork.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **All four**: completeness + un-tapped + recency, with **consent as the gate** | The fullest "content-readiness" signal. Needs the additive clip-status annotation (FR-011) — a read-time, byte-stable add. |
| B | **Three, no un-tapped**: completeness + recency, consent-gated | Pure client-side compute from fields the inbox already has — no extra read. Loses the "already-harvested vs untapped" nuance. |
| C | **Consent-gate + recency only** (completeness implicit via type) | Simplest; closest to "Newest with withdrawn sunk". Weakest as a true content-readiness signal. |
| Custom | Your own composition / weighting | Must stay within the owned palette (FR-002). |

**Lean**: not pre-assumed (the user named all four as the palette but left composition open). A is the
fullest honest signal; B avoids the extra read. **Your choice**: _____

### Question 2: Presentation — sort-order only, honest bands, or a precise score?

**Context**: The B3 reference shows warmth as an **active sort that reorders the Wall**, with no
prominent per-card number. A precise score risks false precision / reading like a fabricated metric.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Sort order only** (no per-proof number/badge) | Most honest, closest to the reference; warmth is purely the ordering. No indicator to mis-read. |
| B | **Coarse honest bands** (e.g. warm / medium / cool) | A light, on-token per-proof cue that aids scanning without false precision; FR-010 applies. |
| C | **A precise score** (e.g. 0–100) | Highest false-precision risk; reads like a metric we don't have — discouraged by the honesty fence. |
| Custom | Your own | — |

**Lean (user)**: A or B — a precise number risks false precision even when computed. **Your choice**: ___

### Question 3: Interaction & default — how is warmth invoked, and what's the default order?

**Context**: The inbox already has a Sort control (Newest working, Warmest disabled). B3 makes Warmest
real; the default order and whether Warmest becomes the default are open.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Toggle, default stays Newest** | Smallest change; the user opts into Warmest. Predictable; warmth is a deliberate lens. |
| B | **Toggle, default becomes Warmest** | Leads with "where to act" — matches the slice's intent — but changes the inbox's default order from today's Newest. |
| Custom | Your own (e.g. remember last choice) | — |

**Lean**: not pre-assumed. **Your choice**: _____

## Assumptions

- The actor is the workspace owner (the only role in the fixtures/stub session today).
- Warmth is **read-time / render-time** computed; **no** stored warmth column and **no** schema change
  (the user's stated preference; confirmed in scope). The exact mechanism (client-side compute from
  projected fields vs. an additive read for clip status) is a **plan-stage** decision, bounded by Q1.
- `getProofs` stays **unfiltered** and its `ProofView` shape **byte-unchanged**; warmth layers on the
  inbox's existing in-memory filter/sort derivation (the same client island that owns Newest today).
- Recency uses the proof's existing capture/created timestamp already on `ProofView`; completeness uses
  the existing quote / transcript / media presence; consent uses the existing effective consent state.
- No new dependency; computation is plain arithmetic/ordering over owned fields.
- Warmth orders proof only — it does not extend to clips, the showcase, campaigns, or recommendations
  (out of scope for this slice).
