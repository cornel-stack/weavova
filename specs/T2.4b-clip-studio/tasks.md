---
description: "Task list for T2.4b — Clip Studio (the spine finale): configure-and-generate UI + stubbed render"
---

# Tasks: T2.4b — Clip Studio (the spine finale)

**Input**: Design documents from `specs/T2.4b-clip-studio/`
**Prerequisites**: plan.md, spec.md, research.md (D1–D8), data-model.md, contracts/{studio-route,generate-action}.md, quickstart.md
**Constitution**: build against `.specify/memory/constitution.md` **v1.1.2**.
**Prerequisite slice**: **T2.4a shipped** — `derived_asset` exists + is seeded; the dashboard/detail clip
reads (`getProofClips`, `getDashboardSummary` clip reads) and the shared `effectiveConsentState`/
`effectiveConsentGranted` helpers are live. **This slice does NOT change the schema.**
**Tests**: NOT requested (no test runner in the repo, as in T0.3/T1/T2.x). Verification is via `npm run
typecheck`/`lint`/`build` (green **without** `DATABASE_URL`) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented,
> scaffolded, wired, or run. Execution happens in `/speckit.implement` AFTER human approval.
> **At implementation, leave EVERYTHING uncommitted** — no per-task commits, no push/merge. Cornel
> reviews and commits manually on the `T2.4b-clip-studio` branch (mirrors the T2.4a hand-off).

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US5 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (shared studio types + the stub constant — no UI yet)

- [X] T001 [P] Create `src/lib/studio.ts`: `DEFAULT_FORMAT = '9x16'`; `FORMAT_OPTIONS` (the four
  `ClipFormat` values + display labels for the picker, reusing `ClipFormat` from `src/lib/clip.ts`); the
  `GenerateInput` type (`{ proofId: string; format: ClipFormat; hook: string }`); the `GenerateResult`
  discriminated union (`{ status: 'generated'; clip: { format; hook: string|null; assetUrl; createdAt } } |
  { status: 'consent_required' } | { status: 'error' }`); and the **hand-rolled input guard** (D8 — NO
  Zod): validate `format ∈ ClipFormat` **and** `hook` is a string trimmed + length-capped (`'' → null`),
  `proofId` non-empty. Per `data-model.md` §1–2, research D8. → FR-004, FR-005, FR-007, FR-008 (P-X)
- [X] T002 [P] Extract the stub sample-clip reference to a shared constant: add `SAMPLE_CLIP_URL =
  'r2://weavova-samples/press-run-sample.mp4'` to `src/lib/clip.ts` (D5), and update `src/db/seed.ts` to
  **import** it in place of its local `SAMPLE_CLIP_URL` literal. The value MUST equal the seed's original
  literal **exactly** so a re-seed is behaviour-identical. Per research D5. → FR-006, FR-009

**Checkpoint**: studio types + the input guard + the shared stub constant exist; the seed is unchanged in
behaviour. No UI, no route, no DB read/write yet.

---

## Phase 2: Foundational (the gated consent read, the write, the route reliability scaffold — BLOCKS the stories)

**⚠️ CRITICAL**: the P-VII generate gate (`getGrantedConsentId`) must exist and reuse the shared
`effectiveConsentState` before any Generate can run.

- [X] T003 Add **`getGrantedConsentId(workspaceId, proofId): Promise<{ consentId: string } | null>`** to
  `src/db/queries.ts` (ADD only): `withDbRetry`-wrapped, **workspace-scoped via a `proof` join** (a
  cross-workspace or missing `proofId` → `null`, no leak), returning the **latest** consent row's `id`
  **iff** the proof's effective consent is `granted` — **reusing the existing shared
  `effectiveConsentState`** (one source of truth, so the generate gate provably matches T2.4a's withdrawal
  gate), else `null`. **Do NOT touch** `getProofs`/`getProof`/`getProofClips`/`getDashboardSummary`/
  `effectiveConsentState`/`effectiveConsentGranted`. Per `contracts/generate-action.md`, research D3. →
  FR-008 (P-VII)
