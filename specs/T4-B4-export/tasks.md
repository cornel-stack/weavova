---
description: "Task list for T4-B4 — Export: take a proof clip OUT as post-ready content. Single = copy-to-clipboard the post-text package; bulk = Library selection → ONE JSON manifest downloaded natively. Consent-gated reads (the B1 race re-checked at action time). ZERO new deps, NO schema change. Honest T8 video seam."
---

# Tasks: T4-B4 — Export (post-ready content out of a proof clip)

**Input**: Design documents from `specs/T4-B4-export/`
**Prerequisites**: plan.md, spec.md (US1–US3 + Q1:B / Q2:A / Q3:C folded), research.md (§1 **ratified: ZERO
new deps** · §2 JSON manifest · §3 the headline gap · §4 single render-gate copy · §5 bulk action re-read ·
§6 B1 selection port · §7 labeled T8 seam), data-model.md (**no schema change**), contracts/post-text-package.md,
contracts/export-actions.md, quickstart.md.
**Constitution**: build against `.specify/memory/constitution.md` (current).
**Prerequisite slices** (all shipped): T3.2 (clip detail — `getClip`/`ClipDetailView`, `ClipDetail`,
`clip-detail-data`), T3.1 (Library — `getLibraryClips`/`LibraryClipView`, `LibraryGrid`/`LibraryClipCard`,
`library-data`), T4-B1 (the inbox selection pattern — `InboxClient`/`InboxWall`/`InboxSelectionBar` +
`generateBatch`'s per-item consent re-check, the race this slice mirrors), T2.4b (the studio + `SAMPLE_CLIP_URL`
seam). **This slice makes NO schema change and adds NO dependency.**
**Tests**: NOT requested (no test runner). Verification via `npm run lint`/`build` (green **without**
`DATABASE_URL` **and without** R2 env) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented, installed, or
> run. Execution happens in `/speckit.implement` AFTER human approval. **At implementation, leave EVERYTHING
> uncommitted** — no per-task commits, no branch, no push/merge. Cornel reviews and commits manually (mirrors
> prior slices).

> **⛔ RATIFIED DECISIONS carried in (research.md):** **Q1:B** single **+** bulk · **Q2:A** the video stays an
> **openly-labeled sample reference** (`SAMPLE_CLIP_URL` + `src/lib/clip.ts` byte-stable; no R2 promotion) ·
> **Q3:C** copy-to-clipboard (single) / download ONE JSON manifest (bulk) · **§1 ZERO new dependencies** —
> native `navigator.clipboard` + native `Blob`+anchor; one text manifest, **NO zip**.
> **🛑 STOP-AND-RATIFY guard:** if implementation EVER finds a zip/library genuinely necessary, **halt and
> surface it for Cornel's call** (exactly as `aws4fetch` was in B2). Do **not** add any dependency unilaterally.

> **DERIVED SURFACE (P-V / P-XII):** the `/design-reference` B4 screen is a **duplicate of the B1 Batch-studio
> modal** — there is **no export layout to port**. Export is a **derived surface** (precedent: T3.2 clip
> detail), composed from existing Pressroom tokens + the owned fields on the clip-detail / Library surfaces.
> The bulk selection overlay is **ported from B1's inbox selection** verbatim.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US3 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (the no-dep guard + the owned post-text contract)

- [X] T001 [P] **ZERO-dependency guard (no install).** Confirm the slice installs **nothing**: copy uses
  native `navigator.clipboard.writeText`, download uses native `Blob` + `URL.createObjectURL` + `<a download>`,
  the manifest is `JSON.stringify` — all native. **Do NOT run `npm install`.** At the end, `package.json` +
  `package-lock.json` MUST be unchanged (verified in T016). If a zip/lib ever seems required, **STOP and
  surface** (do not add it). → research.md §1 (P-III)
