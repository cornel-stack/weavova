---
description: "Task list for T4-B1 — Batch studio (bulk clip generation): inbox selection mode + generateBatch reusing T2.4b primitives"
---

# Tasks: T4-B1 — Batch studio (bulk clip generation)

**Input**: Design documents from `specs/T4-B1-batch-studio/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D5), data-model.md, contracts/{batch-action,selection-surface}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Prerequisite slices**: T2.2 (the inbox + the deferred selection cluster), T2.4b (the studio primitives —
`generateClip`, `getGrantedConsentId`, `insertDerivedAsset`, `validateGenerateInput`, `SAMPLE_CLIP_URL`,
`FORMAT_OPTIONS`/`DEFAULT_FORMAT`), T3 + Showcase (the reads the clips light up) — all shipped. **This slice
does NOT change the schema, add a read, or alter `generateClip`** (it reuses the primitives per proof).
**Tests**: NOT requested (no test runner). Verification via `npm run typecheck`/`lint`/`build` (green
**without** `DATABASE_URL`) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented, scaffolded,
> or run. Execution happens in `/speckit.implement` AFTER human approval.
> **At implementation, leave EVERYTHING uncommitted** — no per-task commits, no push/merge. Cornel reviews
> and commits manually on the `T4-B1-batch-studio` branch (mirrors the prior slices).

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US3 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (the batch result types — no UI/action yet)

- [X] T001 [P] Add the batch result types to `src/lib/studio.ts` (ADD only): `BatchSkipReason = 'needs_consent'`;
  `BatchItemResult = { proofId: string; status: 'made' | 'skipped' | 'error'; reason?: BatchSkipReason }`;
  `BatchResult = { made: number; skipped: number; failed: number; items: BatchItemResult[] }`. The existing
  `GenerateInput`/`GenerateResult`/`validateGenerateInput`/`FORMAT_OPTIONS`/`DEFAULT_FORMAT`/`HOOK_MAX_LENGTH`
  stay **byte-unchanged**. Per `data-model.md` §2. → FR-007 (FR-019)

**Checkpoint**: the batch result shape exists; existing studio exports unchanged. No action, no UI yet.

---

## Phase 2: Foundational (the batch Server Action — reuses the T2.4b primitives; BLOCKS the surface)

**⚠️ CRITICAL**: P-VII is enforced INSIDE this loop, per proof, at generate.

- [X] T002 Create the batch Server Action `src/app/app/proof/actions.ts` (`"use server"`)
  **`generateBatch({ proofIds: string[]; format: ClipFormat }): Promise<BatchResult>`** (D2 — reuse, not
  fork): resolve `workspaceId` from `getCurrentWorkspace()` (never client). **Loop the selected proofs**;
  per proof, in order: (a) `validateGenerateInput({ proofId, format, hook: "" })` → invalid →
  `{ proofId, status: 'error' }`; (b) **re-check consent** `getGrantedConsentId(workspaceId, proofId)` →
  `null` → `{ proofId, status: 'skipped', reason: 'needs_consent' }` **no write** (P-VII, re-read at
  generate — NOT the cached selection view); (c) granted → `insertDerivedAsset({ workspaceId, proofId,
  consentId, kind:'clip', format, assetUrl: SAMPLE_CLIP_URL, hook: null })` **single attempt** (D4, not
  retry-wrapped) → throw → `{ proofId, status: 'error' }`, else `{ proofId, status: 'made' }`. After the
  loop, **revalidate ONCE**: `revalidatePath('/app/library')`, `revalidatePath('/app')`,
  `revalidatePath('/app/showcase')`, and the made proofs' `revalidatePath('/app/proof/[id]')`. Return the
  tallied `BatchResult`. The action **never throws** on a per-proof failure (only a genuine global failure
  propagates). **Reuse** the existing `getGrantedConsentId`/`insertDerivedAsset`/`validateGenerateInput`/
  `SAMPLE_CLIP_URL` — **do NOT modify `generateClip` or `src/db/queries.ts`** (no new read, no schema change).
  Per `contracts/batch-action.md`, research D2/D3/D4. → FR-005, FR-006, FR-007, FR-008, FR-009 (P-VII, FR-019)

**Checkpoint**: a workspace-scoped batch action exists that re-checks consent per proof, writes only granted
(single attempt each), revalidates once, and returns an honest per-proof result; `generateClip`/`queries.ts`
untouched.

---

## Phase 3: User Story 1 — Select proofs and batch-generate clips (Priority: P1) 🎯 MVP

**Goal**: enter selection in the inbox, pick granted proofs (or "Select all ready"), pick a format, "Make
clips" → one clip per proof + an honest result; the clips light up Library/dashboard/showcase.
**Independent Test**: select 2–3 granted proofs, pick a format, "Make clips"; confirm one clip per proof
(sample/preview) + an honest count; clips appear on the existing surfaces (quickstart §1–5).

- [X] T003 [US1] Add **selection state** to `src/components/app/proof-inbox/inbox-client.tsx` (Client):
  `selecting: boolean`, `selected: Set<string>` (proof ids), `format: ClipFormat` (default `DEFAULT_FORMAT`);
  a "Select all ready" handler that sets `selected` to the **granted** proofs among the visible list
  (`consentState === 'granted'`); pass `selecting`/`selected`/toggle into `<InboxWall>` and render
  `<InboxSelectionBar>` when `selected.size ≥ 1`. Keep the existing in-memory filter/sort/search intact. →
  FR-001, FR-002, FR-003 (D1)
- [X] T004 [US1] Add the **sibling selection overlay** to `src/components/app/proof-inbox/inbox-wall.tsx`
  (D1): in selection mode, instead of the stretched-link nav, render a **sibling** overlay per card — a
  **selection toggle** for a **granted** proof (checkbox/selected ring bound to `selected`; `aria`-correct,
  visible focus) and a non-interactive **"needs consent"** badge for a **non-granted** proof (not
  selectable). **Suppress the nav link while selecting** (a select-click never navigates). **ProofCard stays
  byte-UNCHANGED** (`ProofView.id`/`consentState` drive the overlay). → FR-001, FR-002, FR-003 (P-II, A-11)
- [X] T005 [US1] Surface the deferred cluster in `src/components/app/proof-inbox/inbox-toolbar.tsx`: render
  the **"Make clips"** control (toggles `selecting`) + **"Select all ready"** (the T2.2 FR-014c cluster, now
  wired because its home exists). Keep the inbox **List** view deferred (still undesigned — out of scope). →
  FR-001 (A-11)
- [X] T006 [US1] Create `src/components/app/proof-inbox/inbox-selection-bar.tsx` (Client): the
  **selection-action bar** shown when ≥1 selected — **"{n} selected"** + a **one-format picker** over
  `FORMAT_OPTIONS` (default `9x16`) + **"Make clips"** (persimmon) + a clear/exit affordance. On "Make clips"
  call `generateBatch({ proofIds: [...selected], format })`; **disable the button while pending** (no
  double-submit); show an on-token in-progress state; then render the honest per-proof result (T009). → FR-004,
  FR-010, FR-011 (Q1, P-IV)

**Checkpoint**: the inbox enters selection (granted-only selectable; non-granted "needs consent"; nav
suppressed), the action bar generates a clip per selected proof, and the made clips appear on the existing
surfaces.

---

## Phase 4: User Story 2 — Consent per proof; non-granted honestly skipped (Priority: P1)

**Goal**: each proof's current consent is re-checked at generate; non-granted is skipped (no clip), reported
honestly — including a proof revoked AFTER it was selected.
**Independent Test**: include/revoke a non-granted proof; "Make clips"; confirm no clip for it, reported
skipped (needs consent), granted ones still made (quickstart §4, §6).

- [X] T007 [US2] **P-VII per-proof gate verification** (revoked-after-select race): confirm `generateBatch`
  re-reads consent **inside the loop** via `getGrantedConsentId` (the **same** `effectiveConsentGranted` as
  the withdrawal gate) — NOT the cached selection view. A proof **granted at select but revoked before
  generate** is **SKIPPED** (no `derived_asset` written), reported `skipped · needs_consent`; granted proofs
  still write. Confirm 0 clips for any non-granted proof. → FR-006 (P-VII, SC-002)

**Checkpoint**: no clip is ever written for a non-granted proof, even revoked-after-select; the gate matches
the rest of the app.

---

## Phase 5: User Story 3 — Honest partial result; no all-or-nothing (Priority: P2)

**Goal**: a mid-batch skip/failure doesn't roll back; made clips persist; the summary reports
made/skipped/failed exactly.
**Independent Test**: run a mixed batch (some granted, one non-granted, simulate one insert failure); confirm
the per-proof summary + persisted made clips (quickstart §4).

- [X] T008 [US3] **Partial-result / no-rollback verification**: confirm each per-proof insert is independent
  (single attempt — D4); a mid-batch **skip** or **failure does NOT roll back** the batch — the **made clips
  persist** (and revalidate onto Library/dashboard/showcase), and the action returns
  `made`/`skipped`/`failed` matching reality exactly (no all-or-nothing fiction, no fabricated success). →
  FR-007, FR-009 (FR-019, SC-003)
- [X] T009 [US3] Render the **honest per-proof result** in `inbox-selection-bar.tsx`: from the returned
  `BatchResult` — **"{made} clips made"**; when non-zero, **"{skipped} skipped · needs consent"** and
  **"{failed} couldn't be made — try again"**. Owned counts only; no fabricated success. → FR-007, FR-012
  (FR-019)

**Checkpoint**: the result is an honest per-proof summary; made clips persist; nothing faked or rolled back.

---

## Phase 6: Polish & Definition of Done (the audits + green build)

- [X] T010 [P] **Surfaces-light-up via existing reads (no read change)**: confirm the made clips appear on
  the **Library** (`getLibraryClips`), **dashboard** (`getDashboardSummary` clip reads), and **showcase**
  (`getShowcase`) after the single `revalidatePath` round — with **0** changes to `src/db/queries.ts` (no new
  read, no read edit). → FR-008 (SC-004)
- [X] T011 [P] **A-11 audit**: confirm no **Warmth sort** (B3), **upload** (B2), **export** (B4), or **List**
  view renders; the selection/batch surface shows only owned values (selected count, honest result) and **0**
  fabricated success/metric. → FR-012, FR-015 (A-11, FR-019, SC-007)
- [X] T012 [P] **Byte-stable + no-new-dep gate**: `src/components/proof-card.tsx` **byte-identical** (selection
  is a sibling overlay); `src/lib/proof.ts` (`ProofView`/`ProofCardProps`/`ProofDetailView`), `src/lib/clip.ts`
  (`ClipView`/`LibraryClipView`/`ClipDetailView`), `src/lib/showcase.ts` (`ShowcaseItem`) unchanged;
  `src/lib/studio.ts` **only gains** the batch types (existing exports unchanged); **`src/db/queries.ts`
  entirely unchanged** (every read + `getGrantedConsentId`/`insertDerivedAsset` reused as-is); the studio's
  `generateClip` (`src/app/app/proof/[id]/studio/actions.ts`) unchanged; `src/db/schema.ts` unchanged (**NO
  migration**); **no dependency** added to `package.json`/`package-lock.json`. → FR-015 (SC-005, SC-008)
- [X] T013 [P] **Responsive + keyboard + on-token**: selection toggles, "Select all ready", the format
  picker, "Make clips", and the result are responsive at 480 / 1024 / 1280 (+1240 max) with no horizontal
  scroll/overlap, and fully keyboard-operable (toggle-select, select-all, format, generate, dismiss) with
  visible focus; tokens only. → FR-013 (P-IV, SC-006)
- [X] T014 [P] **Microcopy / honesty**: matches B1/screen 02 ("Make clips", "Select all ready", "needs
  consent"); honest about the sample stub + any skip/fail; no "amazing"/"awesome", no emoji. → FR-014 (P-XI)
- [X] T015 Run `npm run typecheck`, `npm run lint`, `npm run build` — all green, **without `DATABASE_URL`**
  (CI parity: move `.env.local` aside, build, restore — lazy db client); run `quickstart.md` (select → Make
  clips; per-proof skip; honest result; surfaces light up); confirm the `CLAUDE.md` SPECKIT pointer targets
  this plan. Then **STOP and report**; do **not** run `/speckit.implement` again, and **leave the entire
  change uncommitted** for Cornel's manual review/commit (no commit/push/merge) (P-IX). → SC-001..008, DoD

**Checkpoint**: Definition of Done met — selection wired (ProofCard byte-unchanged), batch generates per
granted proof with P-VII re-checked at generate, honest partial result, surfaces light up via existing
reads; byte-stable; no schema/read change; no new dependency; builds green without `DATABASE_URL`.

---

## Dependencies & Execution Order

- **Setup (T001)** → first (the result types). [P] alone.
- **Foundational (T002)** → after Setup; the action blocks the surface's "Make clips".
- **US1 (T003–T006)** → T003 (client state) + T004 (wall overlay) + T005 (toolbar entry) + T006 (action bar,
  calls T002). T004 ∥ T005 partly (different files) but both feed T003's wiring; sequence T003 → T004/T005 →
  T006.
- **US2 (T007)** → verification, after T002 + the surface.
- **US3 (T008–T009)** → T008 verification (after T002); T009 (result UI in the bar) extends T006.
- **Polish (T010–T015)** → after the stories; T015 last (build + quickstart + STOP, uncommitted).

## Parallel Opportunities

- Polish: T010–T014 are independent checks (different concerns); T015 last.
- US1: T004 (wall) ∥ T005 (toolbar) — different files; both before T006 wiring.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 — select granted proofs, pick a format, "Make clips" → one clip per
  proof + honest result; clips on the existing surfaces.
- Then US2 (per-proof P-VII gate) → US3 (honest partial result) → Polish/DoD.
- **Do NOT commit per task.** Build the whole slice, then leave the entire change uncommitted; Cornel reviews
  and commits manually on `T4-B1-batch-studio`. Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-007 (FR-019) |
| T002 | FR-005, FR-006, FR-007, FR-008, FR-009 (P-VII, FR-019, D2/D3/D4) |
| T003 | FR-001, FR-002, FR-003 (D1) |
| T004 | FR-001, FR-002, FR-003 (P-II, A-11, D1) |
| T005 | FR-001 (A-11) |
| T006 | FR-004, FR-010, FR-011 (Q1, P-IV) |
| T007 | FR-006 (P-VII, SC-002) |
| T008 | FR-007, FR-009 (FR-019, SC-003) |
| T009 | FR-007, FR-012 (FR-019) |
| T010 | FR-008 (SC-004) |
| T011 | FR-012, FR-015 (A-11, FR-019, SC-007) |
| T012 | FR-015 (SC-005, SC-008) |
| T013 | FR-013 (P-IV, SC-006) |
| T014 | FR-014 (P-XI) |
| T015 | SC-001..008, DoD |

## Notes

- 15 atomic tasks; 0 test tasks (no runner; verification via typecheck/lint/build + quickstart). An
  **interaction + bulk-mutation** slice — wires the inbox selection cluster + a batch action; **no schema
  change, no new read, no new dependency**.
- **D1 — sibling-overlay selection**: ProofCard byte-frozen (T2.2 FR-014c); the overlay sits beside it,
  toggling selection; nav suppressed while selecting (T004/T012).
- **D2 — reuse, not fork**: `generateBatch` calls the same `getGrantedConsentId`/`insertDerivedAsset`/
  `validateGenerateInput`/`SAMPLE_CLIP_URL` as `generateClip`; revalidates ONCE; `generateClip`/`queries.ts`
  untouched (T002/T012).
- **P-VII** (T007): consent re-checked **inside the loop**, per proof, via the shared `effectiveConsentGranted`
  — covers revoked-after-select; non-granted skipped, no row.
- **D4 — honest partial result** (T008/T009): independent single-attempt inserts; no rollback; made/skipped/
  failed exact; no all-or-nothing.
- **No read change** (T010): the clips light up Library/dashboard/showcase via the existing reads after one
  revalidate.
- **Byte-stable** (T012): ProofCard, all shared view shapes, every existing read, and `generateClip`
  unchanged; `studio.ts` only gains batch types; no schema change; no new dependency.
- **Uncommitted hand-off**: implementation leaves EVERYTHING uncommitted; Cornel commits manually (T015).
- Out of scope (do NOT build): Warmth sort (B3), upload (B2), export (B4), the real engine (T8), the inbox
  List view; any schema change; any new read; any new dependency.