- [X] T004 Add **`insertDerivedAsset(values): Promise<{ createdAt: Date }>`** to `src/db/queries.ts` (ADD
  only): a single Drizzle `insert(derivedAsset).values({ workspaceId, proofId, consentId, kind: 'clip',
  format, assetUrl, hook }).returning({ createdAt })`. **Single attempt — NOT `withDbRetry`-wrapped**
  (insert is non-idempotent; a blind retry could double-write — D4). Drizzle only, no raw SQL. Per
  `contracts/generate-action.md`, research D4. → FR-009, FR-010
- [X] T005 [P] Create `src/components/app/clip-studio/studio-skeleton.tsx` (Server): the on-token loading
  skeleton for the studio (preview + config panel placeholders; tokens only). → FR-014
- [X] T006 Create the route reliability scaffold under `src/app/app/proof/[id]/studio/`: `loading.tsx`
  (Server → `<StudioSkeleton/>`); `error.tsx` (`"use client"` boundary → `<ErrorState onRetry={reset}/>` —
  no raw error text/digest); `not-found.tsx` (Server — reuse the detail's tenant-isolated, content-free
  not-found `ProofDetailNotFound`; no existence oracle, no cross-workspace leak). Depends on T005. Per
  `contracts/studio-route.md`, research D6/D7. → FR-002, FR-013, FR-014

**Checkpoint**: the consent re-check read + the insert exist (existing reads untouched); the studio's
loading/error/not-found states are wired. The studio surface + action can be built.

---

## Phase 3: User Story 1 — Open the studio and configure a clip (Priority: P1) 🎯 MVP

**Goal**: from a granted proof's "Make a clip", the studio opens inside AppChrome and shows Format + an
editable hook + Generate — no timeline/track/scrubber — and reflects config changes.
**Independent Test**: from a granted proof, activate "Make a clip" → the studio opens over the proof
(screen-04 layout, chrome intact, close back to the proof), shows Format + editable hook + Generate and no
editor, and reflects changes (quickstart §1–2).

- [X] T007 [US1] Create `src/components/app/clip-studio/studio-data.tsx` (async Server): `proof = await
  getProof(workspaceId, id)` (the **existing** T2.3 read — tenant-isolated, `withDbRetry`); `if (!proof)
  notFound();`; **branch on `proof.consentState`** — `=== 'granted'` → `<ClipStudio proof={proof}/>`, else
  → `<StudioConsentRequired/>` (the at-open gate; also covers a directly-reached non-granted studio). Keep
  `getProof`/`ProofDetailView` byte-stable. Per `contracts/studio-route.md`. → FR-001, FR-002, FR-008
- [X] T008 [US1] Create `src/components/app/clip-studio/clip-studio.tsx` (Server): the screen-04 shell —
  a **display/preview** panel where the customer's words/quote lead (the headline, P-II) and a
  **configuration** panel that embeds `<ClipStudioForm/>`; a **close** affordance `Link href="/app/proof/
  ${proof.id}"`. **Omit** (do NOT render, not greyed) the un-owned controls: cutaways/product-media, music
  library, multi-brand-kit selector, scene/highlight timeline, "auto-stitched · N scenes", AI suggestions
  (FR-011). Ported faithfully from screen 04. → FR-003, FR-004 (P-II, P-V, P-VIII)
