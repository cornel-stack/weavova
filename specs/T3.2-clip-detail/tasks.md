---
description: "Task list for T3.2 — Clip detail (a generated clip's focused view): /app/clip/[id], derived surface, no-oracle gate"
---

# Tasks: T3.2 — Clip detail (a generated clip's focused view)

**Input**: Design documents from `specs/T3.2-clip-detail/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D6), data-model.md, contracts/{clip-read,clip-detail-surface}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Prerequisite slices**: T2.4a (`derived_asset` + the shared `effectiveConsentState`/`effectiveConsentGranted`
+ the reused `latestConsentVersion`/`latestConsentEffectiveAt` subqueries), T2.4b (the studio re-make target),
T3.1 (the Library card re-pointed here) — all shipped. **This slice does NOT change the schema** (reads the
existing `derived_asset`). Built **early** (un-deferred from T8); the non-playing still is the T8 playback seam.
**Tests**: NOT requested (no test runner). Verification via `npm run typecheck`/`lint`/`build` (green
**without** `DATABASE_URL`) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented, scaffolded,
> or run. Execution happens in `/speckit.implement` AFTER human approval.
> **At implementation, leave EVERYTHING uncommitted** — no per-task commits, no push/merge. Cornel reviews
> and commits manually on the `T3.2-clip-detail` branch (mirrors the prior slices).

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US4 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (the view type — no UI yet)

- [X] T001 [P] Add **`ClipDetailView`** to `src/lib/clip.ts` (D3): owned fields only — clip metadata (`id`,
  `kind`, `format`, `hook: string|null`, `assetUrl`, `createdAt`) + source-proof provenance (`proofId`,
  `customerName`, `proofType`, `verified`, `source`) + **two consent roles** — made-under (`madeUnderVersion`,
  `madeUnderAt`) and current effective (`consentState`, `consentVersion`, `consentAt`). Define **alongside**
  `ClipView`/`LibraryClipView`, which stay **byte-unchanged**. Per `data-model.md` §1. → FR-003 (FR-019)

**Checkpoint**: the clip-detail view type exists; `ClipView`/`LibraryClipView` unchanged. No read, no UI yet.

---

## Phase 2: Foundational (the read + leaf states — BLOCK the surface)

**⚠️ CRITICAL**: the withdrawal-gated, no-oracle read must exist before the surface.

- [X] T002 Add **`getClip(workspaceId, clipId): Promise<ClipDetailView | null>`** to `src/db/queries.ts`
  (ADD only): `withDbRetry`-wrapped; `select` from `derived_asset` **innerJoin** `proof` (customer/type/
  verified/link) **innerJoin** `source` (label) **innerJoin** `consent` as the **made-under** row
  (`consent.id = derived_asset.consentId` → version + grantedAt), plus the proof's **current effective**
  consent via the **existing** `effectiveConsentState`/`latestConsentVersion`/`latestConsentEffectiveAt`
  subqueries (reused, unchanged); `where eq(derivedAsset.id, clipId) AND eq(proof.workspaceId, $ws) AND
  effectiveConsentGranted(derivedAsset.proofId)`; `limit 1` → mapped `ClipDetailView` or **null**. **Missing
  / cross-workspace / withdrawn all yield no row → null** (three-into-one, no oracle). **Do NOT touch**
  `getProofs`/`getProof`/`getProofClips`/`getLibraryClips`/the `getDashboardSummary` clip reads/
  `effectiveConsentState`/`effectiveConsentGranted`/`getGrantedConsentId`/`insertDerivedAsset`. Per
  `contracts/clip-read.md`, research D2. → FR-002, FR-006 (P-VII)
- [X] T003 [P] Create `src/components/app/clip-detail/clip-detail-skeleton.tsx` (Server): on-token loading
  skeleton mirroring the two-column layout. → FR-010
- [X] T004 [P] Create `src/components/app/clip-detail/clip-detail-not-found.tsx` (Server): the **content-free**
  not-found ("Clip not found", back to the Library `/app/library`) — mirrors `proof-detail-not-found.tsx`;
  **no clip data, no case-distinguishing hint** (one state for missing/cross-ws/withdrawn). → FR-012 (P-VII)

**Checkpoint**: the read + the skeleton + the no-oracle not-found exist; the surface can be built.

---

## Phase 3: User Story 1 — Open a clip and see it framed with its provenance (Priority: P1) 🎯 MVP

**Goal**: from the Library, a clip opens at `/app/clip/[id]` showing the clip (non-playing sample/preview) +
owned metadata + provenance (source customer/proof + made-under vs current consent), inside AppChrome.
**Independent Test**: open a granted clip from the Library; confirm the sample-still + format/hook/date +
provenance + a back affordance, with the source-proof link and re-make present (quickstart §1–4).

- [X] T005 [US1] Create `src/components/app/clip-detail/clip-detail.tsx` (Server): the **two-column** layout
  (proof-detail 03 pattern). **Content column**: the clip as a **non-playing "Sample preview" still** in
  `clip.format`'s aspect (studio-04 framing — a labelled frame + format badge; **NO `<video>`, no play
  control** — Q1/FR-019, the T8 playback seam); the brand **hook** when set (clearly the brand's words,
  separate from any customer quote — render spec §7.4); a back affordance to `/app/library`. **Side panel**:
  the source customer + verified mark; a **source-proof link** (`/app/proof/[proofId]`); the **made-under**
  consent ("made under consent v{n} · {date}"); the proof's **current** consent ("granted · {date} · v{m}");
  the format; the created date; and **re-make** (persimmon primary) → `/app/proof/[proofId]/studio` (the
  consent-gated studio). **No** download/export/publish/share. Per `contracts/clip-detail-surface.md`. →
  FR-001, FR-004, FR-005, FR-006, FR-007 (P-II, P-V, P-VII, A-11, FR-019)
- [X] T006 [US1] Create `src/components/app/clip-detail/clip-detail-data.tsx` (async Server): `clip = await
  getClip(workspace.id, id)`; `if (!clip) notFound();`; → `<ClipDetail clip={clip}/>`. → FR-002, FR-012
- [X] T007 [US1] Create `src/app/app/clip/[id]/page.tsx` (Server): `const { id } = await params`; `workspace
  = await getCurrentWorkspace()`; `<Suspense fallback={<ClipDetailSkeleton/>}><ClipDetailData
  workspaceId={workspace.id} id={id}/></Suspense>`; `export const metadata = { title: "Clip — Weavova" }`.
  Inherits `/app` force-dynamic + AppChrome. → FR-001
- [X] T008 [US1] Create the route reliability files under `src/app/app/clip/[id]/`: `loading.tsx` (Server →
  `<ClipDetailSkeleton/>`); `error.tsx` (`"use client"` boundary → `<ErrorState onRetry={reset}/>`, no raw
  text — **the ONLY client file**); `not-found.tsx` (Server → `<ClipDetailNotFound/>`). → FR-010, FR-011,
  FR-012

**Checkpoint**: a granted clip opens at `/app/clip/[id]` with the sample-still + metadata + provenance +
actions; chrome intact; back to the Library works.

---

## Phase 4: User Story 2 — Withdrawn / missing / cross-workspace funnel to one no-oracle not-found (Priority: P1)

**Goal**: a withdrawn clip is unreachable; missing and cross-workspace ids are indistinguishable from it —
one content-free not-found, no oracle.
**Independent Test**: deep-link the three ids; confirm the identical not-found (quickstart §5).

- [X] T009 [US2] **No-oracle verification** (the T2.3 property, now on `getClip`): against the seed, confirm
  (a) **Leo M.'s withdrawn** clip id (source proof revoked), (b) a **non-existent** clip id, and (c) a clip
  id from **another workspace** **all** render the **byte-identical content-free** `<ClipDetailNotFound/>` —
  no clip data, no hint distinguishing the cases. Confirm Leo M.'s `derived_asset` row is **retained**
  (withdrawal is read-time, not a delete). → FR-002, FR-012 (P-VII, SC-003)

**Checkpoint**: the no-oracle gate holds on the clip detail; withdrawn clips unreachable, rows retained.

---

## Phase 5: User Story 3 — Honest provenance + re-make actions only (Priority: P2)

**Goal**: the detail's only actions reach existing destinations (source proof, the consent-gated studio); no
export/publish.
**Independent Test**: inspect the actions — working source-proof link + re-make → studio; no
download/export/publish/share (quickstart §4).

- [X] T010 [US3] **A-11 actions audit**: confirm the detail renders **only** the in-detail **source-proof
  link** (`/app/proof/[proofId]`) and **re-make** (→ `/app/proof/[proofId]/studio`, consent re-checked
  there); and renders **no** download / export / publish / share control and **no** inline play (T4/T9/T8 —
  hidden, not dead). The clip detail itself never generates. → FR-007 (A-11, P-VII, SC-005)

**Checkpoint**: the detail is a node in the loop (clip → its proof → re-make), with no dead/premature actions.

---

## Phase 6: User Story 4 — Reliable; the Library card now leads here (Priority: P2)

**Goal**: the state set is handled and the T3.1 Library card now opens the clip detail without changing how
it looks.
**Independent Test**: simulate transient + persistent reads; confirm loading/recovery/error; confirm the
card opens the clip detail and looks identical to T3.1 (quickstart §1, §6).

- [X] T011 [US4] **Re-point the T3.1 Library card** (Q3): in `src/components/app/library/library-clip-card.tsx`
  change the card `href` `/app/proof/${clip.proofId}` → **`/app/clip/${clip.id}`** and the `aria-label` →
  "Open {customerName}'s clip". **Only the destination changes** — markup/classes/appearance byte-identical;
  the source-proof link now lives **in the clip detail** (T005). → FR-009 (A-11)
- [X] T012 [US4] **Card-appearance audit**: confirm `library-clip-card.tsx` differs from T3.1 **only** in the
  `href` + `aria-label` (the card's structure, classes, and rendered appearance are byte-identical);
  `LibraryClipView` + `getLibraryClips` are unchanged. → FR-009 (SC-008)
- [X] T013 [US4] **States verification**: the loading skeleton shows on open; a transient cold start on
  `getClip` is retried transparently (`withDbRetry`) with no error surfaced; a persistent failure shows the
  shared `<ErrorState>` with retry and **no raw text**, structurally **distinct** from the not-found; the
  detail opens and closes back to the Library cleanly. → FR-010, FR-011 (SC-006)

**Checkpoint**: populated / no-oracle-not-found / loading / error handled; the Library card leads here,
appearance-preserving.

---

## Phase 7: Polish & Definition of Done (the audits + green build)

- [X] T014 [P] **FR-019 honesty audit**: every value on the detail is **owned** — format, brand hook, source
  customer/proof, made-under + current consent, created date — and the clip is a **non-playing sample/preview
  still**; **0** view/reach/engagement/performance, **0** render status, **0** fabricated value, **0** inline
  play / finished-render claim. → FR-004, FR-005 (FR-019, SC-002)
- [X] T015 [P] **Byte-stable + no-new-dep gate**: `src/components/proof-card.tsx` byte-identical; `src/lib/
  proof.ts` (`ProofView`/`ProofCardProps`/`ProofDetailView`) unchanged; `src/lib/clip.ts` `ClipView`/
  `LibraryClipView` byte-unchanged (`ClipDetailView` added); in `src/db/queries.ts` `getProofs`/`getProof`/
  `getProofClips`/`getLibraryClips`/the `getDashboardSummary` clip reads/`effectiveConsentState`/
  `effectiveConsentGranted`/`getGrantedConsentId`/`insertDerivedAsset` + the reused `latestConsentVersion`/
  `latestConsentEffectiveAt` subqueries unchanged (only `getClip` added); `src/db/schema.ts` unchanged (**NO
  migration**); AppChrome + the proof-detail/studio/Library surfaces unchanged except the one card `href`
  (T011); **no dependency** added to `package.json`/`package-lock.json`. → FR-015
- [X] T016 [P] **Responsive + keyboard + on-token**: the two columns reflow at 480 / 1024 / 1280 (+1240 max)
  with no horizontal scroll/overlap; the clip frame, provenance links, and re-make are reachable/operable
  with visible focus; tokens only. → FR-013 (P-IV, SC-007)
- [X] T017 [P] **Microcopy / honesty**: the detail copy reads consistently with the studio/Library sample
  framing, is honest about the sample stub + absent data, and avoids "amazing"/"awesome" and emoji. →
  FR-014 (P-XI)
- [X] T018 Run `npm run typecheck`, `npm run lint`, `npm run build` — all green, **without `DATABASE_URL`**
  (CI parity: move `.env.local` aside, build, restore — the lazy db client keeps the build green); run
  `quickstart.md` (open a clip; the no-oracle not-found across withdrawn/missing/cross-ws; provenance +
  actions; the re-wired card); confirm the `CLAUDE.md` SPECKIT pointer targets this plan. Then **STOP and
  report**; do **not** run `/speckit.implement` again, and **leave the entire change uncommitted** for
  Cornel's manual review/commit (no commit/push/merge) (P-IX). → SC-001..008, DoD

**Checkpoint**: Definition of Done met — the clip detail renders owned data + the honest non-playing still +
provenance + actions; the no-oracle gate holds; the Library card leads here appearance-preserving;
byte-stable; no schema change; no new dependency; builds green without `DATABASE_URL`.

---

## Dependencies & Execution Order

- **Setup (T001)** → first (the view type). [P] alone.
- **Foundational (T002–T004)** → after Setup. T002 (read) blocks the surface; T003 (skeleton) needed by
  T007/T008; T004 (not-found) needed by T006/T008. T003 ∥ T004 (different files).
- **US1 (T005–T008)** → T005 (detail) + T006 (data, uses getClip + detail + not-found) + T007 (page, uses
  data + skeleton) + T008 (loading/error/not-found wiring, uses skeleton + not-found component).
- **US2 (T009)** → verification, after T002 + T004 + the seed.
- **US3 (T010)** → audit, after T005.
- **US4 (T011–T013)** → T011 (card re-point) independent of the detail build; T012 audits T011; T013 verifies
  states after T002/T007/T008.
- **Polish (T014–T018)** → after the stories; T018 last (build + quickstart + STOP, uncommitted).

## Parallel Opportunities

- Foundational: T003 ∥ T004 (and ∥ T002, different files).
- US4: T011 (card) ∥ the US1 detail build (different files).
- Polish: T014–T017 are independent checks; T018 last.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 — a granted clip opens at `/app/clip/[id]` with the sample-still +
  metadata + provenance + actions, and the no-oracle not-found works (T004 + T002).
- Then US2 (no-oracle verification) → US3 (actions audit) → US4 (card re-point + states) → Polish/DoD.
- **Do NOT commit per task.** Build the whole slice, then leave the entire change uncommitted; Cornel reviews
  and commits manually on `T3.2-clip-detail`. Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-003 (FR-019) |
| T002 | FR-002, FR-006 (P-VII) |
| T003 | FR-010 |
| T004 | FR-012 (P-VII) |
| T005 | FR-001, FR-004, FR-005, FR-006, FR-007 (P-II, P-V, P-VII, A-11, FR-019) |
| T006 | FR-002, FR-012 |
| T007 | FR-001 |
| T008 | FR-010, FR-011, FR-012 |
| T009 | FR-002, FR-012 (P-VII, SC-003) |
| T010 | FR-007 (A-11, P-VII, SC-005) |
| T011 | FR-009 (A-11) |
| T012 | FR-009 (SC-008) |
| T013 | FR-010, FR-011 (SC-006) |
| T014 | FR-004, FR-005 (FR-019, SC-002) |
| T015 | FR-015 |
| T016 | FR-013 (P-IV, SC-007) |
| T017 | FR-014 (P-XI) |
| T018 | SC-001..008, DoD |

## Notes

- 18 atomic tasks; 0 test tasks (no runner; verification via typecheck/lint/build + quickstart). A
  **read + surface** slice — the read sibling of the proof detail (T2.3); **no schema change**, **no new
  dependency**.
- **Derived surface (P-V honest exception)**: no clip-detail screen in design-reference → built from
  proof-detail 03 (layout + tenant isolation) + studio 04 (clip/sample framing) + render spec (T005).
- **No-oracle gate (P-VII)**: `getClip` collapses missing/cross-workspace/withdrawn into one null →
  `notFound()` (T002/T006), verified byte-identical via Leo M. (T009); withheld rows retained.
- **Two consent roles**: made-under provenance (via `consentId`) shown distinctly from the current effective
  gate (T001/T002/T005).
- **Q1 honest still**: a non-playing "Sample preview" still, **no `<video>`** (T005) — the same UI seam T8's
  real playback swaps into; audited FR-019 (T014).
- **A-11**: only the in-detail source-proof link + re-make → studio (T005/T010); no download/export/publish/
  share, no inline play.
- **Card re-wire (Q3)**: the T3.1 Library card href → `/app/clip/[id]`, appearance byte-identical, source-
  proof link relocated into the detail (T011/T012).
- **Byte-stable**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`, `ClipView`/
  `LibraryClipView`, and every existing read unchanged; `schema.ts` unchanged; no new dependency (T015).
- **Uncommitted hand-off**: implementation leaves EVERYTHING uncommitted; Cornel commits manually (T018).
- Out of scope (do NOT build): the Showcase (T9), the real render engine / real playback (T8), bulk/export
  (T4), publishing (T9); any schema change; any new dependency.
