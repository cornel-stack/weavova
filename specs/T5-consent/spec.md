# Feature Specification: Consent surface (the live control for the consent backbone)

**Feature Branch**: `T5-consent`

**Created**: 2026-06-21

**Status**: Draft — **3 clarifications OPEN** (see "Clarifications to resolve"). Do **not** `/speckit-plan`
until Q1–Q3 are answered by the human.

**Tier**: T5 — Remaining workspace surfaces (T5-Consent; the consent rail destination — the first T5
slice after T4 closed).

**Input**: User description: "T5-Consent — Consent surface: a real management view over the consent
model that already drives every surface, plus a live record-withdrawal action. … This RECORDS the
customer's withdrawal — the brand keeping an honest ledger of the customer's wishes — it is NOT the
brand 'revoking' on the customer's behalf."

**Ported from**: `/design-reference/Weavova/The Workspace/13 _ Consent _ rights _app_consent` (screen
13). Screen 13 is a **consent ledger table** — Customer · Consent (purpose + version, e.g. "Marketing
use · v2") · Captured (date) · Status (Granted / Awaiting / Revoked) — with **status filter chips**
(All / Granted / Awaiting / Revoked). The **ledger is a faithful port**. Screen 13 does **not** depict
a per-proof **history timeline**, **made-under-consent provenance**, or the **record-withdrawal action
+ cascade-preview confirm** — those are this slice's additions; per **P-XII** they are **documented
derived surfaces** (built from on-token patterns), raised here rather than invented as a redesign.

---

## Overview

The consent model has **gated every surface all session** — `effectiveConsentState` decides what the
inbox shows, what the Library/showcase/clip-detail withhold, what the dashboard counts, what export
skips, and how warmth ranks — yet it has never had **a surface of its own**. Withdrawal has existed
only as the seeded **Leo M.** fixture. T5-Consent makes the **backbone visible** and makes **recording
a withdrawal a live, any-(granted)-proof capability** — the consent surface becomes the **live control
for P-VII**.

**What it shows (real owned consent data, workspace-scoped):**
- **The consent ledger** — every proof's consent record with its **current effective state** (granted
  / awaiting / withdrawn), ported from screen 13 (Customer · purpose + version · captured · status,
  with the status filter chips).
- **Per-proof history** — the **retained version timeline** (e.g. *v1 granted @t → v2 withdrawn @t*).
  "Pull, don't destroy" made visible: superseded/withdrawn versions are **shown, never erased**.
- **Made-under-consent provenance** *(Q2)* — for each clip, **which consent version it was generated
  under** — connecting the ledger to the assets it governs.

**The centerpiece mutation — record a withdrawal (the honest semantics are the heart of the slice):**
- The action **records that the customer has withdrawn consent** — the brand keeping an **honest
  ledger of the customer's wishes**. It is **NOT** the brand "revoking" on the customer's behalf; the
  copy must read as *recording the customer's withdrawal*, never a brand-side revoke.
- Mechanically it writes a **new withdrawn consent version** through the **existing model** (the
  established "new version, never a delete" mechanism) and reuses the **shared `effectiveConsentState`**
  — **no new gate, no new consent mechanism**. Prior versions are **retained for audit**.
- **No re-grant / un-withdraw action.** Once a customer withdraws, re-consent is **theirs** to give
  through a real capture/request flow (T7) — never a brand-side toggle. A unilateral brand re-grant
  would **misrepresent how consent works** (the *spirit* of P-VII, not just its mechanism). The demo
  resets via **re-seed** (honestly resetting fixtures, not feigning re-consent).

**Why the cascade is free — and the byte-stability that follows.** Because **every surface already
reads effective consent at read time**, a recorded withdrawal **ripples through all of them with zero
changes to any**: the inbox shows withdrawn, the Library drops the clip, the dashboard count adjusts,
export skips it, warmth ranks it cold, the showcase and clip-detail withhold it. The consent surface
is simply the **live control** wired to the mechanism that already exists.

**Byte-stable.** `effectiveConsentState` / `latestConsentState` / `getGrantedConsentId` and **every
consuming surface** — inbox / `ProofCard`, Library, dashboard, export, warmth, showcase, clip detail,
proof detail, `generateClip`, `generateBatch` — stay **byte-unchanged**. The **nav rail** stays
byte-stable (the `/app/consent` destination already exists in it). The slice adds **only**: the
`/app/consent` route, additive **ledger / history (+ provenance)** reads, and the **record-withdrawal**
action.

**No schema change.** The `consent` table + its version model already exist; the action writes an
**existing-shape** row (a new withdrawn version); the reads are additive. **No new dependency, no new
gate, no new consent mechanism** — confirmed in scope.

