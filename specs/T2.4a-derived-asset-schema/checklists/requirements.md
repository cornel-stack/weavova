# Specification Quality Checklist: Derived-Asset Schema, Revocation Cascade & Seed

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-16
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain (Q1→B, Q2→A, Q3→A resolved)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- **3 open [NEEDS CLARIFICATION] markers remain — all intentional**, surfaced as Q1–Q3: **Q1** (the exact
  `derived_asset` columns — owned-now vs deferred to T8), **Q2** (the consequential, **P-VII-critical**
  one — the revocation-cascade behaviour: hard `ON DELETE CASCADE` vs soft read-time withdrawal that
  preserves the audit trail, given revocation is a new version not a delete), and **Q3** (how the seeded
  cascade is expressed and verified absent a test runner). Each has a recommended default; this is a
  foundation/schema change, so the human reviews carefully before planning.
- Decisions already settled by T0.3 / carry-over rules are recorded as assumptions, not questions:
  assets point at the stubbed sample clip (A-02); revocation is a new version, not a delete (A-03);
  relative seed dates (A-04); reuse the existing reads + `withDbRetry` (A-05); the studio UI / generate
  flow (T2.4b) and the real render engine (T8) are out of scope; no new dependency; ProofCard + seam
  unchanged.
- This slice is **schema-before-screens** (P-VI): it ships before the parked studio UI (T2.4b), which
  depends on it.
- All other checklist items pass; the spec is otherwise ready for planning pending the Q1–Q3 answers.
