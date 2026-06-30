# Implementation Plan: T7.5 — Verification basis (the transaction leg of "Verified real")

**Branch**: `T7.5-verification-basis` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T7.5-verification-basis/spec.md`

## Summary

Make "Verified real customer" **earned, not asserted**. Today the consent leg is real (T7.1) but the
transaction leg is a stub (`verification_basis.transaction_verified_at` always null) and
`proof.verified` is a static fixture boolean copied straight into every surface. This slice (a) gives
the verification basis a graded **source + strength + transaction reference** and a real confirmed-at,
(b) introduces a single sanctioned **`proofIsVerified` resolver** that derives the verified state from
*consent AND basis strength* — making the raw `proof.verified` column unreadable by any surface, and
(c) routes every existing read through it, byte-stable except for ONE new honest UI: a quiet
"Consent recorded · transaction unconfirmed" label on proof **detail**.

The bar is **strong OR medium**, never weak/manual (an assertion is not a confirmation — FR-019). With
native connectors and webhooks deferred to the Sources track, **nothing on a live path earns the
stamp this slice** — link/manual proof shows the honest in-between; only **backfilled fixtures** carry
qualifying bases, so the demo stays coherent and the model is forward-ready (a future webhook just
*writes a typed-strength basis* and the resolver already honors it — no resolver change).

Non-render, model + stamp-logic slice. Small UI footprint (the one detail label).

## Technical Context

**Language/Version**: TypeScript (strict), Next.js 15 (App Router), React 19.

**Primary Dependencies**: Drizzle ORM + Neon Postgres; no new dependency. (NextAuth/R2/Inngest/Resend
untouched by this slice.)

**Storage**: Neon Postgres. Migrations in `./drizzle` (latest `0008`; this slice adds **`0009`**,
additive). Drizzle schema source of truth: `src/db/schema.ts`.

**Testing**: Type-check + `npm run build` + manual quickstart on seeded fixtures (project convention —
fixtures-first, no test runner in the demo tiers).

**Target Platform**: Vercel (server components + server reads). Non-render — no worker.

**Project Type**: Web application (single Next.js app, `src/`).

**Performance Goals**: N/A beyond existing page reads. The verified resolver adds at most one
indexed `EXISTS` subselect per proof projection (mirrors the existing `effectiveConsentState`
subselect pattern).

**Constraints**: Additive migration only (no token-model or consent-model change). `/c/[token]`
public capture surface UNTOUCHED (FR-014). Byte-stable consumer swap except the new detail label.
Seed remains idempotent on the shared Neon DB.

**Scale/Scope**: 15 seeded proof fixtures (5 currently verified); ~8 SQL projection sites + 11
component read sites + 5 view types in the regression surface.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (unchanged — still PASS).*

- [x] **Customer is the headline (P-II)**: PASS — no proof surface layout changes; the customer quote/
      face stays the largest element. This slice only governs whether the small persimmon stamp shows,
      and adds a quiet, non-persimmon detail label that recedes.
- [x] **Locked stack (P-III)**: PASS — Drizzle/Neon only; no new dependency; non-render (no Vercel
      heavy-compute concern).
- [x] **Pressroom tokens (P-IV)**: PASS — persimmon stays scarce: the stamp keeps it; the in-between
      is **absence** of the stamp on cards and a non-persimmon label on detail. No persimmon "pending"
      badge is invented.
- [x] **Port, don't redesign (P-V)**: PASS — the verified stamp is the ported "Verified real customer"
      mark (proof inbox 02, proof detail 03, public showcase, dashboard, library). The design has no
      unverified/pending badge → the in-between is a documented **derived state** (P-XII), drawn
      minimally from the design's binary model, not invented loud.
- [x] **Fixtures-first (P-VI)**: PASS — the backfilled basis fixtures (source + strength + reference +
      confirmed-at) ARE the schema contract the deferred Sources track writes into. The schema (0009)
      lands before the resolver/screens read it.
- [x] **Consent enforcement (P-VII)**: PASS — consent leg unchanged; the resolver is **consent AND
      basis**, so withdrawn/awaiting consent is never verified regardless of basis strength (Leo M.).
      Revocation cascade / versioning from T7.1 untouched.
- [ ] **No editor (P-VIII)**: N/A — no studio/format surface in scope.
- [x] **SDD scope (P-IX)**: PASS — one vertical slice (transaction leg + resolver + honest in-between +
      backfill). Native connectors / webhook population explicitly deferred; no speculative connector
      code — only the forward-contract shape.
- [x] **Ambiguity handling (P-XII)**: PASS — the one design gap (no unverified badge) is resolved as a
      documented derived state against named screens (02/03); the one new build decision (how to retire
      `proof.verified`) is surfaced in research.md, not silently invented.
- [x] **Port-completeness (P-XIII)**: PASS — the in-between is an honest, labelled state behind the same
      stamp seam, not a dead control; deferred strong-source population is honestly absent, not faked.
- [x] **Owned data only (P-XIV / FR-019)**: PASS — THE central gate. The stamp reflects only
      genuinely-evidenced two-leg state; a merchant assertion (`transaction_ref`) is recorded as a
      **weak** basis that cannot earn the stamp. The resolver structurally forbids reading a stale
      `proof.verified`. No fabricated confirmation.
- [ ] **Plan-not-code (P-XV)**: N/A — non-render slice.
- [ ] **No-LLM-in-render (P-XVI)**: N/A — non-render slice.

**Definition of done (P-Governance)**: renders on seeded fixtures; the in-between is an honest state
(no empty/dead control); responsive (no layout change beyond a recede-by-default label);
Pressroom-exact (no new colour — label uses existing ink-2/sunken treatment); keyboard-accessible
(static text, no new control); passes acceptance criteria SC-001…SC-006; builds green.

## Project Structure

### Documentation (this feature)

```text
specs/T7.5-verification-basis/
├── plan.md              # This file
├── research.md          # Phase 0 — the 8 design decisions (D1–D8)
├── data-model.md        # Phase 1 — verification_basis (extended) + enums + resolver states
├── quickstart.md        # Phase 1 — runnable validation (migrate → seed → verify stamp/label/Leo M.)
├── contracts/
│   ├── proof-verified-resolver.md   # the resolver: signature, 3 states, chokepoint, forward contract
│   └── consumer-swap.md             # the 11 read sites + 5 view types → byte-stable routing
└── tasks.md             # Phase 2 (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── db/
│   ├── schema.ts                         # + basisStrengthEnum, basisSourceEnum; verificationBasis
│   │                                     #   gains strength/source/transactionRef; requestId → nullable
│   ├── migrations (authoritative ./drizzle)
│   │   └── 0009_<name>.sql                # additive: 2 enums + 3 cols + request_id DROP NOT NULL
│   ├── queries.ts                        # NEW qualifyingBasisExpr(proofId); projections feed the
│   │                                     #   resolver instead of selecting proof.verified;
│   │                                     #   writeCapturedProof attaches a weak/manual basis
│   └── seed.ts                           # backfill: 5 verified fixtures → strong native bases;
│                                         #   granted-consent unverified → weak; idempotent (delete+insert)
└── lib/
    ├── verification.ts                   # NEW — proofIsVerified + verificationState (the resolver)
    └── proof.ts                          # ProofDetailView gains verificationState (additive field)

