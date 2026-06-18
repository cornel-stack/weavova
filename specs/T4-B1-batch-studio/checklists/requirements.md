# Specification Quality Checklist: Batch studio (bulk clip generation)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-18
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [X] No [NEEDS CLARIFICATION] markers remain — Q1–Q3 **RESOLVED** (2026-06-18): Q1→A one batch format; Q2→A
      non-granted un-selectable + per-proof re-check at generate; Q3→A inline action bar + honest per-proof
      summary, no new route. Folded into FR-003/004/006/007/010.
- [X] Requirements are testable and unambiguous (given the recommended defaults; Q1–Q3 toggle FR-004/003/010)
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified (empty selection, revoked-after-select, all-non-granted, re-run, large, select-vs-nav)
- [X] Scope is clearly bounded (out-of-scope: B2 upload, B3 warmth, B4 export, T8 engine, List view)
- [X] Dependencies and assumptions identified

## Feature Readiness

- [X] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows (batch generate, per-proof consent skip, honest partial result)
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Notes

- **Design check done**: B1 "Batch studio" = the inbox in **selection mode** (Make clips / Select all ready /
  per-card Make; non-granted shown "needs consent"). T2.2 FR-014c deferred this exact cluster **to T4** and
  flagged that selection needs a control **ProofCard doesn't carry** → the selection control is a **sibling
  overlay** (ProofCard byte-unchanged).
- **Q1–Q3 must be resolved before `/speckit.plan`** — Q2 especially (the P-VII selection rule). Recommended:
  Q1→A one batch format; Q2→A non-granted not-selectable + generate-time re-check; Q3→A inline action bar +
  honest in-place per-proof result (no route, no all-or-nothing). Resolve via `/speckit.clarify` or by
  confirming the defaults.
- Everything else passes; planning-ready once Q1–Q3 are confirmed.
