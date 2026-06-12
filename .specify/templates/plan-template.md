# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]

**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]

**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]

**Project Type**: [e.g., library/cli/web-service/mobile-app/compiler/desktop-app or NEEDS CLARIFICATION]

**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]

**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Confirm this plan complies with `.specify/memory/constitution.md` (v1.0.1). Each gate below maps to
a binding principle; mark PASS / FAIL / N/A and justify any FAIL in Complexity Tracking.

- [ ] **Customer is the headline (P-II)**: every proof surface in this plan makes the real
      customer face or verbatim quote the largest, warmest element; app chrome stays quiet.
- [ ] **Locked stack (P-III)**: uses only Next.js 15 / React 19 / TS strict, Tailwind v4, Auth.js
      (NOT Supabase Auth), Neon + Drizzle, R2, Inngest, Resend. No new dependency without an
      explicit proposal. Heavy render stays off Vercel (stubbed → sample clip until T8).
- [ ] **Pressroom tokens (P-IV)**: only on-token colour/type/radii/spacing/motion; persimmon used
      ONLY on the primary action and the "verified real customer" mark.
- [ ] **Port, don't redesign (P-V)**: components are ported faithfully from `/design-reference`;
      no reinvented layouts or restyling. Names the reference screen(s) this slice ports.
- [ ] **Fixtures-first (P-VI)**: builds against fixtures shaped exactly like the real schema; the
      fixture shape is the schema contract; schema is written before the screens that read it.
- [ ] **Consent enforcement (P-VII)**: consent is visible, versioned, revocable; revocation
      cascades to derived assets; no clip is generated from proof lacking consent.
- [ ] **No editor (P-VIII)**: the clip studio is a format picker — no timeline, track, or scrubber.
- [ ] **SDD scope (P-IX, P-XI)**: one vertical slice only; no speculative/"while I'm here" work;
      stays within the current tier (T0–T10) sequence.
- [ ] **Ambiguity handling (P-XII)**: open questions are raised against a named `/design-reference`
      screen rather than guessed.

**Definition of done (P-Governance)** — this slice must, before it is considered complete: render
on real data (fixtures in Phase 1); handle empty / loading / error states; be responsive to the
`480 / 1024 / 1280` breakpoints; match the Pressroom tokens exactly; be keyboard-accessible; pass
its acceptance criteria; build green.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# [REMOVE IF UNUSED] Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# [REMOVE IF UNUSED] Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure: feature modules, UI flows, platform tests]
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
