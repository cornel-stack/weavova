# Feature Specification: Batch studio (bulk clip generation)

**Feature Branch**: `T4-B1-batch-studio`

**Created**: 2026-06-18

**Status**: Draft — **clarifications RESOLVED** (human decision, 2026-06-18): **Q1→A** one batch format;
**Q2→A** non-granted un-selectable up front ("needs consent"; "Select all ready" = granted) **with a
per-proof re-check at generate** (the revoked-after-select race); **Q3→A** inline selection-action bar +
honest per-proof summary, no new route. Folded into the requirements below. Ready for `/speckit.plan`.

**Tier**: T4 — Bulk & exports (T4-B1 — Batch studio; the first T4 slice, the demo's "it scales" moment).

**Input**: User description: "T4-B1 — Batch studio (bulk clip generation). Generate clips from many proofs at
once — extends the T2.4b studio to a batch and wires the inbox's currently-hidden selection cluster."

**Ported from**: `/design-reference/Weavova/Bulk & exports/B1 _ Batch studio  _one recipe _ many clips_`
(B1) — which renders the **proof inbox (screen 02) in selection mode**: a "Make clips" action, "Select all
ready", per-card selection, and — tellingly — **non-granted proof shown as "needs consent" instead of
"Make"** (e.g. Leo M.). **Extends** the T2.4b studio (`specs/T2.4b-clip-studio/`) to a batch, and **wires the
cluster T2.2 deferred** (`specs/T2.2-proof-inbox/` FR-014c: "Make clips" / "Select all ready" / per-proof
selection deferred *as a unit to T4*, because selection needs a control the byte-unchanged ProofCard doesn't
carry).

---

## Overview

The Batch studio is the **"one recipe, many clips"** moment: select many proofs in the inbox and generate a
clip from each in one action — the bulk form of the T2.4b studio's Generate. It is the demo's proof that the
loop **scales**: capture → review → (batch) transform → distribute.

It does two coupled things. **(1) Wires the inbox's hidden selection cluster** — the per-proof selection,
"Select all ready", and "Make clips" that T2.2 deliberately deferred to T4 now have a home. **(2) Adds a
batch-generate flow** — from the selection, generate one clip per selected proof, **reusing T2.4b's
machinery** verbatim: the single-attempt insert per proof (D4), the hand-rolled input guard, and the honest
sample/preview stub from the shared `SAMPLE_CLIP_URL` (clips stay sample-stubbed pre-T8 — FR-019).

**P-VII is enforced per proof, at generate.** Each clip is written **only if that proof's effective consent
is `granted`** (reusing `getGrantedConsentId` / the shared `effectiveConsentGranted`); a proof whose consent
isn't granted is **honestly skipped**, never faked. The result reports honestly — **N made, which (if any)
were skipped and why** — no fabricated success, no all-or-nothing fiction (FR-019).

The generated clips **light up the Library, dashboard, and showcase through the existing reads** — **no read
changes** (the same `getLibraryClips` / `getDashboardSummary` / `getShowcase` / `getProofClips` already
withdrawal-filter and count them). Reads stay `withDbRetry`-wrapped; the inserts stay **single-attempt per
proof** (not retry-wrapped — D4).

**No schema change** (reuses `derived_asset`). **No new dependency.** **ProofCard stays byte-unchanged** — the
selection control is added **around** it (a sibling overlay, like the inbox's stretched-link nav), never
inside it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select proofs and batch-generate clips (Priority: P1)

A workspace owner enters selection in the inbox, picks several consented proofs (or "Select all ready"), and
activates "Make clips" — one clip is generated per selected proof, and the result reports how many were made.

**Why this priority**: It is the slice's core value and MVP — bulk generation from a selection, the "it
scales" demo moment.

**Independent Test**: In the inbox, select 2–3 granted proofs, pick a format, activate "Make clips"; confirm
one clip per proof is created (sample/preview), and an honest count of what was made.

**Acceptance Scenarios**:

1. **Given** the inbox, **When** the owner enters selection and selects granted proofs (or "Select all
   ready"), **Then** a selection affordance reflects the chosen proofs and a "Make clips" action is available.
2. **Given** a selection + a chosen format, **When** the owner activates "Make clips", **Then** one clip is
   generated **per selected proof** (the bulk form of T2.4b Generate — single-attempt insert per proof,
   sample/preview stub), and the result reports **N made**.
3. **Given** the batch completes, **When** the clips are written, **Then** they appear on the Library,
   dashboard, and showcase via the **existing reads** (no read change), each an honest sample/preview.

---

### User Story 2 - Consent is enforced per proof; non-granted is honestly skipped (Priority: P1)

When the batch runs, each proof's **current** effective consent is re-checked; a proof that isn't granted is
**skipped** (no clip, no fake), and the result says so — which were skipped and why.

**Why this priority**: Consent Is Sacred (P-VII), now at batch scale — the highest-leverage place to leak a
non-consented clip. Honest partial reporting (FR-019) is non-negotiable.

**Independent Test**: Include a non-granted proof in the batch (or revoke one mid-flow); activate "Make
clips"; confirm **no clip** is written for it, it is reported **skipped (needs consent)**, and the granted
ones still succeed.

**Acceptance Scenarios**:

1. **Given** a batch including a proof whose effective consent is not `granted`, **When** "Make clips" runs,
   **Then** **no `derived_asset`** is written for that proof; it is reported **skipped** with an honest reason
   ("needs consent"), and the granted proofs still generate.
2. **Given** the per-proof checks, **When** the batch runs, **Then** each proof's consent is re-read **at
   generate** (reusing `getGrantedConsentId` / the shared gate) — not cached from when it was selected.
3. **Given** the result, **When** it is shown, **Then** it is an **honest per-proof summary** (N made; M
   skipped, each with its reason) — **no** fabricated success, **no** all-or-nothing claim.

---

### User Story 3 - The batch is reliable and reports partial outcomes honestly (Priority: P2)

Each clip's insert is its own single attempt; if some succeed and some skip/fail, the result reflects exactly
that — no batch-wide rollback fiction, no silent failure.

**Why this priority**: At batch scale, partial outcomes are normal; honest reporting is what makes the
feature trustworthy. Secondary to generating + the consent gate.

**Independent Test**: Run a batch where some proofs are granted and one is not (and/or simulate one insert
failing); confirm the per-proof result distinguishes made / skipped / failed, and the made ones persisted.

**Acceptance Scenarios**:

1. **Given** a batch of mixed outcomes, **When** it completes, **Then** the result lists **per proof**
   whether it was **made**, **skipped (needs consent)**, or **failed**, with made clips persisted and others
   not faked.
2. **Given** an insert that fails transiently, **When** the batch runs, **Then** that proof is reported
   **failed** (its insert is a single attempt — not retry-wrapped, D4) and the owner can re-run it; the other
   proofs are unaffected.
3. **Given** a completed batch, **When** the owner returns to the inbox/Library, **Then** the made clips are
   present (via the existing reads) and the counts are honest.

---

### Edge Cases

- **Empty selection**: "Make clips" is unavailable (or a no-op with honest "select some proof first") — no
  empty batch.
- **A proof revoked between selection and generate**: caught by the per-proof re-check → skipped (needs
  consent), not a stale success.
- **All selected proofs non-granted**: the batch makes 0 clips and reports all skipped honestly (no
  fabricated success).
- **Re-running the same selection**: each run is its own set of single-attempt inserts (re-running makes
  another clip per still-granted proof — the studio's per-generate semantics, at batch scale; not deduped).
- **Large selection**: the batch remains honest and bounded; any per-batch cap is explicit and surfaced
  (not a silent truncation).
- **Selection vs navigation**: in selection mode a proof card **toggles selection** rather than navigating to
  the detail (the T2.2 stretched-link nav is suppressed while selecting) — so selecting never accidentally
  leaves the inbox.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (wire the selection cluster)**: The inbox MUST gain the deferred selection cluster — **per-proof
  selection**, **"Select all ready"**, and **"Make clips"** — ported from B1 / screen 02's selection mode.
  The selection control MUST be added **around** the canonical ProofCard (a sibling overlay/affordance, like
  the T2.2 stretched-link nav) — **ProofCard stays byte-unchanged** (it carries no selection prop).
- **FR-002 (selection mode)**: Entering selection MUST let the owner toggle proofs; in selection mode a card
  **toggles selection** instead of navigating to its detail (nav suppressed while selecting). A clear way to
  enter/exit selection and a visible selected-count MUST be present.
- **FR-003 ("Select all ready")**: "Select all ready" MUST select the proofs eligible to generate — the
  **granted** ones (per Q2). It MUST NOT select non-granted proof into a generate set (the design shows
  non-granted as "needs consent", not "Make").
- **FR-004 (batch config — format; Q1)**: The batch MUST expose a **format** for the run (the bulk analog of
  the T2.4b studio's format control). **Default (Q1 = one batch format)**: one format applied to the whole
  batch. (If Q1 = per-proof, each proof carries its own — larger.) No other per-clip config in batch (the
  hook is the studio's single-clip concern; batch uses a sensible non-fabricated default or omits it — see
  Assumptions).
- **FR-005 (batch generate — reuse T2.4b)**: "Make clips" MUST generate **one clip per selected proof** by
  **reusing T2.4b's `generateClip` machinery per proof**: the **single-attempt insert** (D4 — not
  retry-wrapped), the **hand-rolled input guard** (format ∈ `ClipFormat`), and the **honest sample/preview
  stub** from the shared `SAMPLE_CLIP_URL`. It MUST NOT introduce a second, divergent generate path.
- **FR-006 (P-VII per proof, at generate)**: For **each** selected proof, the batch MUST re-read its
  **current** effective consent (reusing `getGrantedConsentId` / the shared `effectiveConsentGranted`) and
  write a `derived_asset` **only if `granted`**; a non-granted proof is **skipped** (no row, honest reason),
  never faked. Consent is checked **at generate**, not cached from selection.
- **FR-007 (honest partial result — FR-019)**: The batch MUST report an **honest per-proof outcome** — **N
  made**, **M skipped** (each with reason, e.g. "needs consent"), and any **failed** — with **no** fabricated
  success and **no** all-or-nothing rollback fiction. Made clips persist; skipped/failed are not faked.
- **FR-008 (no read changes — existing surfaces light up)**: The generated clips MUST surface on the Library,
  dashboard, and showcase **through the existing reads** (`getLibraryClips` / `getDashboardSummary` /
  `getShowcase` / `getProofClips`) — **no read changes**; the batch revalidates the affected paths so they
  reflect the new clips (each withdrawal-filtered + counted honestly as already built).
- **FR-009 (reliability)**: Reads remain `withDbRetry`-wrapped; the per-proof inserts stay **single-attempt**
  (D4 — non-idempotent, not retry-wrapped). A failed insert is reported per FR-007, not silently dropped, and
  does not abort the rest of the batch.
- **FR-010 (the batch surface — Q3)**: The flow MUST be: **select in the inbox → a batch config (pick the
  format) + "Make clips" → bulk generate → the honest per-proof result**. **Default (Q3)**: the config +
  action live in an **inline selection-action bar** in the inbox (no new route); the result is an honest
  per-proof summary shown in place. The exact home/result presentation is set by Q3.
- **FR-011 (states)**: The batch MUST present an on-token **in-progress** state while generating (the
  press-run / a batch progress indicator), recover transparently from a transient read cold start, and show
  the shared **`<ErrorState>`** only on a genuine non-per-proof failure. Per-proof failures are reported in
  the result (FR-007), not as a global error.
- **FR-012 (owned data only — FR-019)**: The selection + batch surfaces MUST show only **owned** values (the
  proof's own data, an honest selected-count, the honest result counts) — no fabricated metric, no fake
  success, no "estimated reach".
- **FR-013 (responsive + keyboard)**: Selection, "Select all ready", the format control, "Make clips", and
  the result MUST be responsive across the Pressroom breakpoints (480 / 1024 / 1280 + 1240 max) and fully
  keyboard-accessible (toggle-select, select-all, format, generate, dismiss — with visible focus).
- **FR-014 (microcopy / honesty)**: Microcopy MUST match B1/screen 02 where it specifies it ("Make clips",
  "Select all ready", "needs consent"), be honest about the sample stub and any skip/fail, and avoid
  "amazing"/"awesome" and emoji (P-XI).
- **FR-015 (scope)**: The slice MUST NOT build: **Warmth sort (B3)**, **upload (B2)**, or **export (B4)** —
  separate T4 slices; the real render engine (T8 — clips stay sample-stubbed); the inbox **List** view (still
  undesigned — T2.2 A-12). It MUST make **no schema change** (reuses `derived_asset`), introduce **no new
  dependency**, keep **ProofCard byte-unchanged**, and keep the existing reads + the T2.4b single-clip studio
  unchanged (the batch reuses `generateClip`'s machinery; it does not alter the single-clip flow).

### Key Entities *(include if feature involves data)*

- **Proof** (existing — T0.3): the selected items; each one's **current effective consent** gates its clip at
  generate (P-VII). Read via the existing inbox read.
- **Consent** (existing — T0.3): re-checked **per proof at generate** via the shared gate; never modified.
- **Derived asset / clip** (existing — T2.4a): one row written per granted proof in the batch (the
  single-attempt insert, sample/preview stub). No schema change.
- **Batch selection + result (transient)**: the client-side set of selected proof ids + the chosen format,
  and the per-proof outcome (made / skipped+reason / failed) the result reports. Not persisted as an entity.
- **NOT modelled here**: any batch/job entity, warmth/sort ranking, upload, export artifact, or success
  metric — later slices / not owned; not fabricated (FR-019, A-11).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From the inbox, an owner selects multiple granted proofs and generates a clip for each in one
  action, in under 30 seconds on the seeded data.
- **SC-002**: **100%** of non-granted proofs in a batch are **skipped** (no `derived_asset` written) and
  honestly reported; **0** clips are made from non-consented proof (P-VII), including consent revoked between
  selection and generate.
- **SC-003**: **0** fabricated outcomes — the result's made/skipped/failed counts match reality exactly; **0**
  all-or-nothing fiction; made clips persist and skipped/failed are not faked (FR-019).
- **SC-004**: The made clips appear on the Library, dashboard, and showcase via the **existing reads** with
  **0** read changes; counts stay honest + withdrawal-filtered.
- **SC-005**: ProofCard is **byte-unchanged** (the selection control is a sibling overlay); the T2.4b
  single-clip studio + `generateClip` machinery are reused, not forked or altered.
- **SC-006**: The batch is responsive at each breakpoint (≤480, 1024, 1280, 1240px max) and fully
  keyboard-operable; an in-progress state shows during generation and a genuine failure shows the shared
  error state.
- **SC-007**: **0** out-of-scope controls render — no Warmth sort, no upload, no export, no List view (A-11).
- **SC-008**: **No schema change**, **no new dependency**.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: Selection chrome stays quiet; the proof cards (the customers' words)
  remain the largest element; the selection overlay is a light affordance, not a takeover.
- **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, R2 sample.
  **No new dependency.** Clips stay sample-stubbed; heavy render off Vercel until T8.
- **Pressroom tokens (P-IV)**: On-token only; persimmon reserved for the primary action ("Make clips") + the
  verified mark.
- **Port, don't redesign (P-V)**: Ported from B1 (the inbox in selection mode) + screen 02. The selection
  action bar / batch config (format) is the bulk analog of the studio's control; the **A-11** rule governs —
  the cluster T2.2 deferred is now wired because its home (this slice) exists. List, warmth, upload, export
  stay deferred (their slices/screens aren't this one). Format/consent/flow ambiguities raised as Q1–Q3.
- **Fixtures-first (P-VI)**: Reuses the existing reads + `derived_asset`; the seed already has granted +
  withdrawn proofs to exercise made vs skipped.
- **Consent (P-VII)**: Re-checked **per proof at generate** via the shared gate — the batch can never write a
  clip for a non-granted proof; non-granted is honestly skipped; the studio's read-time withdrawal still
  governs visibility everywhere after.
- **No editor (P-VIII)**: N/A — batch is select + pick-format + generate; no timeline/editor.
- **Scope (P-IX, P-XI)**: One vertical slice — wire selection + the batch generate + honest result. Warmth/
  upload/export (other T4 slices), the real engine (T8), and List are out of scope. No speculative additions.
- **Microcopy (P-XI)**: Matches B1/screen 02 ("Make clips", "Select all ready", "needs consent"); honest
  about the stub + skips; no "amazing"/"awesome"/emoji.
- **Handling ambiguity (P-XII)**: Format scope, the consent/selection rule, and the batch surface + honest
  result are raised as Q1–Q3 against the named B1/screen-02 references, not guessed.

## Assumptions

- **A-01 (extends T2.4b, reuses its machinery)**: The batch is the bulk form of `generateClip` — same
  single-attempt insert, input guard, and `SAMPLE_CLIP_URL` stub, per proof. The single-clip studio is
  unchanged.
- **A-02 (ProofCard byte-unchanged — selection is a sibling overlay)**: Per T2.2 FR-014c, selection needs a
  control ProofCard doesn't carry; it is added **around** the card (a sibling overlay/checkbox), exactly as
  the stretched-link nav was — ProofCard is not modified.
- **A-03 (one batch format — Q1 default)**: One format for the whole run ("one recipe, many clips"); per-proof
  format is the larger alternative.
- **A-04 (ready = granted; "Select all ready" selects granted)**: Eligibility = effective consent `granted`;
  non-granted shows "needs consent" (B1) and isn't selected into a generate set (Q2 default), with the
  per-proof re-check still enforced at generate.
- **A-05 (honest per-proof result; no all-or-nothing)**: The result is a per-proof summary (made / skipped+
  reason / failed); presentation default = an inline summary in the selection-action bar (Q3). No batch
  rollback semantics (each insert is independent — D4).
- **A-06 (the batch hook default)**: The single-clip studio's editable hook is a per-clip concern; in batch,
  clips are made with a **non-fabricated default** (a brand placeholder or none) — never a fabricated or
  customer-derived hook (render spec §7.4). (Confirm at plan if a batch hook is wanted at all.)
- **A-07 (no new route — Q3 default)**: The flow lives in the inbox (selection + an inline action bar); no
  dedicated batch route, matching B1 being the inbox-in-selection. (Confirm in Q3.)
- **A-08 (existing reads light up; revalidate)**: After the batch, the affected paths (`/app/library`, `/app`,
  `/app/showcase`, the source `/app/proof/[id]`) are revalidated so the existing reads surface the new clips;
  no read shape changes.
- **A-09 (reuse the reliability stack)**: `withDbRetry` on reads; the shared `<ErrorState>` for a genuine
  global failure; per-proof failures reported in the result, not as a global error.

## Clarifications

> The format scope, the consent/selection rule, and the batch surface + honest result were surfaced
> (P-XII + A-11 + P-VII) and are **RESOLVED** (human decision, 2026-06-18): **Q1→A** one batch format;
> **Q2→A** non-granted un-selectable up front + a per-proof re-check at generate; **Q3→A** inline
> selection-action bar + honest per-proof summary, no new route. Folded into FR-003/004/006/007/010.
> (Partial-outcome reporting is part of Q3 + FR-007: an honest per-proof summary, no all-or-nothing.)

### Question 1 — RESOLVED (A): one format for the whole batch

**Context**: B1 is "one recipe / many clips". The T2.4b studio picks a format per clip.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **One format for the whole batch** | Matches "one recipe, many clips"; one format control on the action bar applies to every clip in the run. Simplest, honest. |
| B | Per-proof format | Each selected proof carries its own format → a per-row control; larger UI + state. Beyond the "one recipe" framing. |
| Custom | — | e.g. one batch default, overridable per proof later. |

**Resolution**: **A** — one batch format.

### Question 2 — RESOLVED (A): non-granted un-selectable up front + a per-proof re-check at generate

**Context**: B1 shows non-granted proof as **"needs consent"** (not "Make") and offers **"Select all ready"**.
P-VII requires a per-proof re-check at generate regardless.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **Non-granted is not selectable up front** (shown "needs consent"); "Select all ready" selects only granted; generate still re-checks per proof | Matches B1; the merchant can't build a batch that includes non-consented proof; the generate-time re-check (P-VII) is belt-and-braces for consent revoked after selecting. |
| B | Any proof selectable; non-granted **honestly skipped at generate** with a clear reason | Simpler selection (no eligibility gating up front); relies entirely on the generate-time skip + honest report. Also honest, but lets the merchant select proof that can't be made. |
| Custom | — | e.g. selectable but visibly flagged "will be skipped". |

**Resolution**: **A** — match B1 (non-granted not selectable; "Select all ready" = granted), with the
per-proof generate-time re-check still enforced (covers revoked-after-select).

### Question 3 — RESOLVED (A): inline selection-action bar + honest per-proof summary, no new route

**Context**: B1 is the inbox in selection mode ("Make clips" + "Select all ready"). There is **no separate
batch-config screen** in design-reference; the format-pick + result are a derived addition.

| Option | Answer | Implications |
|--------|--------|--------------|
| **A ★** | **Inline selection-action bar in the inbox** (N selected · format · "Make clips") → generate → an **honest per-proof summary** shown in place (N made; M skipped + reason; failed) | Matches B1 (no new route); the bar appears when proofs are selected; the result is an in-place summary. No all-or-nothing. |
| B | A dedicated batch route/screen (select → navigate to a batch config + result page) | More room for the result, but introduces a route/screen with no design-reference basis (a derived surface). |
| Custom | — | e.g. inline bar + a dismissible result panel/toast. |

**Resolution**: **A** — an inline selection-action bar + an honest in-place per-proof result; no new route.
