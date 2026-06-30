# Feature Specification: T7.5 — Verification basis (the transaction leg of "Verified real")

**Feature Branch**: `T7.5-verification-basis`

**Created**: 2026-06-30

**Status**: Draft

**Input**: User description: "T7.5 — Verification basis (the transaction leg of 'Verified real'). Completes the second leg of the verified stamp: linking a captured proof to evidence of a real transaction, so 'Verified real customer' becomes EARNED, not aspirational."

## Summary

"Verified real customer" is the product's moat — the persimmon stamp that says *this is a genuine,
consented human, not a synthetic testimonial.* Today the stamp is half-true: the **consent leg** is
real (T7.1 — versioned, revocable, fail-closed scope), but the **transaction leg** is a stub
(`transaction_verified_at` is always null) and `proof.verified` is a static boolean copied from
fixtures. The stamp is asserted, not earned.

This slice wires the second leg and the honest logic that gates the stamp. A verification basis
gains a recorded **source** and **strength**, and — when genuinely evidenced — a confirmed
transaction with a reference. A single sanctioned resolver decides the verified state from both
legs, and **every** surface that shows the stamp reads through it. Where a proof has consent but no
strong-enough transaction basis, it shows an honest in-between state — never a false stamp, never a
dead blank.

This is mostly a **model + stamp-logic slice with a small UI footprint** (the stamp and its states),
not a new screen. Native connectors and webhook population are the **deferred Sources track** — so
the model must *accept* graded bases now, while what can populate a *strong* basis today is limited.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The stamp is earned, not asserted (Priority: P1)

A merchant browsing their proof inbox, proof detail, library, and public showcase sees the "Verified
real customer" stamp **only** on proof that genuinely carries both legs: currently-granted consent
**and** a transaction basis strong enough to meet the verified bar. The seeded demo proofs that were
"verified" before still show the stamp (because they are backfilled with bases that legitimately earn
it), so the demo stays coherent and truthful; nothing newly over-claims.

**Why this priority**: This is the heart of the slice and the product's central integrity claim
(FR-019 / P-XIV). If the stamp can appear without a genuine basis, the moat is fake. The resolver +
two-leg truth is the MVP — everything else builds on it.

**Independent Test**: Open the proof inbox, a proof detail, the library, and the public showcase on
fixtures. Every place the stamp renders, it corresponds to a proof whose resolver result is `true`
(granted consent + qualifying basis). Seeded verified proofs (Darnell, Maria, Aisha, Hannah, Greta)
still show the stamp; a capture-link proof with only a weak basis does not.

**Acceptance Scenarios**:

1. **Given** a proof with currently-granted consent and a basis whose strength meets the verified
   bar, **When** any surface renders it, **Then** the "Verified real customer" stamp shows.
2. **Given** a proof with granted consent but only a weak/unverified basis, **When** any surface
   renders it, **Then** the stamp does NOT show.
3. **Given** the seeded fixtures after backfill, **When** the proof inbox renders, **Then** exactly
   the proofs that were verified before (and only those) still show the stamp — the swap from static
   boolean to resolver is byte-stable for the demo's verified set.
4. **Given** any surface in the regression set, **When** it needs the verified state, **Then** it
   obtains it from the single sanctioned resolver and never computes "verified" ad hoc.

---

### User Story 2 - The honest in-between state (Priority: P1)

A merchant looking at a proof that has real, granted consent but no confirmed transaction (e.g. one
captured via a manual link) sees an honest "consent recorded · transaction unconfirmed" treatment —
clearly *not* the verified stamp, and clearly *not* a blank or broken control. The merchant
understands the proof is real and consented but not yet transaction-verified.

**Why this priority**: Honesty in the in-between is as load-bearing as the stamp itself (P-XIII —
no dead controls; P-XII — a designed-gap state is a documented derived state). Most current proof
will sit here until the Sources track lands, so this state must be truthful and legible, not an
accidental absence that reads as "something's wrong."

