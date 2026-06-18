# Implementation Plan: T4-B1 — Batch studio (bulk clip generation)

**Branch**: `main` (a `T4-B1-batch-studio` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T4-B1-batch-studio/spec.md` (Status: clarifications RESOLVED — Q1 one batch format, Q2 non-granted un-selectable + per-proof re-check, Q3 inline action bar + honest summary, no route)

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Stop and report after Phase 2
planning. When implemented, the implementation will **leave every change uncommitted** — Cornel reviews and
commits manually (mirrors the prior slices).

## Summary

The first T4 slice — **"one recipe, many clips"**. It (1) **wires the inbox's deferred selection cluster**
(per-proof selection, "Select all ready", "Make clips" — the cluster T2.2 FR-014c deferred to T4) and (2)
adds a **batch-generate** flow that produces one clip per selected proof, **reusing the T2.4b studio's
machinery verbatim** (the single-attempt insert per proof, the hand-rolled input guard, the shared
`SAMPLE_CLIP_URL` sample/preview stub).

It is the inbox **in selection mode** (B1), **inline — no new route** (Q3). The selection control is a
**sibling overlay** on each card — **ProofCard stays byte-unchanged** (exactly as the T2.2 stretched-link nav
sits beside the card, never inside it). A **selection-action bar** appears when ≥1 proof is selected: *N
selected · one batch format picker (Q1) · "Make clips"*. **"Select all ready" selects only granted** proofs;
non-granted proofs show **"needs consent"** and are **not selectable** (Q2).

**P-VII is enforced per proof, at generate.** A new **`generateBatch` Server Action** loops the selected
proofs and, for each, **re-reads current effective consent** (`getGrantedConsentId` — never cached from
selection, covering the revoked-after-select race) and writes a clip **only if granted** (`insertDerivedAsset`
— single attempt, D4); a non-granted proof is **skipped** with an honest reason; an insert failure is
reported **failed**. It returns an **honest per-proof outcome** (N made · M skipped + reason · failed) — no
all-or-nothing fiction (FR-019). "Make clips" is **disabled while pending** (no double-submit).

The new clips **light up the Library, dashboard, and showcase through the existing reads** — **no read
changes, no `queries.ts` change** (the batch reuses the existing `getGrantedConsentId` + `insertDerivedAsset`
and revalidates the affected paths once). Reads stay `withDbRetry`-wrapped; inserts stay single-attempt.

**No schema change** (reuses `derived_asset`). **No new dependency.** **ProofCard + every shared shape +
every existing read + the T2.4b single-clip studio are byte-unchanged.**

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing only — `next`, `react`, `drizzle-orm`, `@neondatabase/serverless`,
`lucide-react`. **No new dependency.**

**Storage**: Neon Postgres via the lazy `getDb()` + Drizzle. **No schema change, no new query** — the batch
**reuses** the existing `getGrantedConsentId` (consent re-check) + `insertDerivedAsset` (single-attempt
write) per proof. No migration.

**Testing**: No unit-test runner. Verification = `npm run typecheck`/`lint`/`build` (green **without**
`DATABASE_URL`) + the `quickstart.md` manual checks (batch generate; per-proof consent skip; honest partial
result; clips on Library/dashboard/showcase; byte-stability; no new dep).

**Target Platform**: Vercel; modern browsers. The flow lives in the existing `/app/proof` (inbox) route —
no new route. The inbox client island gains selection state; the batch is a Server Action.

**Performance Goals**: Demo scale. The batch issues, per proof, one consent re-check read (`withDbRetry`) +
one insert (single attempt), then **one** round of `revalidatePath`. Selection/derivation stay in memory
(the inbox's existing pattern).

**Constraints**: Drizzle only; Server Components by default (the inbox island + the action bar are the
client pieces); Tailwind classes only; `withDbRetry` on reads; per-proof inserts single-attempt (D4);
P-VII re-checked per proof at generate; owned values only (FR-019); A-11 (the deferred cluster is wired
because its home now exists; out-of-scope controls stay hidden); **ProofCard byte-unchanged** (selection is a
sibling overlay); existing reads + the single-clip studio byte-stable; no schema change; no new dependency.

**Scale/Scope**: One new Server Action (`generateBatch`), additive batch types in `src/lib/studio.ts`, a new
selection-action-bar component, and selection wiring into the existing inbox client/wall/toolbar (T2.2
components). No new route, no new read, no schema change.

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS — no violations to justify.*

- [x] **Customer is the headline (P-II)**: Selection chrome is a light sibling overlay; the proof cards (the
      customers' words) stay the largest element; the action bar is quiet chrome.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, R2
      sample. **No new dependency.** Clips stay sample-stubbed; heavy render off Vercel (T8).
- [x] **Pressroom tokens (P-IV)**: On-token only; persimmon reserved for the primary action ("Make clips") +
      the verified mark.
- [x] **Port, don't redesign (P-V)**: Ported from **B1** (the inbox in selection mode) + screen 02. The
      selection-action bar / one-format picker is the bulk analog of the studio control; the cluster T2.2
      deferred is wired because its home (this slice) exists (A-11). List/warmth/upload/export stay deferred.
      Format/consent/flow resolved as Q1–Q3 (P-XII).
- [x] **Fixtures-first (P-VI)**: Reuses the existing reads + `derived_asset`; the seed's granted + withdrawn
      proofs exercise made vs skipped. No schema change.
- [x] **Consent enforcement (P-VII)**: Re-checked **per proof at generate** via `getGrantedConsentId` (the
      shared gate) — the batch can never write a clip for a non-granted proof; non-granted is un-selectable
      up front AND re-checked at generate (revoked-after-select); the studio's read-time withdrawal still
      governs visibility after.
- [x] **No editor (P-VIII)**: N/A — select + one-format + generate; no editor.
- [x] **SDD scope (P-IX, P-XI)**: One vertical slice — wire selection + the batch generate + honest result.
      Warmth (B3) / upload (B2) / export (B4), the real engine (T8), and List are out of scope. No
      speculative additions; no fabricated success.
- [x] **Ambiguity handling (P-XII)**: Q1 (format), Q2 (consent/selection), Q3 (surface + honest result)
      resolved against B1/screen-02 before this plan.

**Definition of done (P-Governance)**: renders on real (fixture) data (select → batch → made clips on
Library/dashboard/showcase); handles in-progress / honest partial result / shared error; responsive across
`480 / 1024 / 1280` (+1240 max); keyboard-accessible (toggle-select, select-all, format, generate, dismiss);
matches Pressroom tokens; builds green without `DATABASE_URL`. Tracked in `quickstart.md`.

## Architecture & Data Flow

### Selection model (client; ProofCard byte-unchanged)

- The inbox client island (`inbox-client.tsx`) gains selection state: `selecting: boolean`, `selected:
  Set<string>` (proof ids). It already holds the filtered/sorted `visible` list in memory.
- **Entering selection**: a "Make clips" control (surfaced in `inbox-toolbar.tsx` — the deferred cluster)
  toggles `selecting`. Exiting clears the set.
- **"Select all ready"**: selects the **granted** proofs among `visible` (`consentState === 'granted'`).
  Non-granted are excluded (Q2/FR-003).
- **Per-card selection (sibling overlay — `inbox-wall.tsx`)**: the wall already wraps each byte-unchanged
  `ProofCard` in a `relative` container with a **sibling** stretched-link. In selection mode it renders,
  instead of the nav link, a **sibling selection overlay**: for a **granted** proof a toggle (checkbox /
  selected ring) bound to `selected`; for a **non-granted** proof a non-interactive **"needs consent"** badge
  (not selectable). The stretched-link nav is **suppressed while selecting** (a card toggles selection, not
  navigates — FR-002 / edge case). **ProofCard is not modified** — `ProofView` already carries `id` +
  `consentState`, all the overlay needs.

### The selection-action bar (`inbox-selection-bar.tsx`, Client; Q3)

Appears when `selected.size ≥ 1`: **"{n} selected"** · a **one-format picker** over `FORMAT_OPTIONS`
(default `9x16`) · **"Make clips"** (persimmon) · a clear/exit affordance. On "Make clips" it calls the
`generateBatch` Server Action with `{ proofIds: [...selected], format }`, **disables the button while
pending** (no double-submit), then renders the **honest per-proof result** in place (see below). Owned values
only (the selected count, the result counts) — no fabricated success (FR-012).

### The batch Server Action (`src/app/app/proof/actions.ts`, `"use server"`)

`generateBatch(input: { proofIds: string[]; format: ClipFormat }): Promise<BatchResult>`:
1. **Resolve identity** server-side — `workspaceId` from `getCurrentWorkspace()` (never trusted from the
   client).
2. **For each proofId** (sequential or bounded), reusing the **T2.4b building blocks**:
   - **validate** via the existing `validateGenerateInput({ proofId, format, hook: "" })` (the hand-rolled
     guard — format ∈ `ClipFormat`; batch carries no hook → `null`); invalid → `{ proofId, status: 'error' }`.
   - **re-check consent (P-VII)**: `getGrantedConsentId(workspaceId, proofId)`; `null` → `{ proofId, status:
     'skipped', reason: 'needs_consent' }`, **no write**.
   - **write (granted only)**: `insertDerivedAsset({ workspaceId, proofId, consentId, kind:'clip', format,
     assetUrl: SAMPLE_CLIP_URL, hook: null })` — **single attempt** (D4, not retry-wrapped); on throw →
     `{ proofId, status: 'error' }`.
3. **Revalidate once** at the end: `revalidatePath('/app/library')`, `revalidatePath('/app')`,
   `revalidatePath('/app/showcase')`, and `revalidatePath('/app/proof/[id]')` for each made proof (or the
   inbox path) — so the **existing reads** surface the new clips.
4. **Return** `BatchResult` — the per-proof outcomes + tallies. **No batch transaction / no rollback** (each
   insert is independent — D4); the action never throws for a per-proof failure (those are in the result),
   only a genuine global failure (e.g. no workspace) propagates.

> **Reuse, don't fork**: `generateBatch` calls the **same** `getGrantedConsentId` / `insertDerivedAsset` /
> `validateGenerateInput` / `SAMPLE_CLIP_URL` the single-clip `generateClip` uses. `generateClip` itself is
> **unchanged** (the single-clip studio keeps working as-is). The only reason `generateBatch` isn't N calls
> to `generateClip` is to revalidate **once** (not N times) and to collect a per-proof result.

### Batch types (`src/lib/studio.ts`, additive)

```text
type BatchSkipReason = 'needs_consent';
type BatchItemResult = { proofId: string; status: 'made' | 'skipped' | 'error'; reason?: BatchSkipReason };
type BatchResult = { made: number; skipped: number; failed: number; items: BatchItemResult[] };
```
Additive — `GenerateInput`/`GenerateResult`/`validateGenerateInput`/`FORMAT_OPTIONS`/`DEFAULT_FORMAT` are
**unchanged**.

### The honest result (FR-007)

The action bar renders the returned `BatchResult` in place: **"{made} clips made"**, and — when non-zero —
**"{skipped} skipped · needs consent"** and **"{failed} couldn't be made — try again"** (with the made clips
already persisted + revalidated onto the Library/dashboard/showcase). No all-or-nothing claim; skipped/failed
are never faked.

### Byte-stability (asserted)

ProofCard, `src/lib/proof.ts` (`ProofView`/`ProofCardProps`/`ProofDetailView`), `src/lib/clip.ts` (`ClipView`/
`LibraryClipView`/`ClipDetailView`), `src/lib/showcase.ts` (`ShowcaseItem`), **every read in `src/db/queries.ts`**
(incl. `getProofs`, `getGrantedConsentId`, `insertDerivedAsset`, `getLibraryClips`, `getDashboardSummary`,
`getShowcase`, `getClip`, `getProofClips`), the studio's `generateClip`, and `src/db/schema.ts` are
**unchanged**. The slice **adds** `generateBatch` + the batch types + the selection-action bar, and **edits
the T2.2 inbox components** (`inbox-client`/`inbox-wall`/`inbox-toolbar`) to add selection — **without
touching ProofCard** (the selection control is a sibling overlay).

## Project Structure

### Documentation (this feature)

```text
specs/T4-B1-batch-studio/
├── plan.md              # This file
├── research.md          # Phase 0 — D1 sibling-overlay selection, D2 reuse-not-fork generateBatch,
│                        #            D3 per-proof P-VII re-check, D4 honest partial result, D5 no read/route change
├── data-model.md        # Phase 1 — the transient selection + BatchResult; the per-proof write (reuse)
├── contracts/
│   ├── batch-action.md          # generateBatch signature, the per-proof loop, reuse, revalidate, byte-stability
│   └── selection-surface.md     # the selection overlay + action bar + honest result; A-11; ProofCard untouched
├── quickstart.md        # Phase 1 — select → make clips; per-proof skip; honest result; surfaces light up; DoD
└── checklists/requirements.md   # (from /speckit.specify; Q1–Q3 resolved)
```

### Source Code — files this slice adds / changes

```text
src/
├── app/app/proof/actions.ts                # ADD: "use server" generateBatch — per-proof re-check + single-attempt
│                                           #   insert (reusing getGrantedConsentId/insertDerivedAsset/validateGenerateInput/
│                                           #   SAMPLE_CLIP_URL), revalidate once, honest BatchResult.
├── lib/studio.ts                           # CHANGE (ADD): BatchItemResult / BatchResult (+ reason). Existing exports unchanged.
└── components/app/proof-inbox/
    ├── inbox-client.tsx                    # CHANGE: selection state (selecting + Set<id>); render <InboxSelectionBar>;
    │                                       #   "select all ready" (granted only); pass selection into <InboxWall>.
    ├── inbox-wall.tsx                      # CHANGE: in selection mode render a SIBLING selection overlay per card
    │                                       #   (granted → toggle; non-granted → "needs consent"), suppress the nav link.
    │                                       #   ProofCard byte-UNCHANGED.
    ├── inbox-toolbar.tsx                   # CHANGE: surface the deferred "Make clips" (enter selection) + "Select all ready".
    └── inbox-selection-bar.tsx             # ADD: Client — "{n} selected · format · Make clips" + the honest per-proof result.

# UNCHANGED (asserted in quickstart DoD checks):
#   src/components/proof-card.tsx                                  (byte-identical — selection is a sibling overlay)
#   src/lib/proof.ts / src/lib/clip.ts / src/lib/showcase.ts      (view shapes unchanged; studio.ts only gains batch types)
#   src/db/queries.ts — ALL reads + getGrantedConsentId + insertDerivedAsset  (REUSED, unchanged; NO new query, NO read change)
#   src/app/app/proof/[id]/studio/actions.ts → generateClip       (single-clip studio unchanged)
#   src/db/schema.ts                                              (NO schema change)
#   the Library / dashboard / showcase / proof-detail surfaces + reads  (light up via revalidation only)
```

**Structure Decision**: Single Next.js App Router project. No new route — the batch lives in the existing
`/app/proof` inbox (selection + the action bar). The mutation is a co-located Server Action
(`app/app/proof/actions.ts`) reusing the T2.4b DB building blocks; batch types extend `src/lib/studio.ts`;
selection wires into the existing T2.2 inbox components with ProofCard untouched.

## Phase 0 — Outline & Research

All Technical Context items are known; research records the design choices (full write-up in `research.md`):

- **D1 — Selection is a sibling overlay; ProofCard byte-unchanged**: T2.2 FR-014c deferred selection because
  ProofCard carries no selection prop; the overlay sits beside the card (as the stretched-link nav does),
  toggling `selected`; nav is suppressed in selection mode. Chosen over adding a selection prop to ProofCard
  (would break byte-stability).
- **D2 — `generateBatch` reuses, doesn't fork**: it calls the **same** `getGrantedConsentId` /
  `insertDerivedAsset` / `validateGenerateInput` / `SAMPLE_CLIP_URL` as `generateClip`; the single-clip action
  is unchanged. Not N calls to `generateClip` — to revalidate once and collect a per-proof result.
- **D3 — P-VII re-checked per proof, at generate**: each proof's consent is re-read at generate (never cached
  from selection), so a proof revoked after selecting is skipped. Non-granted is also un-selectable up front
  (Q2) — belt-and-braces.
- **D4 — Honest partial result, no all-or-nothing**: each insert is its own single attempt (D4); the action
  returns per-proof made/skipped/failed and never rolls back or fakes success (FR-019).
- **D5 — No read change, no new route**: the made clips surface via the existing reads after one revalidate;
  the flow lives inline in the inbox (Q3). No `queries.ts` change.

**Output**: `research.md` (no NEEDS CLARIFICATION remain — Q1–Q3 resolved in the spec; D1–D5 recorded).

## Phase 1 — Design & Contracts

- **`data-model.md`**: the transient selection (selected proof ids + the one batch format), the additive
  `BatchResult`/`BatchItemResult` types, and the per-proof write (reusing `insertDerivedAsset`) — no
  entity/schema change, no new read.
- **`contracts/batch-action.md`**: `generateBatch` signature, the per-proof loop (validate → re-check →
  single-attempt insert → outcome), the reuse of the T2.4b building blocks, the single revalidate, and the
  byte-stability assertions (incl. `generateClip` + `queries.ts` unchanged).
- **`contracts/selection-surface.md`**: the sibling selection overlay (granted toggle vs "needs consent"),
  the suppressed nav in selection mode, the selection-action bar (one-format picker + "Make clips" +
  disabled-while-pending), the honest per-proof result, and the A-11 omissions (no warmth/upload/export/List)
  — with the ProofCard-byte-unchanged + FR-019 + P-VII assertions.
- **`quickstart.md`**: enter selection → "Select all ready" (granted only) / pick proofs → pick a format →
  "Make clips" → confirm one clip per granted proof (sample/preview), a non-granted proof skipped with
  "needs consent", the honest per-proof summary; confirm the clips on the Library/dashboard/showcase via the
  existing reads; the DoD gates (ProofCard byte-unchanged; no read/schema/dep change; no warmth/upload/export/
  List; build green without `DATABASE_URL`; responsive + keyboard).
- **Agent context**: update the `<!-- SPECKIT START/END -->` pointer in `CLAUDE.md` to this plan and mark
  T4-B1 the active slice (the only edit outside `specs/` during planning; left **uncommitted**).

**Re-check Constitution after Phase 1**: still all PASS — selection as a sibling overlay (ProofCard
unchanged), `generateBatch` reuses the studio machinery (no fork, no read/schema change), P-VII re-checked
per proof, honest partial result (FR-019), every existing read + the single-clip studio byte-stable, no new
dependency.

## Complexity Tracking

No constitution violations to justify — the table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
