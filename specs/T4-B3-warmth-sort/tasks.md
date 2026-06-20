---
description: "Task list for T4-B3 — Warmth sort: the proof inbox re-ordered by content-readiness, computed read-time from owned facts. Makes the long-stubbed 'Warmest — coming soon' sort control real (A-11). Transparent lexicographic order (consent gate → readiness points → recency → id); the un-tapped signal via an additive opt-in-lazy clip-status read. NO schema, NO dep, NO route."
---

# Tasks: T4-B3 — Warmth sort (rank the proof inbox by content-readiness)

**Input**: Design documents from `specs/T4-B3-warmth-sort/`
**Prerequisites**: plan.md, spec.md (US1–US3 + Q1:A / Q2:A / Q3:A folded), research.md (§1 the warmth
function · §2 `capturedAt` recency · §3 opt-in-lazy clip-status · §4 presentation · §5 no-dep/schema/route),
data-model.md (**no schema change**), contracts/warmth-function.md, contracts/clip-status-read.md,
quickstart.md.
**Constitution**: build against `.specify/memory/constitution.md` (current).
**Prerequisite slices** (all shipped): T2.2 (the inbox — `getProofs`/`ProofView`, the `inbox-client`
in-memory filter/sort island, `inbox-toolbar` with the **disabled "Warmest — coming soon"** option,
`inbox-wall` + the byte-unchanged `ProofCard`), T2.4a/T4-B1 (`derived_asset` + `generateBatch`), the
shared `effectiveConsentState` (P-VII). **This slice makes NO schema change and adds NO dependency.**
**Tests**: NOT requested (no test runner). Verification via `npm run lint`/`build` (green **without**
`DATABASE_URL` **and without** R2 env) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented, installed,
> or run. Execution happens in `/speckit.implement` AFTER human approval. **At implementation, leave
> EVERYTHING uncommitted** — no per-task commits, no branch, no push/merge. Cornel reviews and commits
> manually (mirrors prior slices).

> **⛔ RATIFIED DECISIONS carried in (research.md):** **Q1:A** all four owned signals — completeness +
> un-tapped + recency, **consent as the GATE** · **Q2:A** sort-order ONLY, **no per-proof badge/number**,
> honest copy on the control · **Q3:A** a toggle whose **default stays Newest** (opt into Warmest) ·
> **ZERO new dependencies**, **NO schema change** (read-time compute, no stored warmth), **NO new route**.

> **WARMTH IS A TRANSPARENT LEXICOGRAPHIC ORDER, NOT A WEIGHTED-SUM SCORE.** Per proof, descending:
> **(1) consent gate** — granted ≻ non-granted (withdrawn **or** awaiting), via the shared
> `effectiveConsentState` already on `ProofView`; **(2) readiness points** (granted only) — words
> (`quote||transcript`) **+2**, media (`thumbnail`) **+1**, un-tapped (no clip yet) **+2**; **(3) recency**
> — `capturedAt` desc (the existing Newest basis); **(4) `id`** asc (deterministic final tiebreak).
> **Narratable, never a displayed number** (Q2:A).

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US3 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (the no-dep guard)

- [X] T001 [P] **ZERO-dependency guard (no install).** Confirm the slice installs **nothing**: warmth is
  plain comparison/arithmetic over owned `ProofView` fields; the clip-status read uses the existing
  Drizzle/Neon stack. **Do NOT run `npm install`.** At the end, `package.json` + `package-lock.json` MUST
  be unchanged (verified in T011). → research.md §5 (P-III)

**Checkpoint**: no dependency added. No code yet.

---

## Phase 2: Foundational (the warmth function + the additive clip-status read/action — BLOCKS the UI)

**⚠️ CRITICAL**: warmth reads ONLY owned facts (FR-019). Three signals are already on `ProofView`
(recency `capturedAt`, completeness `quote`/`transcript`/`thumbnail`, consent `consentState`); the fourth
— **un-tapped** — needs the additive clip-status read. `getProofs`/`ProofView` stay **byte-unchanged**.

