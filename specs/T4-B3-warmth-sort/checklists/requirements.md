# Specification Quality Checklist: Warmth sort (rank the proof inbox by content-readiness)

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

- **3 clarifications are intentionally OPEN** (Q1 signal composition / whether un-tapped is in, Q2
  presentation, Q3 interaction + default). Surfaced, not assumed — the B1/B2/B4 human-decision pattern.
  The single "No [NEEDS CLARIFICATION] markers remain" item is deliberately unchecked until the human
  answers; everything else passes.
- **Signal-gap raised, not guessed (P-XII):** recency/completeness/consent are already on `ProofView`;
  **un-tapped (clip status per proof) is NOT** projected by `getProofs`, so composing warmth with it
  needs an additive read-time annotation. Folded into Q1 (scope fork) and FR-011.
- **Port note:** the `/design-reference` B3 screen is the inbox (screen 02) with "Warmest" active — the
  Wall re-ordered, no prominent per-card score — so B3 makes the existing "Warmest — coming soon" sort
  control real; a per-proof indicator (Q2) would be a minimal additive, raised here.
- Some implementation nouns (`getProofs`, `ProofView`, `effectiveConsentState`, `derived_asset`,
  `SortKey`, `ProofCard`) appear deliberately as **fence/byte-stability anchors** the user made
  binding, not as design choices.