> **Wording note (data vs honest copy):** the stored consent state enum is `revoked`; this surface's
> **copy frames it honestly as the customer having *withdrawn*** ("withdrew", "withdrawn"), and the
> action is **"Record withdrawal,"** never "Revoke." No data/enum change — a copy choice (Assumptions).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See the consent ledger and per-proof history (Priority: P1)

A workspace owner opens `/app/consent` and sees, for every proof, its current effective consent state
and — per proof — the retained version timeline showing exactly how consent changed over time.

**Why this priority**: This makes the backbone **visible** — the MVP. The ledger + retained history is
the "pull, don't destroy" story rendered from real owned data; it stands alone with value even before
the mutation.

**Independent Test**: Open `/app/consent`; confirm the ledger lists every proof with its current
effective state (granted / awaiting / withdrawn) and the status filter chips work; open a proof's
history and confirm the full retained version timeline (including any withdrawn version) is shown.

**Acceptance Scenarios**:

1. **Given** the workspace's proofs, **When** the owner opens `/app/consent`, **Then** the ledger lists
   each proof with customer, consent purpose + current version, captured date, and **current effective
   state**, with working All / Granted / Awaiting / Withdrawn filters.
2. **Given** a proof with a withdrawal in its past (e.g. the seeded Leo M.), **When** the owner views
   its history, **Then** the **full retained timeline** is shown (e.g. *v1 granted → v2 withdrawn*) —
   superseded/withdrawn versions visible, never erased.
3. **Given** the ledger, **When** it renders, **Then** every value is **real owned consent data**
   (state, version, dates) — no fabricated field (FR-019).

---

### User Story 2 - Record a customer's withdrawal, with an honest cascade preview (Priority: P1)

For a currently-granted proof, the owner records that the customer has withdrawn consent. Before
committing, the surface shows an **honest cascade preview** of what the withdrawal will withhold (the
proof and N clips from Library / showcase / export — retained, not deleted). On confirm, a new
withdrawn version is written and every surface reflects it.

**Why this priority**: This is the live control for P-VII — the slice's defining capability. The
cascade preview is the A-11 honesty: the control **shows its effect** before acting.

**Independent Test**: For a granted proof, start "Record withdrawal"; confirm the preview names the
proof and the count of clips that will be withheld (retained, not deleted); confirm; then verify the
proof now reads withdrawn on the ledger and its clips are withheld from the Library / showcase / export
via the existing reads — with no change to those surfaces.

**Acceptance Scenarios**:

1. **Given** a currently-**granted** proof, **When** the owner activates "Record withdrawal", **Then**
   an **honest cascade preview** is shown — "recording this withdrawal will withhold {customer}'s proof
   and {N} clips from Library, showcase, and export (retained, not deleted)" — **before** anything is
   written.
2. **Given** the preview, **When** the owner confirms, **Then** a **new withdrawn consent version** is
   written through the existing model (prior versions **retained**), and the action genuinely succeeds
   (A-11) — the ledger now shows the proof **withdrawn** with the new version in its timeline.
3. **Given** the recorded withdrawal, **When** the existing surfaces are viewed, **Then** the clip(s)
   disappear from Library / showcase / export, the dashboard count adjusts, warmth ranks the proof
   cold, and the inbox shows withdrawn — **with no change to any of those surfaces** (the free cascade).
4. **Given** the copy throughout, **When** the owner reads it, **Then** it frames the act as
   **recording the customer's withdrawal**, never the brand "revoking" — and there is **no re-grant /
   un-withdraw control** anywhere.

---

### User Story 3 - Connect the ledger to the clips it governs (made-under provenance) (Priority: P2)

*(In scope per Q2.)* The owner can see, for a proof's clips, **which consent version each clip was
made under** — tying the consent ledger to the derived assets it governs.

**Why this priority**: It enriches the audit story (the ledger explains the assets) but the ledger +
history + withdrawal (US1/US2) deliver the slice's core value without it; hence P2.

**Independent Test**: For a proof with clips, view its consent detail; confirm each clip shows the
consent version it was generated under (e.g. "made under v1").

**Acceptance Scenarios**:

1. **Given** a proof with one or more clips, **When** the owner views its consent provenance, **Then**
   each clip shows the **consent version it was made under** (real owned provenance), distinct from the
   proof's current effective version.

---

### Edge Cases

- **Already-withdrawn proof**: "Record withdrawal" is **not offered** (nothing to withdraw); the ledger
  shows it withdrawn with its retained timeline. No re-grant control appears.
- **Awaiting-consent proof**: a withdrawal records nothing meaningful (consent was never granted) —
  the action is **not offered** for non-granted proofs; only currently-**granted** proofs can have a
  withdrawal recorded.