**Independent Test**: Open a proof that has granted consent and only a weak/absent transaction
basis. Confirm it shows the honest in-between treatment on proof detail (and wherever the stamp
slot exists), and that the treatment is a real, labelled state — not the persimmon stamp and not an
empty gap.

**Acceptance Scenarios**:

1. **Given** a proof with granted consent and no qualifying transaction basis, **When** proof detail
   renders, **Then** an honest in-between treatment appears in the stamp's place (not the verified
   stamp, not blank).
2. **Given** the same proof, **When** the merchant reads the treatment, **Then** it communicates
   that consent is recorded and the transaction is unconfirmed — without inventing a metric or a
   false capability.

---

### User Story 3 - Graded basis, ready for the deferred Sources track (Priority: P2)

The verification basis records the **source** that produced it and a graded **strength**, so that
when native connectors and webhooks land later (the deferred Sources track), a real Shopify order
populates a *strong* basis and a generic webhook a *medium* one — slotting into the same model with
no rework. Today, capture-link and manual proof carry at most a *weak/unverified* basis unless a
genuine transaction reference exists.

**Why this priority**: This guarantees the model is forward-compatible (Fixtures-first / P-VI: the
shape is the contract) without building the deferred connectors now. It is P2 because the grading
mechanism is foundational to US1's resolver but is demonstrated through US1/US2 outcomes; its
distinct value is future-readiness.

**Independent Test**: Inspect the backfilled fixtures: seeded verified proofs carry a strong/medium
basis with a recorded source and (where evidenced) a transaction reference; capture-link proofs
carry a weak/unverified basis. Confirm the resolver's verified bar applied to these graded bases
reproduces the intended verified set, and that adding a hypothetical strong basis to a currently-
unverified proof would flip it to verified with no schema change.

**Acceptance Scenarios**:

1. **Given** a basis recorded from a native-connector source with a confirmed transaction, **When**
   the resolver evaluates it (consent granted), **Then** the proof is verified.
2. **Given** a basis recorded as a manual merchant assertion with no confirmed transaction, **When**
   the resolver evaluates it, **Then** the proof is NOT verified.
3. **Given** the model after this slice, **When** a future native connector writes a strong basis to
   an existing proof, **Then** no schema change is required for that proof to become verified.

---

### Edge Cases

- **Withdrawn consent + strong transaction (P-VII boundary)**: A proof whose consent is revoked
  (Leo M.) MUST NOT be verified even with a strong, confirmed transaction basis — consent is
  necessary. The resolver returns `false`.
- **Awaiting consent + strong transaction**: Same — not verified until consent is granted.
- **Granted consent + no basis row at all**: Honest in-between state (treated as no qualifying
  basis), never verified, never blank.
- **Strong basis present but transaction reference missing**: A basis claiming strong/confirmed
  strength without an actual confirmed transaction marker MUST NOT earn the stamp (the strength
  claim alone cannot over-ride the requirement for genuine evidence — FR-019).
- **Consent re-granted after a withdrawal**: Verified state follows the *current* consent leg, so a
  re-grant (new version) with a qualifying basis re-earns the stamp.
- **A clip surfaces a verified mark inherited from its source proof**: The clip's mark MUST reflect
  the source proof's resolver result at read time (consistent with how withdrawn-consent clips
  already drop out), not a stale copy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The verified state of a proof MUST require BOTH legs to be true: (1) the proof's
  **current** consent is granted (T7.1, unchanged), AND (2) the proof has a transaction basis whose
  recorded **strength meets the verified bar**.
- **FR-002**: The system MUST expose a **single sanctioned resolver** (`proofIsVerified`) as the
  sole way any surface determines verified state. No surface may compute "verified" ad hoc.
  `proof.verified` ceases to be a static stored truth and is derived through this resolver.
- **FR-003**: A verification basis MUST record its **source** (what produced it) and a graded
  **strength**.
- **FR-004**: Basis strength MUST be graded into at least three ordered levels — **strong**
  (a system-confirmed transaction from a native connector), **medium** (a generic webhook payload),
  and **weak/unverified** (a manual merchant assertion or a plain manual link with no confirmed
  transaction).