- [X] T009 [US1] Create `src/components/app/clip-studio/clip-studio-form.tsx` (`"use client"`): the only
  interactive island — a **Format** control over `FORMAT_OPTIONS` (default `9x16`); an **editable hook**
  text field pre-filled with a **non-fabricated brand default** (clearly the brand's words, visually/
  semantically separate from the customer's quote — render spec §7.4; never an AI suggestion, never the
  customer's words); and the persimmon **Generate** button. Local component state only (no `localStorage`).
  Config changes reflected. **No** timeline/track/scrubber. (Generate's handler is wired in US2.) → FR-003,
  FR-004, FR-005 (P-VIII, P-IV)
- [X] T010 [US1] Create `src/app/app/proof/[id]/studio/page.tsx` (Server): `const { id } = await params`;
  `workspace = await getCurrentWorkspace()` (unchanged seam); `<Suspense fallback={<StudioSkeleton/>}>
  <StudioData workspaceId={workspace.id} id={id}/></Suspense>`; `export const metadata = { title: "Clip
  studio — Weavova" }`. Inherits `/app` `force-dynamic` + AppChrome from the layout (chrome untouched).
  Depends on T005/T007. → FR-001, FR-002
- [X] T011 [US1] Wire the **proof detail** "Make a clip": in
  `src/components/app/proof-detail/proof-detail-actions.tsx`, change the inert `<button>` to a `<Link
  href={\`/app/proof/${proof.id}/studio\`}>` — **still consent-gated** (renders only when `consentState ===
  'granted'`, unchanged) and styled identically (persimmon, Scissors). → FR-001 (A-11)
- [X] T012 [US1] Wire the **dashboard latest-proof (hero) card** "Make a clip": in
  `src/components/app/dashboard/dashboard-hero.tsx`, change the inert `<button>` (granted-only) to a
  `<Link href={\`/app/proof/${id}/studio\`}>` (destructure `id` from the `ProofView` prop); styling
  unchanged. → FR-001 (A-11)
- [X] T013 [US1] Wire the **inbox / dashboard-grid card** "Make" — the **named A-11 exception** (Cornel's
  decision, 2026-06-17): in `src/components/proof-card.tsx`, change the inert granted-only `<button>` to a
  `<Link href={\`/app/proof/${id}/studio\`}>`. **Only the action element changes** (button → Link) — the
  card's structure, classes, hover/focus reveal, and all other markup stay **byte-identical**; `ProofView`/
  `ProofCardProps` are untouched. → FR-001 (A-11)

**Checkpoint**: the studio opens from a granted proof (via any of the three Make controls), shows Format +
hook + Generate with no editor, reflects config, and closes back to the proof; chrome intact.

---

## Phase 4: User Story 2 — Generate a clip and get an honest result (Priority: P1)

**Goal**: Generate plays the press-run and reveals a result **explicitly labelled a sample/preview**, while
persisting a `derived_asset` and lighting up the detail + dashboard via T2.4a's reads.
**Independent Test**: activate Generate on a granted proof → press-run plays (reduced-motion settles
instantly) → a clip result appears, unmistakably labelled a sample/preview; the clip then shows on the
proof detail + dashboard (quickstart §3–4).

- [X] T014 [US2] Create the Server Action `src/app/app/proof/[id]/studio/actions.ts` (`"use server"`)
  **`generateClip(input: GenerateInput): Promise<GenerateResult>`**: (1) resolve `workspaceId` from
  `getCurrentWorkspace()` — **never** from the client; (2) **validate input with the T001 guard — BOTH
  `format` (∈ `ClipFormat`) AND `hook` (string, length-capped)** — invalid → `{ status: 'error' }`, no
  write (D8); (3) **re-check consent** via `getGrantedConsentId(workspaceId, proofId)` — `null` → `{ status:
  'consent_required' }`, **no write** (P-VII); (4) **only when granted**, `insertDerivedAsset({ …,
  consentId, kind: 'clip', format, assetUrl: SAMPLE_CLIP_URL, hook })` (single attempt — D4); a thrown
  failure → `{ status: 'error' }`; (5) `revalidatePath(\`/app/proof/${proofId}\`)` + `revalidatePath('/app')`
  so the detail + dashboard reflect the new row through **T2.4a's unchanged reads**; (6) return `{ status:
  'generated', clip: { format, hook, assetUrl: SAMPLE_CLIP_URL, createdAt } }`. Per
  `contracts/generate-action.md`. → FR-006, FR-008, FR-009, FR-010 (P-VII, SC-008)
- [X] T015 [US2] Wire Generate in `src/components/app/clip-studio/clip-studio-form.tsx`: on submit call
  `generateClip({ proofId, format, hook })`; **disable the Generate button while the action is pending**
  (double-submit guard — a double-click MUST NOT write two rows, D4); play the **press-run** animation
  (CSS/token-driven — fills bottom-up like ink, celebrate ≤420ms, `cubic-bezier(0.2,0,0,1)`; **settles
  instantly** under `prefers-reduced-motion`; **no animation dependency**); then switch on the result —
  `generated` → reveal the result **explicitly labelled a sample / preview** standing in for the real
  render (FR-007/Q2; echo chosen format/hook as *configured provenance*, NOT as rendered pixels; same
  sample regardless of config, limitation surfaced); `consent_required` → render `<StudioConsentRequired/>`;
  `error` → an inline retry (no clip, no fabricated metric). → FR-006, FR-007, FR-014 (P-IV, FR-019)

**Checkpoint**: Generate persists a clip under granted consent, plays the press-run, and reveals the
honestly-labelled sample; double-click writes only one row; the clip surfaces on detail + dashboard.

---

## Phase 5: User Story 3 — Consent re-checked at generate; revocation blocks (Priority: P1)

**Goal**: the gate is enforced at the studio (server-side) on **current** effective consent; a non-granted
proof never produces a clip.
**Independent Test**: open the studio for a proof, simulate consent revoked, Generate → no clip, honest
consent-required state; a directly-reached studio for a non-granted proof shows the same (quickstart §5).

- [X] T016 [US3] Create `src/components/app/clip-studio/studio-consent-required.tsx` (Server): the honest
  **"consent required — no clip produced"** derived state (on-token, quiet; no raw error). Used by
  `studio-data.tsx` (at-open non-granted branch, T007) and surfaced by the form on a `consent_required`
  result (T015). No design-reference screen → an honest derived state (P-XII). → FR-008 (P-VII, P-XII)
- [X] T017 [US3] Verify the gate end-to-end (against a reseeded fixture): (a) a **directly-reached** studio
  URL for a non-granted proof renders the consent-required state — **no configure/Generate path**; (b)
  Generate on a proof revoked after open returns `consent_required` and **writes NO `derived_asset` row**;
  (c) only a `granted` proof writes. The decision is on **current** effective consent (re-read at generate),
  never cached from page open. → FR-008, FR-010 (P-VII, SC-004)

**Checkpoint**: no clip is ever produced/persisted for a non-granted proof, including revoked-after-open and
direct access; the gate lives at the studio.

---

## Phase 6: User Story 4 — Honest port: no fabricated controls, no dead Make controls (Priority: P2)

**Goal**: the studio shows only owned, supported controls; and now that the studio exists, every rendered
Make control leads to it (no dead controls anywhere).
**Independent Test**: inspect the studio → no fabricated/un-owned controls; grep the app → every "Make"
control routes to the studio, none inert (quickstart §1–2, §A-11 audit).

- [X] T018 [US4] Confirm `clip-studio.tsx` renders **none** of: cutaway/product-media picker or "matched
  shots"; music-track library; multi-brand-kit selector; user-editable scene/highlight timeline;
  fabricated "auto-stitched · N scenes" / caption data; AI hook/cutaway suggestions; and **no** view/reach/
  engagement/warmth metric — each is **omitted**, not greyed-out or fabricated. → FR-011, FR-012 (A-11,
  FR-019)
- [X] T019 [US4] **Entry-point consistency audit (A-11)**: grep the rendered UI for every "Make" / "Make a
  clip" control and confirm **each leads to `/app/proof/[id]/studio`** — `proof-detail-actions.tsx` (T011),
  `dashboard-hero.tsx` (T012), `proof-card.tsx` (T013). Confirm **no Make control remains inert**; any Make
  control NOT wired must be **hidden, not left inert** (no dead controls now that the studio has a home).
  Document the command-palette "Make a clip" entry (`command-palette.tsx` → `/app/proof`) as an honest
  navigate-to-inbox-to-pick-a-proof action (not a per-proof dead control), left as-is. → FR-001 (A-11)

**Checkpoint**: the studio is an honest, complete configure-and-generate surface; every Make control in the
app routes to it; nothing fabricated, nothing dead.

---

## Phase 7: User Story 5 — Reliable; handles its states (Priority: P2)

**Goal**: the studio reuses the T2.1–T2.3 reliability patterns — loading, transparent cold-start recovery,
shared error state, clean open/close.
**Independent Test**: force a transient then a persistent failure around open/generate; confirm loading,
transparent recovery, the shared `<ErrorState>` with retry, and clean open/close (quickstart §7).

- [X] T020 [US5] Verify the states: the loading skeleton shows on open and the press-run covers the
  generate wait (FR-014); a transient cold-start on `getProof`/`getGrantedConsentId` is retried
  transparently (`withDbRetry`) with no error surfaced; a persistent failure shows the shared
  `<ErrorState>` with retry and **no raw error text**; a missing/cross-workspace id → the tenant-isolated
  not-found (no leak); the studio opens and closes back to the proof with the chrome intact. → FR-002,
  FR-013, FR-014 (SC-006)

**Checkpoint**: the studio feels trustworthy across loading / recovery / error / not-found / open-close.

---

## Phase 8: Polish & Definition of Done (the fold-in verifications + green build)

- [X] T021 [P] **Double-submit guard verification** (fold-in #2): the Generate button is disabled while the
  action is pending; a rapid double-click produces **one** `derived_asset` row, not two (single-attempt
  insert — D4). → FR-009 (D4)
- [X] T022 [P] **D8 server-side guard verification** (fold-in #3): `generateClip` rejects a `format` not in
  `ClipFormat` **and** an over-cap/non-string `hook`, returning `{ status: 'error' }` with **no write** —
  never trusting the client; a cross-workspace `proofId` is additionally neutralized by the workspace-scoped
  re-check (`consent_required`, no leak). → FR-008 (D8, P-VII)
- [X] T023 [P] **D5 sample-constant verification** (fold-in #4): `SAMPLE_CLIP_URL` in `src/lib/clip.ts`
  **equals the seed's original literal exactly** (`r2://weavova-samples/press-run-sample.mp4`); `npm run
  db:seed` is behaviour-identical (every seeded clip's `assetUrl` unchanged); the Server Action writes the
  same constant. → FR-006 (D5)
- [X] T024 [P] **Byte-stable + no-new-dep gate**: `src/lib/proof.ts` (`ProofView`/`ProofCardProps`/
  `ProofDetailView`) unchanged; in `src/db/queries.ts` `getProofs`/`proofColumns`/`toView`/`getProof`/
  `toDetailView` and the **T2.4a reads** (`getProofClips`, the `getDashboardSummary` clip count + latest
  clip, `effectiveConsentState`/`effectiveConsentGranted`) unchanged (only `getGrantedConsentId` +
  `insertDerivedAsset` added); `src/db/schema.ts` unchanged (**NO migration**); `dashboard-kpis.tsx` and
  `proof-detail*.tsx` (except `proof-detail-actions.tsx`) unchanged; **`proof-card.tsx` differs ONLY in the
  Make action** (button → Link — the named A-11 exception), otherwise byte-identical; AppChrome/rail/top-bar/
  switcher/palette structurally unchanged; **no dependency** added to `package.json`/`package-lock.json`. →
  FR-018
- [X] T025 [P] **Responsive + keyboard + on-token**: the studio reflows at 480 / 1024 / 1280 (+1240 max) —
  preview + config panel, no horizontal scroll/overlap; the full flow (open → Format → hook → Generate →
  close) is keyboard-operable with visible focus; the overlay manages/returns focus and closes on the
  standard affordance; tokens only. → FR-015, FR-016 (P-IV, DoD)
- [X] T026 [P] **Microcopy / honesty**: the studio copy matches screen 04 where it specifies wording; the
  result is **explicitly labelled a sample / preview** (FR-007/Q2); copy is honest about the stub and the
  absent data; no "amazing"/"awesome", no emoji. → FR-007, FR-017 (P-XI, FR-019)
- [X] T027 Run `npm run typecheck`, `npm run lint`, `npm run build` — all green, **without `DATABASE_URL`**
  (CI parity: move `.env.local` aside, build, restore — the lazy db client keeps the build green); run
  `quickstart.md` (open → configure → generate → observe on detail + dashboard via T2.4a reads; revoke →
  withdraw; consent-required); confirm the `CLAUDE.md` SPECKIT pointer targets this plan. Then **STOP and
  report**; do **not** run `/speckit.implement` again, and **leave the entire change uncommitted** for
  Cornel's manual review/commit (no commit/push/merge) (P-IX). → SC-001..008, DoD

**Checkpoint**: Definition of Done met — studio opens/configures/generates with no editor; honest
sample/preview; consent re-checked (no clip from non-granted proof); the clip lights up detail + dashboard
via T2.4a's unchanged reads; every Make control wired; byte-stable shared shapes + reads; no schema change;
no new dependency; builds green without `DATABASE_URL`.

---

## Dependencies & Execution Order

- **Setup (T001–T002)** → first; both [P] (different files; T002 also edits `seed.ts`).
- **Foundational (T003–T006)** → after Setup. T003 (gated read) + T004 (insert) block the Generate action;
  T005 (skeleton) blocks T006 (`loading.tsx`) and T010; T006 reliability scaffold.
- **US1 (T007–T013)** → T007 (studio-data) needs `getProof` (existing) + T016's consent-required component
  (so order T016 before T007, or stub the import); T008/T009 build the surface; T010 (page) needs
  T005/T007; T011–T013 (entry wiring) are independent of the surface and [P] with each other.
  > Note: T007 imports `<StudioConsentRequired/>` (T016). Either build T016 first or treat T007↔T016 as a
  > paired step. Sequenced here under US3 for story clarity; implementation may pull T016 earlier.
- **US2 (T014–T015)** → T014 (action) needs T003/T004 + T001 (guard, types); T015 (form wiring) needs T014
  + T009 + T016.
- **US3 (T016–T017)** → T016 (component) is a leaf [P]; T017 verifies after T014/T015.
- **US4 (T018–T019)** → T018 after T008; T019 after T011/T012/T013.
- **US5 (T020)** → after the route + reads exist (T006/T007/T014).
- **Polish (T021–T027)** → after the stories; T027 last (build + quickstart + STOP, uncommitted).

## Parallel Opportunities

- Setup: T001 ∥ T002.
- Foundational: T005 ∥ T003/T004 (different files); T006 after T005.
- US1: T011 ∥ T012 ∥ T013 (three different entry-point files); T008/T009 ∥ the wiring tasks.
- Polish: T021–T026 are independent checks (different concerns); T027 last.

## Implementation Strategy

- **MVP** = Setup + Foundational + US1 (+ T016 consent-required) — the studio opens from a granted proof,
  shows Format + hook + Generate, and closes back; every Make control routes to it.
- Then US2 (generate + persist + honest label) → US3 (consent gate) → US4 (honest port + entry audit) →
  US5 (states) → Polish/DoD (the D4/D8/D5 fold-in verifications, byte-stability, build).
- **Do NOT commit per task.** Build the whole slice, then leave the entire change uncommitted; Cornel
  reviews and commits manually on `T2.4b-clip-studio`. Stop at any checkpoint to validate.

## Traceability matrix

| Task(s) | Satisfies |
|---|---|
| T001 | FR-004, FR-005, FR-007, FR-008 (P-X) |
| T002 | FR-006, FR-009 (D5) |
| T003 | FR-008 (P-VII, D3) |
| T004 | FR-009, FR-010 (D4) |
| T005 | FR-014 |
| T006 | FR-002, FR-013, FR-014 (D6/D7) |
| T007 | FR-001, FR-002, FR-008 |
| T008 | FR-003, FR-004 (P-II, P-V, P-VIII) |
| T009 | FR-003, FR-004, FR-005 (P-VIII, P-IV) |
| T010 | FR-001, FR-002 |
| T011 | FR-001 (A-11) |
| T012 | FR-001 (A-11) |
| T013 | FR-001 (A-11 — named ProofCard exception) |
| T014 | FR-006, FR-008, FR-009, FR-010 (P-VII, SC-008) |
| T015 | FR-006, FR-007, FR-014 (P-IV, FR-019) |
| T016 | FR-008 (P-VII, P-XII) |
| T017 | FR-008, FR-010 (P-VII, SC-004) |
| T018 | FR-011, FR-012 (A-11, FR-019) |
| T019 | FR-001 (A-11) |
| T020 | FR-002, FR-013, FR-014 (SC-006) |
| T021 | FR-009 (D4 double-submit) |
| T022 | FR-008 (D8 server-side guard) |
| T023 | FR-006 (D5 constant equality) |
| T024 | FR-018 (byte-stable + no new dep) |
| T025 | FR-015, FR-016 (P-IV, DoD) |
| T026 | FR-007, FR-017 (P-XI, FR-019) |
| T027 | SC-001..008, DoD |

## Notes

- 27 atomic tasks; 0 test tasks (no runner; verification via typecheck/lint/build + quickstart). This is a
  **UI + first-mutation** slice — it writes into T2.4a's existing `derived_asset`; **no schema change**.
- **P-VII at generate** is the core: consent is **re-checked at generate time** via `getGrantedConsentId`
  (T003), which **reuses the shared `effectiveConsentState`** so the generate gate matches T2.4a's
  withdrawal gate; only a granted proof writes (T014/T017); the written `consentId` ties the clip to its
  consent so T2.4a's read-time withdrawal removes it on revocation. The re-check→insert window is safe
  because withdrawal is read-time (research D4).
- **Honest stub (Q2→A / FR-007)**: the result is explicitly labelled a sample/preview (T015/T026); the same
  sample regardless of config (limitation surfaced); never passed off as a render of the customer's words.
- **No editor (P-VIII)**: only Format + hook + Generate (+ close); zero timeline/track/scrubber (T009/T018).
- **Entry-point consistency (A-11, fold-in #1)**: every rendered Make control routes to the studio —
  proof detail (T011), dashboard hero (T012), inbox/grid ProofCard (T013, the **named exception** — only
  the action element changes); audited in T019; no dead controls.
- **Double-submit (fold-in #2)**: Generate disabled while pending (T015) → one row per generate (T021).
- **D8 guard (fold-in #3)**: BOTH `format` (enum) and `hook` (string, capped) validated **server-side**
  (T001/T014); never trust the client (T022). **No Zod** (not installed — new dep forbidden; D8).
- **D5 (fold-in #4)**: `SAMPLE_CLIP_URL` extracted to `src/lib/clip.ts`, equal to the seed's literal
  exactly; re-seed behaviour-identical (T002/T023).
- **Byte-stable**: `ProofView`/`ProofCardProps`/`ProofDetailView`, `getProofs`/`getProof` + the T2.4a
  reads, `schema.ts` (no migration), `dashboard-kpis.tsx`, `proof-detail*` (except `-actions`) — all
  unchanged; `proof-card.tsx` changes **only** its Make action (button → Link). **No new dependency** (the
  press-run is CSS/token-driven). (T024)
- **Uncommitted hand-off**: implementation leaves EVERYTHING uncommitted; Cornel commits manually (T027).
- Out of scope (do NOT build): the real render engine (T8), transcription/caption editing, highlight
  selection, cutaway/product-media or music libraries, multiple brand kits, publishing/distribution, the
  batch studio; any schema change; any new dependency.
