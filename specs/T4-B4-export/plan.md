# Implementation Plan: T4-B4 — Export (post-ready content out of a proof clip)

**Branch**: `main` (a `T4-B4-export` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T4-B4-export/spec.md` with clarifications folded:
**Q1→B** single **+** bulk · **Q2→A** the sample stays the openly-labeled placeholder reference
(`SAMPLE_CLIP_URL` + byte-stable surfaces untouched) · **Q3→C** copy-to-clipboard for single,
download **one manifest** for bulk.

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Do **not** run git. **One
determination is offered for ratification at review** — the **dependency question** (research.md §1):
the plan's finding is **ZERO new dependencies** (native clipboard + native Blob download of one text
manifest; no zip). A secondary, **non-blocking** recommendation is the **manifest format**
(research.md §2: JSON recommended over CSV). When implemented, every change is left **uncommitted**
for Cornel to review and commit (mirrors prior slices).

## Summary

The **last T4 slice** and the demo loop's **payoff** — a proof clip leaves the app as **post-ready
content**. It ships **two real things** and keeps **one honest deferred seam**:

1. **Single-clip export (copy-to-clipboard).** On the clip-detail surface, a "Copy post text" island
   genuinely copies the **post-text package** — the customer headline (the verbatim proof — P-II),
   the brand hook/caption, and the proof attribution — to the clipboard (A-11). Owned data only.
2. **Bulk export (download one manifest).** The Library gains an **additive selection overlay**
   (the B1 inbox-selection pattern, applied to the byte-unchanged clip card) → "Export selected" →
   downloads **ONE manifest file** (JSON) of the selected clips' post-text. **No zip, no per-file
   fan-out** — one text artifact. The result is an **honest tally** (N exported, which skipped + why).
3. **Honest T8 seam (unchanged).** The clip's **video** is never exported as a finished clip. It is
   carried only as an **openly-labeled sample reference** ("sample — your rendered clip replaces this
   when rendering ships at T8"). `SAMPLE_CLIP_URL` and the stubbed surfaces are **untouched** (Q2:A).

**Two facts from the codebase shape this slice** (see research.md):

- **The customer headline is NOT on the existing clip read shapes.** `ClipDetailView` (`getClip`) and
  `LibraryClipView` (`getLibraryClips`) carry the brand `hook` and attribution but **not** the
  customer's verbatim `quote` / `transcript`. Since the headline is the **centerpiece** of the
  post-text package (P-II), export needs a **new additive consent-gated read** that selects the
  already-existing `proof.quote` / `proof.transcript` columns. The existing read shapes stay
  **byte-unchanged** (FR-008) — export adds a **new** `PostTextPackage` shape beside them.
- **The Library is a pure Server Component** (no client island today). Bulk selection needs a thin
  **client wrapper** (`LibraryClient`) mirroring the B1 `InboxClient` — owning `selecting` + the
  selected-id set, rendering the **byte-unchanged** `LibraryClipCard` with a **sibling** selection
  overlay (never inside the card — FR-009), plus a sticky selection bar. No new route, **no nav
  entry** (export lives on the existing `/app/clip/[id]` and `/app/library` — the rail is untouched).

**Consent (P-VII) stays sovereign and reused — no new gate.** Export is just one more
**consent-gated read** through the existing shared `effectiveConsentGranted` predicate:

- **Single**: the clip-detail page is already consent-gated at render (a withdrawn clip's detail
  `notFound()`s). The new export read is gated the same way — a withdrawn clip yields no package.
- **Bulk**: the `exportClips` Server Action re-reads **current** effective consent **at action time**
  via the gated read (never the cached selection) — a clip granted at select but withdrawn before
  export is **absent from the result → skipped**, reported honestly. This is the **B1 race pattern**
  (generateBatch's per-proof re-check), applied to reads.

**No schema change.** Export is **read + produce**: it selects existing owned columns and emits a
clipboard string / a manifest file. **No new tables, columns, enums, or migration** — confirmed.

**Byte-stable.** `ProofCard`, the proof / `ClipView` / `LibraryClipView` / `ClipDetailView` /
showcase **read shapes**, `getClip` / `getLibraryClips` / `getProof*` / `getShowcase`, `generateClip`,
`generateBatch`, the **`LibraryClipCard` shape**, and the **nav rail** are all unchanged. Everything
B4 adds — the new read(s), the `src/lib/export.ts` contract, the copy island, the `LibraryClient`
wrapper + selection bar, and the `exportClips` action — is **additive**.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: **NONE NEW** (the determination to ratify — research.md §1). Native Web
APIs only: `navigator.clipboard.writeText` (single) and `Blob` + object-URL + anchor `download`
(bulk). `JSON.stringify` for the manifest. No zip lib, no file-saver, no CSV lib.

**Storage**: Neon Postgres + Drizzle (reads only). No writes, no migration. Cloudflare R2 untouched
(the sample is a labeled reference, not promoted — Q2:A).

**Testing**: manual quickstart validation on fixtures (project convention; no automated suite). Build
green via `npm run build` / `npm run lint`.

**Target Platform**: Vercel (Next.js App Router). No heavy render (T8 seam intact).

**Project Type**: Web application (single Next.js app, `src/`).

**Performance Goals**: instant copy (one synchronous clipboard write in the click gesture); bulk
manifest is one read + one in-memory string build for a small selection — no per-file work.

**Constraints**: owned data only (FR-019 — no metrics); the video is **never** a finished-clip file;
consent re-checked at read time (P-VII); existing read shapes + components byte-stable.

**Scale/Scope**: workspace-scoped; a Library selection is a handful-to-dozens of clips (fixtures
scale). One new lib module, two additive reads (or one read used for both), one Server Action, one
copy island, one Library client wrapper + selection bar, one optional slot on `ClipDetail`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Customer is the headline (P-II)**: PASS — the **customer's verbatim proof is the centerpiece**
      of the post-text package and the first/largest line of the copied text; the brand hook is
      clearly the brand's secondary line; attribution credits the named, verified customer.
- [x] **Locked stack (P-III)**: PASS — Next.js 15 / React 19 / TS strict, Tailwind v4, Neon +
      Drizzle (reads). **No new dependency** (native clipboard + native Blob). Heavy render stays off
      Vercel — the video is a labeled sample, never rendered/exported.
- [x] **Pressroom tokens (P-IV)**: PASS — the copy button + selection bar reuse the **exact** tokens
      and patterns already shipped on the clip detail (the persimmon primary, `rounded-control`) and
      the B1 selection bar (`shadow-modal`, `bg-card`, on-token type). Persimmon stays on the primary
      action + the verified mark only.
- [x] **Port, don't redesign (P-V)**: PASS with the documented gap — the `/design-reference` **B4
      screen is a duplicate of the B1 Batch-studio modal** (no export layout exists). Per **P-XII**
      the missing layout is **derived** (precedent: T3.2 clip-detail), composed from existing
      surfaces + tokens; the bulk selection overlay is **ported from B1's inbox selection** verbatim.
- [x] **Fixtures-first (P-VI)**: PASS — built and demonstrated on the existing fixtures; the export
      read selects the same owned columns real data carries. No schema change.
- [x] **Consent enforcement (P-VII)**: PASS — reuses the **existing** shared `effectiveConsentGranted`
      gate; withdrawn proof yields no exportable clip (single or bulk); the bulk action re-checks at
      read time (the B1 race). No new gate; the `derived_asset` cascade is untouched.
- [x] **No editor (P-VIII)**: PASS — N/A; export adds no studio/timeline/scrubber. It is read +
      produce.
- [x] **SDD scope (P-IX, P-XI)**: PASS — one vertical slice (single + bulk export); no publishing, no
      platform/API integration, no real render, no analytics (those are T8/T9). No "while I'm here".
- [x] **Ambiguity handling (P-XII)**: PASS — the missing export layout is raised + derived, not
      guessed; the dependency + manifest-format questions are surfaced in research.md for ratification.

**Definition of done (P-Governance)** — render on fixtures; handle empty (no clips / empty selection),
loading (existing skeletons), and error (copy/clipboard fallback, action failure → honest message)
states; responsive at `480 / 1024 / 1280`; Pressroom tokens exact; keyboard-accessible (the copy
button, the selection toggles/checkboxes, the bar); pass acceptance criteria; build green.

## Project Structure

### Documentation (this feature)

```text
specs/T4-B4-export/
├── plan.md              # This file
├── research.md          # Phase 0 — the dependency determination (§1, to ratify) + manifest format (§2) + decisions
├── data-model.md        # Phase 1 — no schema change; the PostTextPackage read shape + reuse map
├── quickstart.md        # Phase 1 — manual validation (single copy, bulk manifest, consent gate, byte-stability)
├── contracts/
│   ├── post-text-package.md   # the owned post-text contract + the copy-text + JSON manifest formats
│   └── export-actions.md      # exportClips Server Action contract + the new reads + the copy-island contract
└── tasks.md             # Phase 2 (/speckit.tasks — NOT created here)
```

### Source Code (repository root) — all additions are ADDITIVE

```text
src/
├── lib/
│   ├── export.ts                         # NEW — PostTextPackage type, formatPostText(), buildManifest(), SAMPLE note constant (client-safe, type-only schema imports)
│   ├── clip.ts                           # UNCHANGED (ClipView/LibraryClipView/ClipDetailView/SAMPLE_CLIP_URL byte-stable)
│   └── studio.ts                         # UNCHANGED
├── db/
│   └── queries.ts                        # ADD getClipExport()/getClipExports() (consent-gated reads); existing reads byte-unchanged
├── app/app/
│   ├── clip/[id]/page.tsx                # UNCHANGED (still streams ClipDetailData)
│   ├── library/
│   │   ├── page.tsx                      # UNCHANGED (still streams LibraryData)
│   │   └── actions.ts                    # NEW — exportClips() Server Action (re-checks consent via getClipExports)
└── components/app/
    ├── clip-detail/
    │   ├── clip-detail-data.tsx          # ADD the getClipExport read + render the copy island into ClipDetail's action slot
    │   ├── clip-detail.tsx               # ADD one optional slot prop (additive) for the export island; existing markup byte-stable
    │   └── clip-export-button.tsx        # NEW — "use client" copy-to-clipboard island (A-11 + fallback)
    └── library/
        ├── library-data.tsx             # ADD: render LibraryClient (wrapping the grid) instead of LibraryGrid directly
        ├── library-client.tsx           # NEW — "use client" selection wrapper (B1 InboxClient pattern); owns selecting + selected set
        ├── library-grid.tsx             # ADD selection props passthrough (additive); header/markup byte-stable
        ├── library-clip-card.tsx        # UNCHANGED shape — selection overlay is a SIBLING, added by LibraryClient/grid
        └── library-selection-bar.tsx    # NEW — "use client" sticky bar: "Export selected" → exportClips → download manifest + honest tally
```

**Structure Decision**: Single Next.js app under `src/` (the established layout). Export is a
**derived surface** (no portable design-reference). Single export attaches to the existing
`/app/clip/[id]`; bulk attaches to `/app/library` via a thin client wrapper. **No new route, no nav
entry** — the rail is byte-stable.

## Phasing within the slice

1. **Contract + read (the spine).** `src/lib/export.ts` (`PostTextPackage`, `formatPostText`,
   `buildManifest`, the sample-note constant) + `getClipExport`/`getClipExports` in `queries.ts`
   (consent-gated, `withDbRetry`). This is the owned, honest payload — everything else consumes it.
2. **Single (copy).** `clip-export-button.tsx` island + wire it through `clip-detail-data.tsx`
   (additive read) into an additive slot on `clip-detail.tsx`. A-11: really copies, with fallback.
3. **Bulk (manifest).** `library-client.tsx` (selection state) + `library-selection-bar.tsx`
   (Export selected → `exportClips` → Blob download + honest tally) + the additive selection overlay
   on the grid/card sibling. `exportClips` re-checks consent at read time.
4. **States + polish.** Empty selection (no-op/disabled), clipboard-unavailable fallback, action
   failure → honest message, keyboard access, responsive, build green.

## Complexity Tracking

*No Constitution violations. No new dependency, no schema change, no new route. Table omitted.*