src/components/app/proof-detail/proof-detail-meta.tsx   # the ONE new UI: in-between label
# (all other read sites are byte-stable — see contracts/consumer-swap.md)
```

**Structure Decision**: Single Next.js app (`src/`). The new resolver lives in `src/lib/verification.ts`
(a pure module, type-only DB imports, no Drizzle in any bundle — mirrors `src/lib/proof.ts`). The
SQL leg (`qualifyingBasisExpr`) lives beside the existing `effectiveConsentState` in `src/db/queries.ts`.

## Phase 0 — Research (decisions)

See [research.md](./research.md). Eight decisions (D1–D8):

- **D1 — the chokepoint**: how `proof.verified` stops being directly readable (keep column additive +
  remove from all projection row types + resolver is the sole producer of `verified`; column marked
  write-frozen/internal). One flagged sub-decision: *drop* the column now vs *retire-in-place* — recommend
  retire-in-place (keeps the migration additive as specified); confirm at `/speckit-tasks`.
- **D2 — graded basis model**: `basis_strength` (strong/medium/weak) + `basis_source` (native/webhook/
  manual) + `transaction_ref` + the already-present `transaction_verified_at` "made real".
- **D3 — the verified bar predicate**: `strength IN ('strong','medium') AND transaction_verified_at IS
  NOT NULL` (belt-and-suspenders for the "strength claim without evidence" edge case).
- **D4 — resolver three states**: `verified` / `consent_only` / `unverified_no_consent`; `proofIsVerified`
  = `state === 'verified'`.
- **D5 — forward contract**: T7.4 webhook / native connectors INSERT a typed-strength basis (with
  `request_id` nullable) — resolver UNCHANGED. The no-rework guarantee.
- **D6 — live capture basis**: `writeCapturedProof` attaches `source='manual', strength='weak'`,
  `transaction_ref` from the assertion, `transaction_verified_at=null` → below the bar. `/c/[token]`
  route untouched.
- **D7 — backfill**: the 5 verified fixtures → strong native bases that legitimately earn the stamp;
  granted-consent unverified → weak bases (exercise the bar + the detail label); idempotent.
- **D8 — consumer swap**: the byte-stable routing of all 11 read sites + 5 view types.

## Phase 1 — Design & Contracts

- [data-model.md](./data-model.md) — the extended `verification_basis`, the two new enums, the
  nullable `request_id`, and the resolver state set.
- [contracts/proof-verified-resolver.md](./contracts/proof-verified-resolver.md) — `proofIsVerified` /
  `verificationState` signature, inputs, the three states, the chokepoint, and the deferred-source
  forward contract.
- [contracts/consumer-swap.md](./contracts/consumer-swap.md) — the regression table: every
  `proof.verified` read site routed through the resolver, with the byte-stable guarantee and the single
  exception (detail label).
- [quickstart.md](./quickstart.md) — migrate → seed → verify the 5 stamps persist, the in-between label
  shows, and Leo M. stays unverified even if force-fed a strong basis.

## Complexity Tracking

*No constitution violations. The one non-trivial choice (retiring `proof.verified`) is kept additive
per the stated migration deliverable; the stronger structural option (DROP the column) is deferred and
recorded in research.md D1 as a follow-up — not a violation, a documented scope boundary.*