- **FR-005**: The stamp MUST NEVER over-claim (FR-019 — the moat). A basis that is merely a
  merchant's unverified assertion MUST NOT be treated as a system-confirmed transaction, and MUST
  NOT earn "Verified real customer." A weaker or absent basis yields an honest lesser state, never a
  false stamp.
- **FR-006**: When a transaction is genuinely evidenced, the basis MUST record the moment it was
  confirmed (`transaction_verified_at`) and a **transaction reference** identifying the evidence.
  **Resolved (Q2 → A)**: with native connectors and webhook ingestion deferred to the Sources track
  (T7.4+), **nothing on a live path can produce a strong or medium basis in this slice.** A proof
  captured today via the link/manual path therefore carries **at most a weak basis** — its
  `capture_request.transaction_ref` is recorded only as context, never as confirmation (FR-005) —
  and shows the honest unverified in-between state, **not** the stamp, until Sources land. This is
  the intended, truthful outcome: a stamp that means something beats a stamp on everything.
  Strong/medium bases are populated **only by backfilled fixtures** that model future Sources output
  (P-VI), so verified-state stays demonstrable in the demo without any live path over-claiming.
- **FR-007**: A proof with granted consent but no transaction basis at or above the verified bar
  MUST display an **honest in-between state** — neither the verified stamp nor a blank/dead control.
  **Resolved (Q3 → A, sharpened by Step 0)**: the design reference contains **no** unverified/
  pending badge anywhere — the designer's model is binary (stamped or unmarked). The in-between is
  therefore **quiet**, derived minimally from that binary model (a documented derived state, P-XII),
  never a new competing badge:
  - **On dense cards** (proof inbox, library, showcase): **plain absence of the stamp** — no badge.
    The stamp's absence IS the signal. No invented "unverified" badge that would clutter cards or
    dilute the scarce persimmon stamp (P-IV).
  - **On proof detail only** (where there is room): a quiet labelled state —
    "Consent recorded · transaction unconfirmed" — explicit but unobtrusive, **no persimmon**.
- **FR-008**: A proof whose current consent is NOT granted (awaiting or revoked) MUST NOT be
  verified regardless of transaction basis strength (P-VII). The consent leg is necessary.
- **FR-009**: Existing fixtures MUST be backfilled with honest bases so the demo stays coherent and
  truthful: the seeded proofs that were "verified" receive a basis that **legitimately earns** the
  stamp under the resolver; all other proofs receive an honest lesser basis (or none) that does not.
- **FR-010**: Every surface currently reading `proof.verified` MUST route through the resolver and
  remain **byte-stable** in output, except where the honest in-between state newly appears for a
  proof that previously showed nothing. (See Regression Surface.)
- **FR-011**: The model MUST **accept graded bases now** so that the deferred native connectors and
  webhook ingestion can populate a strong/medium basis later **without schema rework** — the strong-
  source population itself is out of scope for this slice.
- **FR-012**: Capture-link / manual proof produced by T7.2/T7.3 MUST carry **at most** a weak/
  unverified basis unless a genuine transaction reference exists; it MUST NOT be silently promoted
  to verified.
- **FR-013**: The verified bar (which strength level(s) earn the stamp) MUST be a single defined
  threshold used by the resolver. **Resolved (Q1 → A)**: the bar is **strong OR medium** — a
  system-confirmed transaction (native connector), or a webhook-evidenced one — and **NEVER**
  weak/manual. **This is the product's integrity line and it is drawn here, not slid.** The FR-019
  rationale, recorded explicitly so it survives: a merchant-typed transaction reference is an
  **assertion, not a confirmation.** Letting an assertion earn "Verified real" would make the stamp
  mean *"someone said so"* — which over-claims and poisons the product's core trust claim (the moat
  is that the stamp means a genuine, system-evidenced transaction behind a consented human). Weak/
  manual bases are recorded honestly but sit below the bar; they never earn the stamp.
- **FR-014**: The capture/public surfaces under `/c/[token]` MUST remain untouched by this slice
  (consistent with the T7.2/T7.3 integration guard); if any edit there appears necessary, STOP and
  raise it.

