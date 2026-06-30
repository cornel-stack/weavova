---
description: "Task list — T7.5 Verification basis (the transaction leg of Verified real)"
---

# Tasks: T7.5 — Verification basis (the transaction leg of "Verified real")

**Input**: Design documents from `specs/T7.5-verification-basis/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D8), data-model.md, contracts/ (proof-verified-resolver, consumer-swap), quickstart.md

**Tests**: No test-runner in the demo tiers (fixtures-first). Validation is via `quickstart.md`
scenarios + explicit diff/grep gates (Phase 6). No TDD tasks generated.

**Organization**: Foundational = the model + resolver chokepoint (blocks all stories). Then US1
(earned stamp + byte-stable swap), US2 (honest in-between label), US3 (graded basis + forward
contract). Phase 6 makes the P-V byte-stability gate, chokepoint grep, and P-VII boundary EXPLICIT
tasks. Constitution tag on each task.

**Settled inputs (do not re-open)**: D1 = retire-in-place (`proof.verified` kept, write-frozen,
unreferenced; physical DROP is a DEFERRED follow-up, NOT this slice). Bar = `strength IN
(strong,medium) AND transaction_verified_at IS NOT NULL`. Resolver = consent AND basis, short-circuits
on consent. Migration 0009 additive only. `/c/[token]` untouched (helper-only edit). In-between =
stamp absence on cards (no new card UI) + the ONE new detail label.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no dependency on an incomplete task)
- **[Story]**: US1 / US2 / US3 (Setup/Foundational/Polish/Gates carry no story label)

---

## Phase 1: Setup

**Purpose**: Confirm the additive-migration baseline so `db:generate` emits exactly `0009`.

- [ ] T001 Confirm migration baseline: `./drizzle` latest is `0008`, `meta/_journal.json` clean, no
      uncommitted `src/db/schema.ts` drift, and `.env.local` has `DATABASE_URL` — so the next
      `db:generate` produces a single additive `0009`. (P-III locked stack; no code change)

**Checkpoint**: baseline clean — model work can begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The graded basis model + the resolver chokepoint. **No user story can begin until this
phase is complete** — every surface reads through the resolver introduced here.

**⚠️ CRITICAL**: blocks US1, US2, US3.

- [ ] T002 Add `basisStrengthEnum` (`strong`/`medium`/`weak`) and `basisSourceEnum`
      (`native`/`webhook`/`manual`) pgEnums to `src/db/schema.ts` near `verificationBasis`. (P-XIV —
      grades the evidence; `weak` = assertion, below the bar)
- [ ] T003 Extend `verificationBasis` in `src/db/schema.ts`: add `source basisSource NOT NULL DEFAULT
      'manual'`, `strength basisStrength NOT NULL DEFAULT 'weak'`, `transactionRef text` (nullable);
      make `requestId` nullable (drop `.notNull()`, keep FK `restrict`); add index
      `verification_basis_proof_idx` on `proofId`. `transaction_verified_at` already exists (now
      written, no DDL). Per data-model.md. (P-VI fixture=schema contract; D2)
- [ ] T004 Mark `proof.verified` write-frozen/internal in `src/db/schema.ts`: a comment stating it is
      retired-in-place (D1) — never read by app code, verified-state derives from the resolver; the
      physical DROP is a deferred follow-up, not this slice. (P-XIV chokepoint; additive discipline)
- [ ] T005 Generate migration: `npm run db:generate` → review `./drizzle/0009_*.sql` is **additive
      only** — 2 `CREATE TYPE`, 3 `ADD COLUMN`, 1 `ALTER COLUMN request_id DROP NOT NULL`, 1 `CREATE
      INDEX`; **no** `DROP COLUMN`/destructive op, **no** token/consent-model change. STOP and surface
      if anything non-additive appears. (P-IX scope; D1/D2)
- [ ] T006 Apply migration to Neon: `npm run db:migrate` (additive, safe on the shared DB). Confirm
      `verification_basis` now has source/strength/transaction_ref and nullable request_id. (P-VI)
- [ ] T007 Create the resolver `src/lib/verification.ts`: `VerificationState =
      "verified" | "consent_only" | "unverified_no_consent"`; `verificationState({ consentState,
      hasQualifyingBasis })` short-circuits to `unverified_no_consent` when consent ≠ granted, else
      `verified` if `hasQualifyingBasis` else `consent_only`; `proofIsVerified(input) === state ===
      "verified"`. Pure module, type-only `ConsentState` import (no Drizzle in bundle). Per
      contracts/proof-verified-resolver.md. (P-XIV/FR-019 the bar + consent-AND-basis; P-VII)
- [ ] T008 Add `qualifyingBasisExpr(proofIdColumn)` to `src/db/queries.ts` beside
      `effectiveConsentState`: correlated `EXISTS(verification_basis b WHERE b.proof_id = … AND
      b.strength IN ('strong','medium') AND b.transaction_verified_at IS NOT NULL)`. (P-XIV the bar,
      self-defending vs unevidenced strength; D3)

**Checkpoint**: model + resolver exist and build green; no surface reads them yet.

---

## Phase 3: User Story 1 — The stamp is earned (Priority: P1) 🎯 MVP

**Goal**: Every surface's verified state flows through the resolver; the stamp shows only on
genuinely two-leg proof; the demo's verified set is byte-stable.

**Independent Test**: After backfill+reseed, the "Verified real customer" stamp shows on exactly
Darnell W., Maria L., Aisha K., Hannah P., Greta S. across inbox/dashboard/library/showcase — the same
set as before — and on no others (quickstart Scenario 1, SC-001/SC-002).

- [ ] T009 [US1] Update view types: add `verificationState: VerificationState` to `ProofDetailView`
      in `src/lib/proof.ts` (additive); confirm `ProofView.verified`,
      `LibraryClipView.verified` (`src/lib/clip.ts`), `ClipDetailView.verified` (`src/lib/clip.ts`),
      `PostTextPackage.verified` (`src/lib/export.ts`) keep their boolean shape (value becomes
      resolver-computed). (P-V byte-stable shapes)
- [ ] T010 [US1] Swap the proof list/card + detail base projections in `src/db/queries.ts`
      (`proofColumns`/`getProofs`/`getProof`): remove `verified: proof.verified`; select internal
      `hasQualifyingBasis: qualifyingBasisExpr(proof.id)`; `toView` computes `verified` via
      `proofIsVerified`; `getProof`/`toDetailView` also computes `verificationState`. (P-XIV chokepoint;
      P-V; D8)
- [ ] T011 [US1] Swap the dashboard latest-proof / hero projection in `src/db/queries.ts` to feed the
      resolver (drop `proof.verified`; add `hasQualifyingBasis`; compute `verified`). (P-V; D8)
- [ ] T012 [US1] Swap the clip projections in `src/db/queries.ts` (library/showcase clip read + clip
      detail read): the source-proof `verified` flows through the resolver (drop `proof.verified`).
      Clips are already consent-gated; verified now = qualifying basis under that granted consent.
      (P-V; P-VII; D8)
- [ ] T013 [US1] Swap the export package projection in `src/db/queries.ts` and confirm
      `src/lib/export.ts` attribution reads the resolver-fed `verified` (no raw column). (P-V; D8)
- [ ] T014 [US1] Backfill in `src/db/seed.ts` (idempotent — inside the existing delete+reinsert pass,
      `verificationBasis` already deleted at seed.ts:183): Darnell/Maria/Aisha/Hannah/Greta →
      `source='native', strength='strong', transaction_verified_at=<capturedAt>,
      transaction_ref=<modelled order id>, request_id=null`; granted-but-unverified (Marcus/Yuki/
      Caleb/Nadia/Priya) → `manual`/`weak`/null; awaiting/revoked → no basis. `Fixture.verified`
      drives basis selection — it is NO LONGER written to `proof.verified` as truth. (P-XIV owned-data;
      P-VI; D7)
- [ ] T015 [US1] Reseed (`npm run db:seed`) and validate quickstart **Scenario 1**: stamp on exactly
      the five across inbox/dashboard/library/showcase; cards/showcase/library/export pixel-identical
      to before for existing data. (SC-001/SC-002; P-V)

**Checkpoint**: the earned stamp works; verified-state is resolver-only and byte-stable. **MVP.**

---

## Phase 4: User Story 2 — The honest in-between (Priority: P1)

**Goal**: A granted-consent proof with no qualifying basis shows an honest, quiet in-between — never a
false stamp, never a blank.

**Independent Test**: Marcus T. proof detail shows the quiet "Consent recorded · transaction
unconfirmed" label (no persimmon, no stamp); his inbox card shows plain stamp absence (no badge) — same
for Yuki/Caleb/Nadia/Priya (quickstart Scenario 2, SC-006).

- [ ] T016 [US2] Add the in-between label to
      `src/components/app/proof-detail/proof-detail-meta.tsx`: when `verificationState === 'consent_only'`
      render a quiet, **non-persimmon** "Consent recorded · transaction unconfirmed" label (ink-2 /
      sunken treatment, recedes); `verified` → the existing ported stamp (unchanged); `unverified_no_consent`
      → render nothing (the consent meta already shows awaiting/revoked). Per spec Decision 3 /
      contracts/consumer-swap.md. (P-V port; P-XIII honest state; P-IV persimmon scarce; P-XII derived state)
- [ ] T017 [US2] Validate quickstart **Scenario 2**: Marcus detail shows the label, Marcus card shows
      plain absence; no card gains a badge; Yuki/Caleb/Nadia/Priya same. (SC-006; P-XIII)

**Checkpoint**: the honest in-between is live; persimmon stays on the stamp only.

---

## Phase 5: User Story 3 — Graded basis, ready for deferred Sources (Priority: P2)

**Goal**: Live capture writes only a weak (below-bar) basis; the model accepts a graded basis so a
future Source flips state with no resolver change.

**Independent Test**: A scratch webhook/medium basis on a granted-unverified proof flips it to the
stamp with zero resolver/surface edits; live-captured proof carries a weak basis and shows the
in-between (quickstart Scenario 5, SC-005).

- [ ] T018 [US3] Update `writeCapturedProof` in `src/db/queries.ts`: attach the verification_basis with
      `source='manual', strength='weak', transaction_ref=<capture_request.transaction_ref or null>,
      transaction_verified_at=null` (the merchant assertion, below the bar). Confirm **zero** edits to
      `src/app/c/[token]/**` (FR-014 — helper-only). (P-XIV assertion≠confirmation; FR-014)
- [ ] T019 [US3] Validate quickstart **Scenario 5** (forward contract): scratch-insert a
      `source='webhook', strength='medium', transaction_verified_at=<t>, request_id=null` basis for a
      granted-unverified proof → it flips to the stamp with NO change to the resolver or any surface;
      revert. (SC-005; D5 no-rework guarantee)

**Checkpoint**: graded model proven forward-compatible; nothing live over-claims.

---

## Phase 6: Verification Gates (cross-cutting — explicit, not assumed)

**Purpose**: The trust-sensitive gates the user mandated as explicit tasks.

- [ ] T020 [P] **P-V byte-stability diff gate**: for EVERY existing fixture, compute
      `proofIsVerified` and diff it against the OLD `proof.verified` value (the `Fixture.verified`
      intent). Assert an EXACT match across the full 15-fixture set. If ANY fixture's verified-state
      flips, **STOP and surface it** — that is a visible trust change, not a silent one. (P-V; SC-002)
- [ ] T021 [P] **Chokepoint grep (P-XIV)**: `grep -rn "proof.verified" src/` returns only the
      schema column definition (write-frozen comment) — no projection or component reads it;
      `grep -rn "verified" src/components src/lib` confirms every consumer reads a resolver-produced
      field; the only verified-state producer is `src/lib/verification.ts`. (SC-003; P-XIV)
- [ ] T022 **P-VII boundary (SC-004)**: force-feed Leo M. (consent revoked v2) a `strong` basis with
      `transaction_verified_at` set (scratch), reseed, reload → Leo M. is STILL not verified
      (`unverified_no_consent`); no stamp, no label, consent meta shows "revoked". Revert. (quickstart
      Scenario 3; P-VII; SC-004)

**Checkpoint**: the bar, the chokepoint, and the consent-necessity boundary are demonstrably enforced.

---

## Phase 7: Polish, Cross-Cutting & Definition of Done

- [ ] T023 [P] Pressroom token audit: the in-between label uses on-token ink-2/sunken (no new colour);
      persimmon appears ONLY on the stamp; cards show absence, not a new badge. (P-IV)
- [ ] T024 [P] Microcopy review of the label: "Consent recorded · transaction unconfirmed" — plain,
      no hype adjectives, no emoji. (P-XVII)
- [ ] T025 [P] Owned-data audit: no fabricated confirmation; `transaction_ref` on a weak basis is an
      assertion only and never earns the stamp; no invented metric. (P-XIV/FR-019)
- [ ] T026 [P] Port-completeness: the in-between is an honest labelled state behind the stamp seam,
      not a dead control; deferred strong-source population is honestly absent, not faked. (P-XIII)
- [ ] T027 Accessibility/responsive by construction: the label is static text in the existing detail
      meta block — confirm focus order unchanged and it reflows at 480/1024/1280 (no new control). (DoD)
- [ ] T028 `npm run lint` and `npm run build` green (TS strict; no `any`, no unjustified `@ts-ignore`). (DoD)
- [ ] T029 Run full `quickstart.md` (Scenarios 1–5 + build gate) end-to-end on the seeded DB. (DoD)

> **P-XV / P-XVI**: N/A — non-render slice (no runtime plan, no model in any render path).
> **Deferred (NOT this slice)**: physical `DROP COLUMN proof.verified` (D1 option B) — a later
> non-additive cleanup once the column has been unreferenced for a release.

**Definition of done**: renders on seeded fixtures; the in-between is an honest state (no blank/dead
control); responsive; Pressroom-exact (no new colour); keyboard-accessible; passes SC-001…SC-006;
builds green. Then **STOP and report** — do not advance to the next slice/tier until the human says so (P-IX).

---

## Dependencies & Execution Order

### Phase order

- **Setup (T001)** → **Foundational (T002–T008)** blocks everything → **US1 (T009–T015)** →
  **US2 (T016–T017)** → **US3 (T018–T019)** → **Gates (T020–T022)** → **Polish (T023–T029)**.
- US2 depends on US1 (it renders `verificationState` produced by US1's `getProof` swap + needs the
  weak-basis backfill from T014). US3 depends on Foundational only (independent of US1/US2 UI), but is
  sequenced after for a green build.

### Within Foundational

- T002 → T003 → T004 (same file `schema.ts`, sequential) → T005 (generate) → T006 (apply).
- T007 (resolver) and T008 (EXISTS fragment) can follow T006; T007 is independent of T008 file-wise
  but both are prerequisites for the swap.

### Within US1 (same file `src/db/queries.ts` → sequential)

- T010 → T011 → T012 → T013 are all in `queries.ts` — **not [P]** (same file). T009 (types) precedes
  them. T014 (seed.ts) is [P] vs the queries edits but must precede T015 (reseed+validate).

### Parallel opportunities

- Phase 6 gates T020 / T021 are [P] (independent checks); T022 follows (mutates seed scratch).
- Phase 7 audits T023 / T024 / T025 / T026 are [P] (independent review passes).

---

## Implementation Strategy

### MVP (Foundational + US1)

1. T001 → T002–T008 (model + resolver + EXISTS).
2. T009–T015 (swap + strong backfill).
3. **STOP and validate** quickstart Scenario 1 + the byte-stability diff (T020): the earned stamp,
   byte-stable for existing data. This alone is a shippable increment — the stamp now means something.

### Incremental

- Add US2 (the honest in-between label) → validate Scenario 2.
- Add US3 (live weak basis + forward-contract proof) → validate Scenario 5.
- Run all gates (Phase 6) + polish (Phase 7) → DoD → STOP and report.

## Notes

- [P] = different files, no incomplete-task dependency. Most US1 tasks are NOT [P] (one file,
  `queries.ts`).
- The only NEW UI in the whole slice is T016 (the detail label). Cards/showcase/library/export are
  byte-stable — that is the P-V contract, gated explicitly by T020.
- Build stays green throughout: additive migration first, resolver second, then each consumer swap.
