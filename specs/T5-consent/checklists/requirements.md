# Specification Quality Checklist: Consent surface (the live control for the consent backbone)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-21
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [ ] No [NEEDS CLARIFICATION] markers remain
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

- **3 clarifications are intentionally OPEN** (Q1 cascade-preview confirm, Q2 made-under provenance,
  Q3 history depth) — surfaced, not assumed (the B-pattern). Each carries the user's lean (A/A/A). The
  single "No [NEEDS CLARIFICATION] markers remain" item is deliberately unchecked until the human
  confirms; everything else passes.
- **Port + derived split (P-V / P-XII):** the `/design-reference` screen 13 **ledger table** is a
  faithful port; the **history timeline**, **made-under provenance**, and the **record-withdrawal
  action + cascade-preview confirm** are **not** in screen 13 → documented as **derived surfaces**,
  raised rather than invented.
- **Honest-semantics fence is the heart**: record-the-customer's-withdrawal (not brand-revoke), no
  re-grant, retained for audit, reuse the shared gate — encoded across FR-003/006/007/008 and SC-004.
- **Wording reconciliation noted**: stored enum state is `revoked`; UI copy frames it as "withdrawn"
  with a "Record withdrawal" action — a copy choice, no schema change (Assumptions).
- Implementation nouns (`effectiveConsentState`, `getGrantedConsentId`, `derived_asset.consentId`,
  `generateClip`, `generateBatch`, route paths) appear deliberately as **fence/byte-stability anchors**
  the user made binding, not as design choices.
