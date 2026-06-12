# Quickstart — Validate T0.1 Walking Skeleton

Runnable validation scenarios that prove the slice end-to-end. Run after `/speckit.implement`.
Each scenario maps to a Success Criterion in [spec.md](./spec.md). This guide does not contain
implementation code — see plan.md / research.md for the build approach.

## Prerequisites

- Node.js 20 LTS and npm available.
- Dependencies installed: `npm ci` (or `npm install` on first run).

## 1. Local render — SC-001 / SC-001a (User Story 1)

```bash
npm run dev
# open http://localhost:3000/
```

**Expect**: warm paper background (`#F7F2E8`); the "Weavova" wordmark and the tagline
"The customer is the headline." — both in Fraunces — centred; nothing else on the page.

**Check fonts/variables**: in devtools, the computed `--font-display` (Fraunces) and `--font-ui`
(Hanken Grotesk) variables are present; the wordmark/tagline use the display family. No JetBrains
Mono, colour-token system, dark mode, or styleguide is present.

## 2. Type-check — SC-004

```bash
npm run typecheck    # tsc --noEmit, strict
```

**Expect**: exits 0, zero errors.

## 3. Lint — SC-003

```bash
npm run lint
```

**Expect**: exits 0, zero errors.

## 4. Production build — SC-002

```bash
npm run build
```

**Expect**: completes with zero errors and produces deployable output.

## 5. CI is green on push — SC-005 (User Story 2)

- Push a commit; open a pull request.
- **Expect**: the GitHub Actions workflow runs `typecheck` + lint + production build (`next build`)
  on push and on the PR and reports green for clean code.

## 6. CI catches a regression — SC-006

- On a scratch branch, introduce a deliberate type error (e.g. assign a `string` to a `number`) or
  a lint error; push.
- **Expect**: the CI check turns **red**.
- Remove the error; push.
- **Expect**: the CI check returns **green**.

## 7. Protected files preserved — SC-007

```bash
git status
git diff -- CLAUDE.md
```

**Expect**: `CLAUDE.md` shows only the SPECKIT marker-block pointer update (no other change);
`design-reference/`, `docs/`, and `.specify/` are unchanged — no deletions, no content replacement.

## 8. Live deploy — SC-008 (User Story 3)

- Connect the repository to Vercel (one-time, zero-config import) and deploy.
- **Expect**: the live URL serves the same warm-paper landing (wordmark + tagline in Fraunces) as
  local, with no platform-incompatible code paths.

## Definition of done (Governance)

Renders the themed landing · builds green · lint green · strict type-check green · CI green on
push/PR · legible/responsive at `480 / 1024 / 1280` · existing read-only references preserved.
