# Feature Specification: T0.1 — Walking Skeleton (scaffold, CI, themed deploy)

**Feature Branch**: `T0.1-walking-skeleton`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "Slice T0.1 — Walking skeleton: scaffold, CI, and a blank themed deploy. Stand up the Weavova web app and prove the full path from commit to live URL works before any product features."

## Overview

This is the first slice of tier **T0 (Foundations & rails)**. Its only job is to prove the path
from a commit to a verified, live, on-brand application — the "walking skeleton" — before any
product feature exists. The deliverable is an empty but real Weavova web app that renders one
themed landing surface, fails or passes a commit on a continuous-integration check, and is shaped
to deploy to a live URL.

The motivating risk: builds collapse late when deployment and CI are bolted on at the end. This
slice removes that risk on day one by exercising the whole pipeline while the surface area is
trivially small.

This is a **single application**, not a monorepo. The render worker that would justify a monorepo
is deferred to tier T8.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The themed landing renders locally (Priority: P1)

A developer clones the repository, installs dependencies, and starts the app locally. The home
surface ("/") loads on a warm paper background showing the "Weavova" wordmark and the tagline
"The customer is the headline." — and nothing else.

**Why this priority**: This is the proof that the theme path works end-to-end (background colour →
type → a real rendered page). Without it there is no skeleton to deploy. It is the smallest thing
that demonstrates the app is alive and on-brand.

**Independent Test**: Run the local dev server, open "/", and confirm the warm paper background,
the wordmark, and the tagline are present and legible. Delivers a viewable, on-brand landing.

**Acceptance Scenarios**:

1. **Given** a clean checkout with dependencies installed, **When** the developer starts the local
   dev server and opens "/", **Then** the page renders with the Pressroom paper background
   (`#F7F2E8`), the "Weavova" wordmark, and the tagline "The customer is the headline."
2. **Given** the home surface is open, **When** the developer inspects the page, **Then** no
   product UI, navigation, database content, or additional widgets are present — only the wordmark
   and tagline.

---

### User Story 2 - Every commit is verified by CI (Priority: P1)

When a developer pushes a commit or opens a pull request, an automated check runs type-checking and
linting and reports a clear pass/fail status on that commit.

**Why this priority**: Proving the commit-to-verified path on day one is the entire point of the
slice. A green check on a trivial app guarantees the rail exists for every later slice.

**Independent Test**: Push a commit to a branch and open a pull request; confirm the CI check runs
type-check and lint and reports a status. Introduce a type or lint error on a scratch branch and
confirm the check turns red; remove it and confirm it returns green.

**Acceptance Scenarios**:

1. **Given** the CI workflow is in place, **When** a commit is pushed to any branch, **Then** an
   automated check runs type-checking and linting and reports a pass/fail status on that commit.
2. **Given** a pull request is opened, **When** CI runs, **Then** the same type-check and lint
   checks run and gate the pull request with a visible status.
3. **Given** a commit that introduces a type or lint error, **When** CI runs, **Then** the check
   fails (red); **Given** the error is removed, **When** CI re-runs, **Then** the check passes
   (green).

---

### User Story 3 - The skeleton is deployable to a live URL (Priority: P2)

The application builds cleanly and is structured so it can be deployed to a live, public URL on the
project's hosting platform, showing the same themed landing as local.

**Why this priority**: "Commit to live URL" is the headline promise of the slice. It is P2 only
because connecting the hosting platform is a one-time configuration step rather than code; the code
deliverable is an app that builds and deploys without modification.

**Independent Test**: Produce a production build locally with zero errors, then deploy (or preview)
to the hosting platform and confirm the live URL serves the same warm-paper landing with the
wordmark and tagline.

**Acceptance Scenarios**:

1. **Given** the project on the default branch, **When** a production build is run, **Then** it
   completes with zero errors and produces a deployable output.
2. **Given** the app is connected to the hosting platform, **When** it is deployed, **Then** the
   live URL serves the same warm-paper landing (wordmark + tagline) as local, with no
   platform-incompatible code paths.

---