### Key Entities *(include if data involves data)*

- **Verification basis** (extended): the record of *why* a proof can earn "Verified real." Already
  carries the proof reference, the originating request reference, the **consent leg**
  (`consent_captured_at`, real). This slice adds the **transaction leg**: a recorded **source**, a
  graded **strength**, and — when evidenced — `transaction_verified_at` plus a **transaction
  reference**.
- **Basis strength** (graded value): an ordered classification — strong / medium / weak (unverified)
  — expressing how genuinely the basis evidences a real transaction. Drives the verified bar.
- **Basis source** (classification): what produced the basis — native connector, webhook, or manual
  entry / manual link — connecting "source quality feeds the verified bar." Native + webhook are the
  deferred Sources track.
- **Verified-state resolver** (`proofIsVerified`): not a stored entity but the single sanctioned
  function combining the consent leg and the transaction-basis strength into the verified state that
  every surface reads. Replaces the static `proof.verified` truth at read time.
- **Transaction reference**: the identifier of the evidence for a confirmed transaction (e.g. an
  order id or equivalent) recorded on the basis when the transaction leg is genuinely satisfied.

## Resolved Decisions

> The three open questions are resolved **A / A / A** (`/speckit.clarify`, 2026-06-30). The reasoning
> is written in below, not just the picks — the verified-bar decision is the product's integrity line
> and the "why" must survive into plan and implementation.

### Decision 1 — The verified bar = **strong OR medium**, never weak/manual *(Q1 → A)*

**The bar**: a proof earns "Verified real customer" only when its basis strength is **strong**
(a system-confirmed transaction from a native connector) **or medium** (a webhook-evidenced
transaction). A **weak/manual** basis NEVER earns the stamp. (See FR-013.)

**Why — the integrity line, drawn here and not slid (FR-019 / P-XIV)**: a merchant-typed transaction
reference is an **assertion, not a confirmation.** If an assertion could earn "Verified real," the
stamp would come to mean *"someone said so"* — and a stamp that means "someone said so" over-claims
and poisons the product's core trust claim. The entire moat is that the stamp means a *genuine,
system-evidenced transaction* standing behind a *consented human*. So the bar requires evidence the
system can stand behind (native confirm or webhook), and it is fixed at this slice — not a threshold
to be relaxed later for convenience. Weak/manual bases are still recorded honestly; they simply sit
below the bar.

### Decision 2 — Nothing live earns the stamp yet; that is the correct, truthful outcome *(Q2 → A)*

With native connectors **and** webhook ingestion deferred to the Sources track (T7.4+), **nothing on
a live path can produce a strong or medium basis in this slice.** The consequence — stated plainly as
the intended outcome, not softened: a proof captured **today** via the link/manual path shows the
**honest unverified in-between state, NOT the stamp**, until Sources land. This is by design and is
truthful — **a stamp that means something beats a stamp on everything.**

- **Fixtures** carry strong/medium qualifying bases (shaped like future Sources output, P-VI) so the
  verified state is fully demonstrable in the demo.
- **Live capture-link/manual proof** carries at most a **weak** basis; its
  `capture_request.transaction_ref` is recorded only as context, never as confirmation (FR-005).
  No live path fabricates a strong/medium basis. (See FR-006, FR-012.)

### Decision 3 — The in-between is **quiet**: absence on cards, a label on detail *(Q3 → A, sharpened by Step 0)*

**Step 0 finding (decisive)**: the design reference has **no** unverified/pending/consent-only badge
anywhere — confirmed across proof inbox 02, proof detail 03, public showcase, dashboard, and the auth
proof panels. The designer's model is **binary: stamped or unmarked.** The honest in-between is
therefore derived *minimally* from that binary model (a documented derived state, P-XII) and is
**quiet — never a new competing badge**:

- **On dense cards** (proof inbox, library, showcase): **plain absence of the stamp.** No badge —
  the stamp's absence IS the signal. We do **not** invent an "unverified" badge that would clutter
  cards or dilute the scarce persimmon stamp (P-IV).
