# Specification Quality Checklist: Showcase (curate + preview the wall of proof)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-18
**Feature**: [spec.md](../spec.md)

## Content Quality

- [X] No implementation details (languages, frameworks, APIs)
- [X] Focused on user value and business needs
- [X] Written for non-technical stakeholders
- [X] All mandatory sections completed

## Requirement Completeness

- [X] No [NEEDS CLARIFICATION] markers remain — Q1–Q3 **RESOLVED** (2026-06-18): Q1→A curate+preview now,
      Q2→A AUTO / no schema change (curation+publish defer to T9 together), Q3→A both proof+clips
      all-consented verified-marked. Design question resolved inline (screen 10 exists; embed/publish is T9).
- [X] Requirements are testable and unambiguous (given the recommended defaults; Q1–Q3 toggle FR-002/009/010/016)
- [X] Success criteria are measurable
- [X] Success criteria are technology-agnostic
- [X] All acceptance scenarios are defined
- [X] Edge cases are identified
- [X] Scope is clearly bounded (out-of-scope: T9 publish/embed/share/public-page, T8 engine; schema change only if curated)
- [X] Dependencies and assumptions identified

## Feature Readiness

- [X] All functional requirements have clear acceptance criteria
- [X] User scenarios cover primary flows (preview, withdrawal, states, distribution-controls-absent)
- [X] Feature meets measurable outcomes defined in Success Criteria
- [X] No implementation details leak into specification

## Notes

- **Design question resolved**: `/app/showcase` HAS a screen (10 "Showcase manager") — ported; its T9
  distribution machinery (embed/"Copy embed"/LIVE/publish/presets) is not rendered (A-11). A separate
  Public-site "Public showcase" export is the T9 public wall, out of scope.
- **Q1–Q3 must be resolved before `/speckit.plan`** — Q2 especially, since **curated ⇒ a schema change** (a
  featured/membership flag + curation control + proof picker) while **auto ⇒ no schema change** (read-only).
  Recommended defaults: Q1→A (curate+preview now), Q2→A (auto / no schema change), Q3→A (both proof+clips,
  all-consented). Resolve via `/speckit.clarify` or by confirming/correcting the defaults.
- Everything else passes; planning-ready once Q1–Q3 are confirmed.