### Edge Cases

- **Scaffolding over existing files**: the repository already contains `CLAUDE.md`,
  `design-reference/`, `docs/`, `.specify/`, `README.md`, and `.git/`. Initializing the app MUST
  preserve all of these — none may be deleted or overwritten with placeholder content.
- **CI on a fork / first run**: the CI workflow must run on push and on pull request without
  requiring secrets or external services (this slice has none).
- **Reduced motion / no JavaScript**: the landing is static content and must remain legible without
  client interactivity.
- **Dark vs light**: only the default Daylight (light) theme is exercised in this slice; the full
  token system and dark mode are deferred to T0.2 and must not be introduced here.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST contain a single web application initialized at the repository
  root (not a monorepo, no nested workspace packages).
- **FR-002**: Initialization MUST preserve the existing `CLAUDE.md`, `design-reference/`, `docs/`,
  `.specify/`, and `.git/` — these are never deleted or overwritten. The existing `README.md` is
  updated in place (see FR-009), not replaced wholesale.
- **FR-003**: The application MUST be configured for strict type-checking, with linting enabled,
  application source under a `src/` directory, and an import alias of `@/*` resolving to the
  application source.
- **FR-004**: A single home surface at "/" MUST render the Pressroom paper background (`#F7F2E8`),
  the "Weavova" wordmark, and the tagline "The customer is the headline." — and nothing more.
- **FR-004a**: The two brand fonts MUST be wired so the themed deploy is genuinely on-brand:
  **Fraunces** (display) and **Hanken Grotesk** (UI), loaded via `next/font/google` and exposed as
  the CSS variables `--font-display` and `--font-ui`. The "Weavova" wordmark and the tagline "The
  customer is the headline." MUST both be set in Fraunces (display). JetBrains Mono is NOT wired in
  this slice (deferred to T0.2).
- **FR-005**: The home surface MUST NOT include any product UI, navigation, data, fixtures,
  authentication, storage, jobs, or email — these belong to later slices and are out of scope.
- **FR-006**: A `.gitignore` MUST exclude `node_modules`, the framework build output (`.next`), and
  all environment files (`.env*`).
- **FR-007**: A continuous-integration workflow MUST run on every push and every pull request and
  MUST execute type-checking, linting, AND a production build (`next build`). Running the build in
  CI is required because a workflow that runs only type-check and lint can pass while the production
  build fails — which would then break the deploy this slice exists to de-risk.
- **FR-008**: The CI workflow MUST report a clear pass/fail status: it fails when type-check, lint,
  or the production build fails, and passes only when all three succeed.
- **FR-009**: The `README` MUST be updated to include a one-line description of Weavova, the locked
  technology stack, and the commands to run the app (dev, build, lint).
- **FR-010**: A production build, type-check, and lint MUST all complete with zero errors.
- **FR-011**: The slice MUST NOT add any dependency outside the constitution's locked stack
  (Principle III); the only additions are the framework scaffold and its standard tooling.
- **FR-012**: The application MUST be structured to deploy to a live URL on the project's hosting
  platform with no platform-incompatible code (no heavy/long-running server work in this slice).

### Key Entities

Not applicable — this slice introduces no data model. The database, schema, and fixtures are
deferred to tier T0.3.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Starting the local dev server and opening "/" shows the warm paper background, the
  "Weavova" wordmark, and the tagline "The customer is the headline." within a single page load,
  with no other content.
- **SC-001a**: The "Weavova" wordmark and the tagline are both rendered in **Fraunces** (display)
  loaded via `next/font/google`, and the `--font-display` (Fraunces) and `--font-ui` (Hanken
  Grotesk) CSS variables are present and applied. No JetBrains Mono, colour-token system, dark
  mode, spacing scale, or styleguide is introduced.
- **SC-002**: A production build (`next build`) completes with zero errors — both locally and in CI
  (the CI workflow runs the build, so a build failure blocks the commit).
- **SC-003**: Linting completes with zero errors.
- **SC-004**: Type-checking completes with zero errors under strict settings.
- **SC-005**: A push to the repository triggers the CI workflow, which runs type-check, lint, and
  the production build, and reports green when the code is clean.