- **On proof detail only** (where there is room): a quiet labelled state —
  **"Consent recorded · transaction unconfirmed"** — explicit but unobtrusive, **no persimmon**.

This keeps persimmon reserved for the earned stamp and the binary model intact, while giving the one
surface with room an honest explanation of *why* a real, consented proof is not stamped. (See FR-007.)

### Cross-cutting confirmations (carried into plan)

- **`proofIsVerified` is the SOLE sanctioned verified-state read.** All **11** enumerated
  `proof.verified` read sites (and the named view types — `ProofView`, `ProofDetailView`,
  `LibraryClipView`, `ClipDetailView`, `PostTextPackage`) route through it. Output is **byte-stable**
  except where the in-between newly shows — which is exactly *stamp absence on cards* and the *quiet
  label on detail*. (See FR-002, FR-010, Regression Surface.)
- **P-VII boundary (SC-004)**: the resolver is **consent AND basis**. A withdrawn-consent proof
  (Leo M.) is **NOT verified even with a strong transaction basis** — consent is necessary, never
  sufficient-by-transaction. (See FR-008.)
- **Backfill**: the 5 seeded verified fixtures (Darnell W., Maria L., Aisha K., Hannah P., Greta S.)
  receive bases that **legitimately earn** the stamp under the strong/medium bar; all other proofs
  receive an honest lesser basis (or none) that does not. (See FR-009.)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of "Verified real customer" stamp renders across all surfaces correspond to a
  proof whose resolver returns `true` (both legs satisfied) — zero stamps on proof lacking a
  qualifying basis or current consent.
- **SC-002**: The backfilled demo is byte-stable for its verified set — the exact set of proofs that
  showed the stamp before this slice still shows it after, and no previously-unverified proof newly
  shows it.
- **SC-003**: 100% of the enumerated regression surfaces (proof card, proof detail, dashboard hero,
  showcase proof + clip, clip studio, clip detail, library card, export attribution) obtain verified
  state through the single resolver — none compute it independently.
- **SC-004**: A withdrawn-consent proof (Leo M.) is shown as NOT verified even when given a strong,
  confirmed transaction basis — the consent leg is demonstrably necessary.
- **SC-005**: Adding a strong basis to a currently-unverified proof flips it to verified with no
  schema change — demonstrating the model accepts graded bases for the deferred Sources track.
- **SC-006**: Every proof with granted consent but no qualifying basis presents the honest in-between
  state (Decision 3 — plain stamp absence on cards, the quiet "Consent recorded · transaction
  unconfirmed" label on detail) — none render as a blank/dead control.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: Unchanged — the verbatim quote / real face stays the largest,
  warmest element on every proof surface. This slice only governs whether the small persimmon stamp
  shows; it never enlarges chrome or competes with the customer.
- **Port, don't redesign (P-V)**: The verified stamp is ported as-is ("Verified real customer",
  persimmon `BadgeCheck`) across proof inbox 02, proof detail 03, public showcase, dashboard, library.
  The design reference has **no** pending/unverified state — its model is binary (stamped or
  unmarked). The in-between is resolved (Decision 3) as a **quiet documented derived state** (P-XII):
  plain stamp absence on cards, a non-persimmon "Consent recorded · transaction unconfirmed" label on
  detail only — not an invented badge.
- **Fixtures-first (P-VI)**: Built and demonstrated on fixtures shaped exactly like the real schema;
  the backfilled basis fixtures (source + strength + transaction reference) ARE the schema contract
  for the deferred Sources track. No rework when real connectors land.
- **Consent (P-VII)**: The consent leg is unchanged and remains necessary — withdrawn/awaiting
  consent is never verified regardless of transaction strength (FR-008, SC-004). Revocation cascade
  and versioning from T7.1 are untouched.
- **No editor (P-VIII)**: N/A — no studio/format surface in scope.
- **Scope (P-IX)**: A single vertical slice — the transaction leg + the resolver + honest in-between
  + fixture backfill. Native connectors and webhook population are explicitly deferred (Sources
  track); no speculative connector work.