- [X] T002 [P] **The pure warmth contract** in NEW `src/lib/warmth.ts` (client-safe; **type-only**
  `ProofView` import, the `clip.ts`/`studio.ts`/`export.ts` idiom; no DB code). Implement:
  **`readinessPoints(p, tapped): number`** = `(p.quote || p.transcript ? 2 : 0) + (p.thumbnail ? 1 : 0)
  + (tapped ? 0 : 2)`; **`warmthCompare(a, b, tappedIds: ReadonlySet<string>): number`** — descending
  lexicographic: **(1)** granted-first (`(b.consentState==='granted') - (a.consentState==='granted')`),
  **(2)** for granted, `readinessPoints` desc (non-granted skip to recency — they're cold regardless),
  **(3)** `b.capturedAt.localeCompare(a.capturedAt)` (recency), **(4)** `a.id.localeCompare(b.id)`
  (deterministic); **`sortByWarmth(proofs, tappedIds): ProofView[]`** = `[...proofs].sort(...)` (returns
  the SAME set re-ordered — never drops a proof). **Owned facts only; NO displayed number** (Q2:A). Per
  contracts/warmth-function.md. → FR-001, FR-002, FR-003, FR-004, FR-007 (FR-019, P-VII)
- [X] T003 [P] **Additive clip-status read `getProofClipStatus(workspaceId): Promise<string[]>`** in
  `src/db/queries.ts` (`withDbRetry`-wrapped, ADD only). `select distinct derived_asset.proofId from
  derived_asset where derived_asset.workspaceId = workspaceId` → the proofIds with **≥1** clip ("tapped").
  **Not** consent-filtered (tapped is a provenance fact; withdrawn proof is gated cold by consent anyway).
  **Do NOT touch `getProofs`/`ProofView`/`getLibraryClips`/`getProofClips`** or any existing read. →
  FR-011 (research §3)
- [X] T004 **Opt-in-lazy server action `getInboxClipStatus(): Promise<string[]>`** in NEW
  `src/app/app/proof/warmth-actions.ts` (`"use server"`; its OWN file so `proof/actions.ts` /
  `generateBatch` stays byte-stable). `getCurrentWorkspace()` (identity server-side, never trusted from
  client) → `return getProofClipStatus(workspace.id)`. No client input, no write, no `revalidatePath`. →
  FR-011 (research §3)

**Checkpoint**: the pure warmth order exists; the additive clip-status read + its action exist;
`queries.ts` only GAINED a function; `getProofs`/`ProofView`/`generateClip`/`generateBatch` untouched. No
UI wired yet.

---

## Phase 3: User Story 1 — Sort the inbox by warmth (Priority: P1) 🎯 MVP

**Goal**: a real Newest ↔ Warmest toggle that genuinely re-orders the inbox by the warmth ranking,
computed live; default stays Newest; the un-tapped input loads opt-in-lazily with an honest "computing"
state.
**Independent test**: in `/app/proof`, switch Sort to Warmest → the Wall re-orders (a real change); a
granted, complete, un-clipped, recent proof outranks an older/sparser/already-clipped one; switch back to
Newest → the byte-identical recency order returns.

- [X] T005 [US1] **Enable the Warmest control + the computing state** in
  `src/components/app/proof-inbox/inbox-toolbar.tsx` (in-scope edit). `SortKey` → `"newest" | "warmest"`;
  the `<select>`'s "Warmest" option: **drop `disabled`, drop "— coming soon"**; the `onChange` accepts
  `"warmest"`. Accept an additive `warmthLoading?: boolean` prop and, when true, show an honest
  **"Computing warmth…"** state on the control (so the brief Newest-fallback is NOT read as a dead/no-op
  control — A-11). Reuse the existing `Sort ·` control tokens; persimmon NOT added. (The honesty
  *explainer copy* is added in T008.) → FR-001 (A-11)
- [X] T006 [US1] **Warmth branch + opt-in-lazy wiring** in
  `src/components/app/proof-inbox/inbox-client.tsx` (in-scope edit). Extend the `sort` state to
  `"newest" | "warmest"` (**default stays `"newest"`** — the default render is byte-identical); add
  `tappedIds: Set<string> | null` (**initial `null`**) + a `warmthLoading` flag. **Opt-in fetch:** when
  the sort is switched to `"warmest"` and `tappedIds === null`, call `getInboxClipStatus()` **once**
  (set `warmthLoading` while in flight), `setTappedIds(new Set(result))`; wrap in try/catch → on failure
  leave `tappedIds` null. **Cache:** a later Newest→Warmest toggle re-sorts WITHOUT re-fetching. **The
  `visible` useMemo** (deps += `sort`, `tappedIds`): apply the existing **filters first**, then —
  `sort==='newest'` → the **byte-identical** existing `capturedAt`-desc order; `sort==='warmest' &&
  tappedIds!==null` → `sortByWarmth(filtered, tappedIds)`; `sort==='warmest' && tappedIds===null` (in
  flight / failed) → **fall back to the newest order** (no fabricated warmth). Pass `warmthLoading` to
  `InboxToolbar`. **The default Newest path NEVER calls the action / the read never fires.** → FR-001,
  FR-003, FR-006, FR-009 (Q3:A, A-11, research §3)

**Checkpoint**: US1 is independently shippable — the inbox really re-orders by warmth on opt-in, default
Newest unchanged (MVP).

---

## Phase 4: User Story 2 — Withdrawn ranks cold but stays visible; count stable (Priority: P1)

**Goal**: the consent cold-gate holds — a non-granted proof ranks cold yet stays visible; warmth orders,
never filters (count under Warmest == Newest for the same filters). (Mechanism lives in the warmth
comparator's gate + the unchanged unfiltered `getProofs`; this phase locks + verifies it.)
**Independent test**: with a withdrawn proof present, sort Warmest → it ranks at/near the bottom, is
**still visible**, and the count equals the Newest count for the same filters.

- [X] T007 [US2] **Lock the consent cold-gate + the no-filter guarantee.** Verify in `src/lib/warmth.ts`
  that `warmthCompare`'s **step (1)** ranks every `consentState==='granted'` proof above every
  non-granted one (withdrawn **and** awaiting), via the effective state **already on `ProofView`** (the
  shared `effectiveConsentState` — **no new gate, no new read**); and in
  `src/components/app/proof-inbox/inbox-client.tsx` that warmth is applied to the **already-filtered**
  list (filters first, order second) and `sortByWarmth` returns the **same set** — so `getProofs` stays
  **unfiltered** and the visible **count is identical** to Newest. → FR-004, FR-005, FR-006 (P-VII,
  SC-002, SC-003)

**Checkpoint**: withdrawn/awaiting proof is cold but visible; warmth never filters; the count is stable.

---

## Phase 5: User Story 3 — Understand why a proof is warm (honest copy) (Priority: P2)

**Goal**: the warmth control reads honestly — warmth = content-readiness from owned facts, never an
engagement/conversion prediction; and there is **no per-proof badge/number** (Q2:A).
**Independent test**: read the control copy → it frames warmth as content-readiness (recent / has a full
quote or media / not yet clipped) and disclaims engagement/conversion; the cards carry no warmth number.

- [X] T008 [US3] **Attach the honesty copy + confirm no per-proof badge** in
  `src/components/app/proof-inbox/inbox-toolbar.tsx` (additive, same file as T005). Add a **one-line
  on-token** explainer with the sort control (helper `text-ink-3` line and/or `title`): e.g. "Warmest =
  most ready to become content — recent, has a full quote or media, not yet clipped. Not a view or
  engagement prediction." No emoji, no "amazing"/"awesome" (P-XI). Confirm **`ProofCard` /
  `inbox-wall.tsx` are untouched** — warmth changes order ONLY, no per-proof score/badge (Q2:A). →
  FR-008, FR-010 (FR-019, P-XI, P-II)

**Checkpoint**: warmth is explicable and never over-claims; `ProofCard` is byte-unchanged.

---

## Phase 6: Polish & Cross-Cutting (Definition of Done)

- [X] T009 [P] **States & a11y**: in-flight → **Newest fallback + "Computing warmth…"** (not a dead
  control — A-11, T005/T006); clip-status read failure → honest **recency fallback** (no crash); empty
  inbox → the sort control is inert-by-emptiness (no error); **determinism** — re-sorting Warmest yields
  an identical order (ties → recency then `id`); responsive `480 / 1024 / 1280`; keyboard reach + visible
  focus on the sort control. → spec Edge Cases (FR-007, P-Governance DoD)
- [X] T010 [P] **Byte-stability audit** (diff review): NO change to `getProofs` / `ProofView` /
  `ProofCard` / `inbox-wall.tsx` / `inbox-data.tsx`; NO change to `getLibraryClips` / `getProofClips` /
  `getShowcase` / `getClip*` or any clip/showcase shape; `generateClip` / `generateBatch`
  (`proof/actions.ts`) untouched; nav rail (`src/lib/nav.ts`) + routes unchanged (no new route); the
  **default Newest order byte-identical**; **no migration**, no `src/db/schema.ts` change. The ONLY edits
  are `inbox-toolbar.tsx` + `inbox-client.tsx` + the additive `getProofClipStatus` read + the new
  `warmth-actions.ts` + `src/lib/warmth.ts`. → FR-009 (P-V)
- [X] T011 [P] **Green build, no env, no new dep**: `npm run lint` + `npm run build` pass **without**
  `DATABASE_URL` and **without** R2 env (CI parity — `getProofClipStatus` is `getDb()`-lazy, the action
  isn't called at build); `git diff package.json package-lock.json` shows **NO new dependency** (the T001
  guard). → research §5 (P-III)
- [X] T012 **Quickstart walkthrough** (`specs/T4-B3-warmth-sort/quickstart.md`): the toggle re-orders;
  withdrawn cold-but-visible + stable count; opt-in laziness (no read on Newest, one fetch on first
  Warmest, cached re-toggle); the in-flight Newest fallback + computing state; honesty copy + no per-proof
  badge; determinism + edges. → all SC

---

## Dependencies & execution order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **Phase 3 (US1)** → **Phase 4 (US2)** →
  **Phase 5 (US3)** → **Phase 6 (Polish)**.
- **Phase 2 BLOCKS the UI** — US1's `inbox-client` (T006) needs `sortByWarmth` (T002) + `getInboxClipStatus`
  (T004); the toolbar (T005) is independent markup but pairs with T006.
- **US1 (P1)** is the **MVP** and is independently shippable after Phase 2.
- **US2 (P1)** is realized by the comparator's consent gate (T002) + the filter-then-order wiring (T006);
  T007 locks/verifies it (runs once T002 + T006 land).
- **US3 (P2)** is the honesty copy on the toolbar (T008, additive to T005's file) + the no-badge
  confirmation; depends only on T005.
- **Polish (Phase 6)** runs last (the byte-stability + no-dep + green-build audits need all code present).

## Parallel opportunities

- **Foundational**: T002 (new lib) ‖ T003 (queries read) — different files; T004 needs T003.
- **US1**: T005 (toolbar) ‖ T006 (client) are different files, but T006 passes `warmthLoading` to T005's
  prop and consumes T002/T004 — land T002/T004 first, then T005 ‖ T006.
- **US3**: T008 edits the same file as T005 (toolbar) — sequential after T005.
- **Polish**: T009 ‖ T010 ‖ T011 are independent audits.

## Implementation strategy (MVP first)

1. **MVP = Phase 1 + Phase 2 + Phase 3 (US1)** — the real Warmest sort: opt-in toggle, live warmth
   re-order, default Newest byte-stable. Independently demoable.
2. **+ Phase 4 (US2)** locks consent honesty (cold-but-visible, count stable) before the copy lands.
3. **+ Phase 5 (US3)** attaches the honesty copy + confirms no per-proof badge.
4. **+ Phase 6** finalizes states, byte-stability, zero-dep, and the env-free green build.

**Total: 12 tasks** — Setup 1 · Foundational 3 · US1 2 · US2 1 · US3 1 · Polish 4.