- **SC-006**: A commit containing a deliberate type or lint error causes the CI check to report
  red; removing the error returns it to green.
- **SC-007**: The pre-existing `CLAUDE.md`, `design-reference/`, `docs/`, and `.specify/` are
  unchanged after scaffolding (verifiable by diff: no deletions or content replacement).
- **SC-008**: The application deploys to a live URL that serves the same themed landing as local.

## Constitution Alignment *(mandatory)*

- **Customer is the headline (P-II)**: The only rendered content is the customer-facing promise —
  the wordmark and the verbatim tagline "The customer is the headline." There is no competing
  chrome. This slice shows no proof yet, so the law is honoured trivially: nothing outranks the
  brand statement.
- **Port, don't redesign (P-V)**: No `/design-reference` screen is ported in this slice — the
  landing is a deliberately minimal skeleton, not one of the catalogued screens. The only visual
  values used (paper `#F7F2E8`, and the brand fonts Fraunces + Hanken Grotesk applied to the
  wordmark and tagline) come straight from the constitution and `CLAUDE.md`; no layout is invented
  beyond centring those two elements. The full colour-token system, spacing scale, JetBrains Mono,
  dark mode, and styleguide are deferred to T0.2. If a richer landing is ever wanted, it must be specified against
  a named reference screen (P-XII).
- **Locked stack (P-III)**: Uses only the constitution's locked stack — Next.js 15 App Router,
  React, TypeScript strict, Tailwind v4. No Auth, Neon/Drizzle, R2, Inngest, or Resend is wired in
  this slice; no dependency outside the locked stack is added (FR-011).
- **Fixtures-first (P-VI)**: Not applicable yet — this slice reads no data. Fixtures and the schema
  contract arrive at T0.3; nothing here pre-empts that shape.
- **Consent (P-VII)**: Not applicable — no proof or derived assets exist in this slice.
- **No editor (P-VIII)**: Not applicable — no studio or format surface in this slice.
- **Scope discipline (P-IX, P-XI)**: A single vertical slice within tier T0. Database, fixtures,
  auth, storage, jobs, email, the design-token system, and all product UI are explicitly out of
  scope and must not be added "while here."
- **Microcopy (P-XI)**: The only product copy is the wordmark and the tagline — no "amazing" /
  "awesome", no emoji.
- **Definition of done (Governance)**: This slice is complete only when it renders the themed
  landing, builds green, passes lint and strict type-check, runs green in CI on push/PR, is
  responsive/legible at the breakpoints, and preserves the existing read-only references.

## Assumptions

- **Hosting platform**: deployment targets Vercel, per the locked stack. Connecting the repository
  to Vercel is a one-time configuration step (outside code); the code deliverable is an app that
  builds and deploys without modification. A live URL is the goal of the slice but the connection
  step may be performed by the human.
- **CI provider**: continuous integration runs on GitHub Actions (the repository is a git repo with
  a GitHub remote assumed). The workflow needs no secrets or external services.
- **Wordmark**: "Weavova" is rendered as styled text (the brand wordmark), not an image asset — no
  logo files are introduced in this slice (logos are a later tier).
- **Fonts**: the two brand fonts ARE wired in this slice so the themed deploy is genuinely
  on-brand — **Fraunces** (display) and **Hanken Grotesk** (UI) via `next/font/google`, exposed as
  `--font-display` and `--font-ui`. The wordmark and tagline are set in Fraunces. **JetBrains Mono
  is deferred to T0.2** (along with the full colour-token system, dark mode, the spacing scale, and
  the styleguide); none of those are added here.
- **Theme scope**: only the default Daylight (light) palette is exercised (the single paper
  background value plus the two wired fonts); dark mode, the full colour-token system, the spacing
  scale, and the styleguide are deferred to T0.2.
- **Node/package manager**: a current LTS Node and npm are available; run commands are expressed as
  `npm run dev`, `npm run build`, `npm run lint`.