- **Withdrawal of a proof with zero clips**: the cascade preview honestly says "0 clips" (only the
  proof's own visibility changes); the action still works.
- **Concurrent/stale state** (the proof was withdrawn elsewhere between view and confirm): the action
  re-checks current effective state at write time; if already withdrawn, it is a no-op reported
  honestly (no duplicate/fabricated version).
- **Empty workspace** (no proofs): the ledger shows an honest empty state; no error.
- **Withdrawn versions in history**: always shown (retained); never hidden or deleted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a `/app/consent` surface (the existing rail destination) showing a
  **consent ledger** of every workspace proof — customer, consent purpose + current version, captured
  date, and **current effective state** (granted / awaiting / withdrawn) — with working status filters.
- **FR-002**: The system MUST show, per proof, the **retained version history timeline** (e.g. *v1
  granted @t → v2 withdrawn @t*). Superseded and withdrawn versions MUST be **shown, never erased**
  ("pull, don't destroy" — P-VII).
- **FR-003**: The system MUST let the owner **record a customer's withdrawal** for a currently-**granted**
  proof, writing a **new withdrawn consent version** through the **existing** consent model (a new
  version, **never a delete**); prior versions are **retained for audit**.
- **FR-004**: Before committing a withdrawal, the system MUST show an **honest cascade preview** naming
  the proof and the **count of clips** that will be withheld from Library / showcase / export
  (**retained, not deleted**) — the control shows its effect before acting (A-11).
- **FR-005**: The record-withdrawal action MUST genuinely work (A-11): on confirm it writes the new
  version and the ledger + every consuming surface reflect it. **No dead control.**
- **FR-006**: All copy MUST frame the act as **recording the customer's withdrawal** (the brand keeping
  an honest ledger of the customer's wishes), **never** the brand "revoking" on the customer's behalf.
- **FR-007**: The system MUST NOT provide any **re-grant / un-withdraw / restore** action. Re-consent is
  the customer's to give via a real capture/request flow (T7); the demo resets via re-seed only.
- **FR-008**: The withdrawal action MUST reuse the **shared effective-consent mechanism** — **no new
  gate, no new consent mechanism**. A recorded withdrawal MUST propagate to **all** consuming surfaces
  through their **existing** read-time consent checks, with **no change** to those surfaces (the free
  cascade).
- **FR-009**: The surface MUST show **only real owned consent data** — states, versions, dates,
  provenance — and MUST NOT fabricate any field (FR-019).
- **FR-010**: The slice MUST add **no schema change** (the `consent` table + version model exist; the
  action writes an existing-shape row; reads are additive), **no new dependency**, and keep these
  **byte-stable**: `effectiveConsentState` / `latestConsentState` / `getGrantedConsentId`; the inbox /
  `ProofCard`, Library, dashboard, export, warmth, showcase, clip detail, proof detail, `generateClip`,
  `generateBatch`; and the **nav rail**.
- **FR-011**: *(In scope per Q2)* The system MUST show, per clip, the **made-under consent version**
  (the version the clip was generated under) — real owned provenance, distinct from the proof's current
  effective version.

### Key Entities *(include if feature involves data)*

- **Consent record / version (existing)**: a proof's consent at a point in time — its state (granted /
  awaiting / withdrawn), version number, and effective date. Withdrawal appends a **new version**;
  prior versions are retained. The **current effective state** is the latest version (the shared
  `effectiveConsentState`).
- **Consent ledger entry (read projection)**: one row per proof — customer, consent purpose + current
  version, captured date, current effective state. The ported screen-13 list shape.
- **Consent history (read projection)**: the ordered list of a proof's retained versions — the audit
  timeline.
- **Made-under provenance (existing, surfaced)**: for a clip, the consent version it was generated
  under — already recorded on the derived asset; surfaced here per Q2.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From `/app/consent`, the owner can see every proof's current effective consent state and
  open any proof's **full retained** version timeline — **100%** of withdrawn/superseded versions shown,
  **0** erased.
- **SC-002**: Recording a withdrawal genuinely writes a new withdrawn version and, via the existing
  reads, withholds the proof's clips from Library / showcase / export and adjusts the dashboard/warmth/
  inbox — verifiable on fixtures with **0** changes to those surfaces' code.
- **SC-003**: The cascade preview states the exact proof and clip count to be withheld **before**
  commit in **100%** of withdrawals — **0** silent/unpreviewed withdrawals.
- **SC-004**: There is **no** re-grant / un-withdraw control anywhere on the surface (**0**), and all
  withdrawal copy reads as recording the customer's withdrawal (**0** "revoke on their behalf" phrasings).
- **SC-005**: Every value shown is real owned consent data — **0** fabricated states/versions/dates.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: the ledger leads with the **customer** (name + the customer's
  consent state); the surface is about honoring the customer's wishes — the chrome stays quiet.