- [X] T002 [P] **Create the owned post-text contract** in NEW `src/lib/export.ts` (client-safe; **type-only**
  schema imports for `ProofType`/`ClipFormat`, mirroring `src/lib/clip.ts`/`studio.ts`; value-import only the
  plain `SAMPLE_CLIP_URL` const from `@/lib/clip` — `clip.ts` stays byte-stable). Define: the
  **`PostTextPackage`** interface (`clipId`, `proofId`, `headline: string | null`, `hook: string | null`,
  `customerName`, `verified`, `source`, `proofType`, `format`, `createdAt`, `sampleVideo: { status:
  "arrives_at_T8"; note; reference }`); the **`SAMPLE_VIDEO_NOTE`** constant ("sample — your rendered clip
  replaces this when rendering ships (T8). Not a finished clip of the customer."); **`formatPostText(pkg):
  string`** (pure on-token assembly: headline FIRST — P-II — then hook, then `— {customerName}{verified ? ",
  verified customer" : ""} · via {source}`, then the bracketed sample note; absent blocks skipped, nothing
  fabricated); **`ExportManifest`** + **`BulkExportResult`** types; **`buildManifest(pkgs, exportedAt):
  string`** (`JSON.stringify({ exportedAt, count, clips: pkgs.map(p => ({...p, postText: formatPostText(p)})) },
  null, 2)`). **Owned fields only — NO view/reach/engagement/performance metric.** Per
  contracts/post-text-package.md. → FR-002, FR-003, FR-011 (FR-019, P-II, A-11)

**Checkpoint**: the pure, client-safe post-text contract exists; no dependency added; the video is represented
only as a labeled sample. No DB, no UI yet.

---

## Phase 2: Foundational (the two consent-gated reads — BLOCKS all UI)

**⚠️ CRITICAL**: the **customer headline (verbatim `proof.quote` ?? `proof.transcript`) is the One-Law
centerpiece (P-II)** and is **absent from `ClipDetailView`/`LibraryClipView`** — these reads add it. Both reuse
the **existing shared `effectiveConsentGranted` predicate** (P-VII) — **no new gate**. Existing reads + view
shapes stay **byte-unchanged**.

- [X] T003 **Additive read `getClipExport(workspaceId, clipId): Promise<PostTextPackage | null>`** in
  `src/db/queries.ts` (`withDbRetry`-wrapped, ADD only). Join `derived_asset ⨝ proof ⨝ source`, `where
  derived_asset.id = clipId AND proof.workspaceId = workspaceId AND effectiveConsentGranted(derived_asset.
  proofId)`, `limit 1`. Map to `PostTextPackage`: `headline = proof.quote ?? proof.transcript ?? null`; `hook
  = derived_asset.hook`; attribution from `proof.customerName`/`proof.verified`/`source.label`; `sampleVideo`
  from `SAMPLE_CLIP_URL` + `SAMPLE_VIDEO_NOTE`. Returns `null` for missing / cross-workspace / **withdrawn**
  (the same three-into-one no-oracle opacity as `getClip`). **Do NOT touch `getClip` or `ClipDetailView`.** →
  FR-001, FR-002, FR-005 (P-VII, P-II, research §3)
- [X] T004 **Additive read `getClipExports(workspaceId, clipIds: string[]): Promise<PostTextPackage[]>`** in
  `src/db/queries.ts` (`withDbRetry`-wrapped, ADD only). Same join + **same `effectiveConsentGranted` gate**,
  `where derived_asset.id = ANY(clipIds) AND proof.workspaceId = workspaceId AND effectiveConsentGranted(...)`,
  order `derived_asset.createdAt desc`; empty `clipIds` → `[]` (no query). Returns **only** granted,
  in-workspace clips among `clipIds` — the difference (requested − returned) is the honest **skipped** set
  (withdrawn / missing / cross-workspace, indistinguishable by design). May share SQL with T003 (e.g. T003 =
  `getClipExports(ws,[id])[0] ?? null`). **Do NOT touch `getLibraryClips` or `LibraryClipView`.** → FR-005,
  FR-006, FR-010 (P-VII, research §5)

**Checkpoint**: both reads exist, consent-gated by the shared predicate, projecting the headline; `queries.ts`
only GAINED functions; `getClip`/`getLibraryClips`/`generateClip`/`generateBatch` + all view shapes untouched.
No UI yet.

---

## Phase 3: User Story 1 — Export one clip's post-ready text (Priority: P1) 🎯 MVP

**Goal**: from a consented clip's detail, genuinely copy its post-text package (headline + hook + attribution)
to the clipboard; the video is a labeled sample, never a finished clip.
**Independent test**: open a granted clip → "Copy post text" → paste → the text has the verbatim headline
first, the brand hook, the attribution, and the bracketed T8 sample note, with no metric and no video link.

- [X] T005 [P] [US1] **Single copy island** in NEW `src/components/app/clip-detail/clip-export-button.tsx`
  (`"use client"`). Props `{ text: string }` (the `formatPostText` output, assembled server-side at render —
  research §4, gesture-safe). Renders a **"Copy post text"** button (on-token, consistent with the detail's
  action area; persimmon stays the single primary "Re-make in studio" — use ink/secondary strength here).
  On click (synchronous, in-gesture): `await navigator.clipboard.writeText(text)` → show "Copied"
  (`role="status"`, `aria-live="polite"`), revert after a short delay. **Fallback (A-11):** if
  `navigator.clipboard` is missing/throws, reveal a focused, pre-selected read-only `<textarea>` with `text`
  (and/or `document.execCommand('copy')`) so copy ALWAYS works — never a dead control. → FR-001, FR-004 (A-11)
- [X] T006 [US1] **Additive slot on `ClipDetail`** in `src/components/app/clip-detail/clip-detail.tsx`: add
  ONE optional prop (e.g. `exportAction?: React.ReactNode`) and render it in the existing side-panel action
  area (near "Re-make in studio"). **All existing markup byte-stable**; the `ClipDetailView` read shape is
  unchanged (FR-008 freezes the read shape, not the component's prop list). → FR-008 (P-V)
- [X] T007 [US1] **Wire single export** in `src/components/app/clip-detail/clip-detail-data.tsx`: after the
  existing `getClip` read (unchanged), perform the **additive** `getClipExport(workspaceId, id)` read; if it
  yields a package, assemble `text = formatPostText(pkg)` and pass `<ClipExportButton text={text} />` into the
  new `exportAction` slot. (The page is already consent-gated at render — a withdrawn clip `notFound()`s, so
  no export surface exists for it; US2 verifies this.) Owned-only; the T8 sample note rides in `text`. →
  FR-001, FR-002, FR-003 (FR-019, P-VII)

**Checkpoint**: US1 is independently shippable — single copy works on fixtures (MVP).

---

## Phase 4: User Story 2 — A withdrawn-consent clip is not exportable (Priority: P1)

**Goal**: the consent gate holds at export — single and (read-level) bulk — re-checked at read time; withdrawn
proof yields no exportable clip, with no fabricated payload. (Mechanism lives in the shared gate inside the
Phase-2 reads; this phase **locks + verifies** it.)
**Independent test (read-level, no bulk UI needed)**: call `getClipExports(ws, [grantedId, withdrawnId])` →
only the granted package returns; and a withdrawn clip's `/app/clip/[id]` `notFound()`s (no copy surface).

- [X] T008 [US2] **Lock the read-level gate** in `src/db/queries.ts` (verify, do not duplicate): confirm BOTH
  `getClipExport` and `getClipExports` filter via `effectiveConsentGranted(derived_asset.proofId)` **and**
  `proof.workspaceId` scope, and that a withdrawn / missing / cross-workspace id is absent with no
  distinguishing signal (no oracle). Confirm the **skipped derivation** the bulk action will use — `skipped =
  requested ids − returned ids` — is well-defined (dedupe requested). → FR-005, FR-006 (P-VII, research §5)
- [X] T009 [US2] **Verify the single render-gate** in `src/components/app/clip-detail/clip-detail-data.tsx`:
  confirm the withdrawn path is the existing `getClip → null → notFound()` (T3.2), so the export island is
  **never rendered** for a withdrawn clip — the `getClipExport` read added in T007 is the same-gated companion,
  not a bypass. No new gate, no change to the notFound behaviour. → FR-005 (P-VII)

**Checkpoint**: consent honesty is proven at the read level and the single surface; the bulk action (US3) will
consume the already-gated read and report the honest skip tally (the race), completing US2's bulk leg.

---

## Phase 5: User Story 3 — Export several clips from the Library at once (Priority: P2)

**Goal**: select several Library clips (additive overlay on the byte-unchanged card) → "Export selected" →
download ONE JSON manifest of the consented clips' post-text; the result reports an honest partial (N exported,
which skipped + why). Consent re-checked at action time (the B1 race).
**Independent test**: select 2–3 clips incl. one withdrawn → "Export selected" → ONE `.json` file downloads
(no zip), containing only the granted clips' post-text + a labeled `sampleVideo`; the bar reads "N exported · M
skipped · needs consent".

- [X] T010 [US3] **`exportClips` server action** in NEW `src/app/app/library/actions.ts` (`"use server"`).
  Signature `exportClips({ clipIds: string[] }): Promise<BulkExportResult>`. Flow: `getCurrentWorkspace()`
  (identity server-side, never trusted from client); **hand-rolled guard** (NO Zod) — `clipIds` a non-empty
  `string[]` of non-empty strings, deduped; `packages = await getClipExports(workspace.id, clipIds)` — **the
  read-time consent re-check** (a clip withdrawn after select is absent → skipped — the B1 `generateBatch`
  race applied to a read); `exportedAt = new Date().toISOString()` (server-side); `manifest =
  buildManifest(packages, exportedAt)`; compute `made = packages.length`, `skipped = clipIds.length −
  made`, `items` (`exported`/`skipped` per id), `filename = "weavova-export-<made>-clips.json"`; return
  `BulkExportResult`. **NO `revalidatePath`** (export is a read; nothing changed). → FR-005, FR-006, FR-009,
  FR-010 (P-VII, A-11, research §5)
- [X] T011 [P] [US3] **Library selection bar** in NEW
  `src/components/app/library/library-selection-bar.tsx` (`"use client"`; the B1 `InboxSelectionBar` layout,
  simpler — **no format picker**). Shows `{count} selected`, "Select all ({n})", **"Export selected"**
  (persimmon primary; disabled while pending / when count 0; `aria-busy`), "Cancel". On "Export selected":
  `const res = await exportClips({ clipIds: [...selected] })`; then **native download** — `new Blob([res.
  manifest], { type: "application/json" })` → `URL.createObjectURL` → an `<a download={res.filename}>` clicked
  programmatically → `URL.revokeObjectURL`. **No dependency.** Then show the **honest tally** (`role="status"`,
  `aria-live="polite"`): `"{res.made} exported"` + (`" · {res.skipped} skipped · needs consent"` when
  `res.skipped > 0`); on a thrown action, an honest "couldn't export — try again" (no fake success). Mirrors
  `InboxSelectionBar`'s result line. → FR-004, FR-006, FR-009 (A-11, FR-019)
- [X] T012 [US3] **Library selection wrapper** in NEW `src/components/app/library/library-client.tsx`
  (`"use client"`; the B1 `InboxClient` pattern). Owns `selecting: boolean` + `selected: Set<string>`;
  `toggleSelecting` (exiting clears the set), `toggleClip(id)`, `selectAll()` (all visible clip ids),
  `exitSelection()`. Renders a **"Select" entry affordance** in the Library header area (additive — the
  Library has no toolbar today; derived, no design-reference), the grid with selection props, and — when
  `selecting` — the sticky `<LibrarySelectionBar>`. → FR-009 (P-V, research §6)
- [X] T013 [US3] **Additive selection overlay on the grid** in
  `src/components/app/library/library-grid.tsx`: thread additive optional props (`selecting`, `selected`,
  `onToggleClip`) through; when `selecting`, render a **sibling** selection control (a checkbox / selected
  ring) **around** each `LibraryClipCard` (exactly as B1 adds selection around the byte-unchanged `ProofCard`),
  and suppress the card's clip-detail link navigation while selecting. **`LibraryClipCard` props/shape stay
  byte-unchanged** (FR-009); the header count markup is byte-stable. → FR-008, FR-009 (P-V)
- [X] T014 [US3] **Mount the wrapper** in `src/components/app/library/library-data.tsx`: render
  `<LibraryClient clips={clips} />` (which renders the grid) instead of `<LibraryGrid>` directly. The empty
  state (`LibraryEmpty`) path is **unchanged** — no selection affordance when there are no clips. → FR-009
  (P-V)

**Checkpoint**: bulk export works end-to-end on fixtures — ONE manifest, native download, honest partial, no
zip, no dependency; the clip card shape is untouched.

---

## Phase 6: Polish & Cross-Cutting (Definition of Done)

- [X] T015 [P] **States & a11y**: empty selection → "Export selected" disabled (no empty file); clipboard
  fallback path verified (T005); `exportClips` throw → honest message (T011); existing Library/clip-detail
  loading skeletons + empty states unchanged; keyboard reach (copy button, "Select" toggle, per-card selection
  control, the bar) with visible focus; responsive at `480 / 1024 / 1280`. → spec Edge Cases (P-Governance DoD)
- [X] T016 [P] **Byte-stability audit** (diff review): NO change to `getClip` / `getLibraryClips` /
  `getProof*` / `getShowcase` / `generateClip` / `generateBatch`; NO change to `ClipView` / `LibraryClipView`
  / `ClipDetailView` / `ProofView` / showcase shapes; `ProofCard` and the `LibraryClipCard` props/shape
  unchanged; `SAMPLE_CLIP_URL` + `src/lib/clip.ts` unchanged (Q2:A); nav rail (`src/lib/nav.ts` /
  `app-rail.tsx`) + routes unchanged (no new route, no nav entry); **no migration**, no `src/db/schema.ts`
  change. → FR-007, FR-008 (P-V)
- [X] T017 [P] **Green build, no env, no new dep**: `npm run lint` + `npm run build` pass **without**
  `DATABASE_URL` and **without** R2 env (CI parity — the reads are `getDb()`-lazy; export adds no env); `git
  diff package.json package-lock.json` shows **NO new dependency** (the T001 guard). → research §1 (P-III)
- [X] T018 **Quickstart walkthrough** (`specs/T4-B4-export/quickstart.md`): single copy (headline-first text,
  no metric, no video link), bulk ONE-manifest download (labeled `sampleVideo`, no zip), the consent race
  (withdraw after select → skipped), and the FR-019 owned-only + labeled-T8-sample checks. → all SC

---

## Dependencies & execution order

- **Phase 1 (Setup)** → **Phase 2 (Foundational reads)** → **Phase 3 (US1)** → **Phase 4 (US2)** →
  **Phase 5 (US3)** → **Phase 6 (Polish)**.
- **Phase 2 BLOCKS all UI** — US1's `clip-detail-data` (T007) needs `getClipExport` (T003); US3's action
  (T010) needs `getClipExports` (T004).
- **US1 (P1)** is the **MVP** and is independently shippable after Phase 2.
- **US2 (P1)** is realized by the shared gate inside the Phase-2 reads (T003/T004) + the single render-gate
  (T009); its **bulk leg** completes with the US3 action's read-time re-check (T010). T008/T009 are
  verification tasks that can run as soon as Phase 2 + T007 land.
- **US3 (P2)** depends only on Phase 2 (T004) + the contract (T002); its UI tasks (T011–T014) build on the
  existing T3.1 Library; T010 (action) gates T011 (the bar calls it).
- **Polish (Phase 6)** runs last (the byte-stability + no-dep + green-build audits need all code present).

## Parallel opportunities

- **Setup**: T001 ‖ T002 (different concerns/files).
- **Foundational**: T003 and T004 share `queries.ts` (same file) — author together; T004 may reuse T003's SQL.
- **US1**: T005 (new island file) ‖ T006 (clip-detail slot) can start together; T007 integrates after both.
- **US3**: T011 (selection bar) ‖ the action T010 are different files but T011 calls T010 — finish T010 first,
  then T011 ‖ T012 ‖ T013 (different files) before T014 mounts the wrapper.
- **Polish**: T015 ‖ T016 ‖ T017 are independent audits.

## Implementation strategy (MVP first)

1. **MVP = Phase 1 + Phase 2 + Phase 3 (US1).** Ships the demo-loop payoff: copy a real, owned post-text
   package from a consented clip. Independently demoable.
2. **+ Phase 4 (US2)** locks the consent honesty (single + read-level), before bulk widens the surface.
3. **+ Phase 5 (US3)** adds bulk: selection overlay → ONE JSON manifest, with the honest partial + the race.
4. **+ Phase 6** finalizes states, byte-stability, zero-dep, and the green env-free build.

**Total: 18 tasks** — Setup 2 · Foundational 2 · US1 3 · US2 2 · US3 5 · Polish 4.