- **Microcopy (P-XVII)**: Any in-between label is plain and editorial ("Consent recorded ·
  transaction unconfirmed"-style); no hype adjectives, no emoji.
- **Port-completeness (P-XIII)**: The in-between is an honest, labelled state behind the same stamp
  seam — not a dead control. The deferred strong-source population is honestly absent, not faked.
- **Owned data only (P-XIV / FR-019)**: THE central principle here. The stamp reflects only
  genuinely-evidenced two-leg state; a merchant assertion alone never earns it (FR-005). No
  fabricated verification, no invented confirmation.
- **Plan-not-code (P-XV)**: N/A — non-render slice.
- **No-LLM-in-render (P-XVI)**: N/A — non-render slice.

## Regression Surface

Every surface that currently reads `proof.verified` (or a `verified` flag derived from it) must
route through the resolver and stay byte-stable, except where the honest in-between newly shows:

| # | Surface | File (read site) |
|---|---------|------------------|
| 1 | Proof card (inbox/dashboard wall) | `src/components/proof-card.tsx` |
| 2 | Proof detail meta panel | `src/components/app/proof-detail/proof-detail-meta.tsx` |
| 3 | Dashboard hero (latest proof) | `src/components/app/dashboard/dashboard-hero.tsx` |
| 4 | Showcase item — proof variant | `src/components/app/showcase/showcase-item.tsx` |
| 5 | Showcase item — clip variant (inherits proof verified) | `src/components/app/showcase/showcase-item.tsx` |
| 6 | Clip studio (source-proof mark) | `src/components/app/clip-studio/clip-studio.tsx` |
| 7 | Clip detail (source-proof mark) | `src/components/app/clip-detail/clip-detail.tsx` |
| 8 | Library clip card | `src/components/app/library/library-clip-card.tsx` |
| 9 | Export attribution ("verified customer") | `src/lib/export.ts` |
| 10 | Query projections feeding the above | `src/db/queries.ts` (proof + clip reads) |
| 11 | Seed / fixtures (`verified` flag → backfilled bases) | `src/db/seed.ts` |

Types carrying `verified` that consumers read: `ProofView`, `ProofDetailView`, `LibraryClipView`,
`ClipDetailView`, `PostTextPackage` (`src/lib/proof.ts`, `src/lib/clip.ts`, `src/lib/export.ts`).

**P-VII interaction (must hold)**: A withdrawn-consent proof (Leo M.) is NOT verified even with a
strong transaction basis — consent is necessary (SC-004).

## Assumptions

- **Settled decisions (do not re-open)**: Two legs, both required; the consent leg is T7.1
  (unchanged) and this slice delivers the transaction leg + the resolver. The stamp never
  over-claims (FR-019). Native connectors / webhook population are the deferred Sources track — the
  model accepts graded bases now; strong-source population comes later. `proofIsVerified` is the sole
  sanctioned verified-state read.
- **Resolved at clarify (A/A/A, 2026-06-30 — see Resolved Decisions)**: the verified bar is
  **strong OR medium**, never weak/manual (an assertion is not a confirmation); nothing on a live
  path can earn the stamp this slice (Sources deferred), so live link/manual proof shows the honest
  unverified in-between until T7.4+; the in-between is **quiet** — plain stamp absence on cards, a
  non-persimmon "Consent recorded · transaction unconfirmed" label on proof detail only.
- The five seeded proofs currently flagged `verified: true` (Darnell W., Maria L., Aisha K., Hannah
  P., Greta S.) are the demo's "earned" set; backfill gives each a basis that legitimately meets the
  bar (modelling their native-ish sources). All others receive an honest lesser/absent basis.
- `capture_request.transaction_ref` and `customer_email` already exist (T7.2/T7.3) and are the only
  transaction-adjacent context carried by the live capture path; no new live ingestion is built here.
- The verification basis already exists as a stub (`consent_captured_at` real,
  `transaction_verified_at` null); this slice is **additive** to it (source, strength, transaction
  reference) plus the resolver — no change to the consent leg or to `/c/[token]`.
- This slice has a small UI footprint (the stamp slot and its in-between state); it does not add a
  new screen or nav entry.