- **Port, don't redesign (P-V)**: the **ledger table is ported** from screen 13 (Customer · consent +
  version · captured · status + filter chips). The **history timeline, made-under provenance, and the
  record-withdrawal action + cascade-preview confirm** are **not** in screen 13 → per **P-XII** they
  are **documented derived surfaces** built from on-token patterns (the proof-detail/clip-detail consent
  framing precedent), not invented redesigns.
- **Fixtures-first (P-VI)**: built and demonstrated on the existing fixtures — which already include the
  seeded Leo M. withdrawal (a retained *granted → withdrawn* timeline) and varied states. No schema
  change; the action writes through the existing model.
- **Consent (P-VII)**: this slice **IS** P-VII made visible and operable — consent is visible, versioned,
  revocable, and **retained**; revocation **cascades** through the existing read-time checks; the
  honest semantics (record the customer's withdrawal, no brand-side re-grant, retained for audit) are
  the heart of the slice. **No new gate, no new mechanism.**
- **No editor (P-VIII)**: N/A — no studio/timeline-editor; the "timeline" here is a read-only audit
  history, not an editing surface.
- **Scope (P-IX, P-XI)**: one vertical slice — the consent surface + the record-withdrawal action. No
  re-grant, no new consent capture (T7), no rights/licensing beyond the owned consent record, no
  cross-surface rework (the cascade is free).
- **Microcopy (P-XI)**: copy avoids "amazing"/"awesome" and emoji; it frames withdrawal honestly and
  never over-claims.

## Clarifications to resolve *(blocking — human decision, the B-pattern)*

Surfaced, not assumed. Leans noted (the user gave one for each).

### Question 1: Withdrawal confirm — an honest cascade-preview, or a plain confirm?

**Context**: A recorded withdrawal has wide consequences (it withholds clips across Library / showcase
/ export). A-11 wants the control to show its effect.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Cascade-preview confirm** | Before commit, show "will withhold {customer}'s proof and {N} clips … (retained, not deleted)". Most honest; needs a read of the affected clip count. **(User lean.)** |
| B | **Plain confirm** ("Record withdrawal?") | Simpler; no count read. Less honest about scope; weaker A-11. |
| Custom | Your own | — |

**Lean (user)**: A — the consequence is wide; the control should show its effect. **Your choice**: ____

### Question 2: Provenance — include made-under-consent in v1, or trim for focus?

**Context**: Each clip records the consent version it was generated under (`derived_asset.consentId`).
Showing it ties the ledger to the assets it governs.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Light-include** the made-under version per clip | Connects the ledger to the clips meaningfully; one extra owned-provenance read/field. **(User lean.)** Adds US3/FR-011. |
| B | **Trim** — ledger + history only in v1 | Tighter focus; provenance deferred. US3/FR-011 drop. |
| Custom | Your own | — |

**Lean (user)**: A — light-include; it connects the ledger to the clips. **Your choice**: ____

### Question 3: History depth — full retained timeline, or current + last change only?

**Context**: "Pull, don't destroy" is the point — the retained audit trail.

| Option | Answer | Implications |
|--------|--------|--------------|
| A | **Full version timeline** per proof | The whole retained audit trail (v1 → v2 → …) — the truest "pull, don't destroy". **(User lean.)** |
| B | **Current state + last change only** | Lighter; shows the latest transition but hides earlier versions — weaker audit story. |
| Custom | Your own | — |

**Lean (user)**: A — full timeline; the retained trail is the whole point. **Your choice**: ____

## Assumptions

- The actor is the workspace owner (the only role in the fixtures/stub session today).
- **No schema change**: the `consent` table, its `version`/`state`/date columns, and the
  `derived_asset.consentId` provenance link all exist; the action writes a new **existing-shape** row;
  the ledger/history/provenance reads are additive. **No new gate, no new dependency.**
- **Wording**: the stored state enum value is `revoked`; the surface's copy uses honest **"withdrawn /
  withdrew"** framing and a **"Record withdrawal"** action label — a copy choice, no data/enum change.
- **Record-withdrawal eligibility**: only a proof whose **current effective state is granted** can have
  a withdrawal recorded; already-withdrawn and awaiting proofs are not offered the action.
- The action **re-checks current effective state at write time** (the established pattern) so a
  stale/duplicate withdrawal is an honest no-op, never a second fabricated version.
- The free cascade is **demonstrated**, not re-implemented — the existing consuming surfaces are read
  unchanged; this slice writes the withdrawal and reads the ledger/history/provenance.
- Re-consent / re-grant is **out of scope** (T7 capture/request); demo reset is via re-seed.
