---
description: "Task list for T5-Consent — the consent surface: ported screen-13 ledger + derived history/provenance + the record-withdrawal action behind an honest cascade-preview. The withdrawal is one existing-shape write; every consuming surface responds via its existing read-time gate (the FREE cascade). NO schema, NO dep, NO new gate, NO new route beyond /app/consent."
---

# Tasks: T5-Consent — Consent surface (the live control for the consent backbone)

**Input**: Design documents from `specs/T5-consent/`
**Prerequisites**: plan.md, spec.md (US1–US3 + Q1:A / Q2:A / Q3:A folded), research.md (§1 the SHARED
read · §2 the withdrawal write + free cascade · §3 ledger/history reuse · §4 purpose label · §5
port/derived · §6 no-dep/schema/gate/route), data-model.md (**no schema change**),
contracts/consent-reads.md, contracts/withdrawal-action.md, quickstart.md.
**Constitution**: build against `.specify/memory/constitution.md` (current).
**Prerequisite slices** (all shipped): T2.4a (the `consent` version model + `derived_asset.consentId`
provenance + the shared `effectiveConsentState`/`effectiveConsentGranted`), T2.3 (`getProof` +
`latestConsentState`/`latestConsentVersion`/`latestConsentEffectiveAt` — reused), T2.4b (`getGrantedConsentId`
+ the single-attempt insert D4 precedent), and every consuming surface (inbox, Library, dashboard, export,
warmth, showcase, clip/proof detail) that already gates on effective consent at read time. **This slice
makes NO schema change and adds NO dependency.**
**Tests**: NOT requested (no test runner). Verification via `npm run lint`/`build` (green **without**
`DATABASE_URL` **and without** R2 env) + the `quickstart.md` DoD checks. No test tasks.

> **GENERATION-ONLY GUARD.** This file is the task list only. Nothing here has been implemented, installed,
> or run. Execution happens in `/speckit.implement` AFTER human approval. **At implementation, leave
> EVERYTHING uncommitted** — no per-task commits, no branch, no push/merge. Cornel reviews and commits
> manually (mirrors prior slices).

> **⛔ RATIFIED DECISIONS (research.md):** **Q1:A** cascade-preview confirm · **Q2:A** made-under
> provenance via the shared read · **Q3:A** full retained version timeline · **NO schema change** (the
> withdrawal writes an existing-shape `consent` row) · **NO new dependency** · **NO new gate / mechanism**
> (reuse `effectiveConsentState`) · **NO new route** (`/app/consent` already exists in the rail).

> **HONEST SEMANTICS (binding — the heart of the slice):** the action **RECORDS the customer's
> withdrawal** (the brand keeping an honest ledger of the customer's wishes) — **never** a brand-side
> "revoke." There is **NO re-grant / un-withdraw control anywhere**; re-consent is the customer's act via
> a real capture/request flow (T7); the demo resets via re-seed. The stored enum state stays `revoked`;
> the UI copy is **"withdrawn" / "Record withdrawal."** Prior versions are **RETAINED** (append a new
> version, never delete/update).

> **THE FREE CASCADE:** the slice **writes one row + one revalidate**; every consuming surface
> (inbox/ProofCard, Library, dashboard, export, warmth, showcase, clip detail, proof detail) responds via
> its **EXISTING** read-time `effectiveConsentState` gate — **ZERO edits** to those surfaces.

> **THE SHARED READ:** the cascade-preview's **N** = the clips a withdrawal withholds = **the proof's
> clip list** (proof-level cascade) = the **made-under provenance list** → **ONE** read
> `getProofConsentClips` (N = `clips.length`).

> **PORT vs DERIVED (P-V/P-XII):** the **ledger table** is a faithful port of design-reference **screen
> 13**; the **history timeline, provenance, and the withdrawal action + cascade preview** are **derived
> additions** (screen 13 has the ledger only), built from on-token precedent — documented, not a redesign.

## Format: `[ID] [P?] [Story] Description → trace`

- **[P]**: parallelizable (different files, no dependency on an incomplete task).
- **[Story]**: US1–US3 on user-story tasks; Setup/Foundational/Polish carry no story label.
- Each task names exact file paths, traces to FR/SC (or principle), and is one self-contained unit.

---

## Phase 1: Setup (the no-dep guard + the owned view shapes)

- [X] T001 [P] **ZERO-dependency guard (no install).** Confirm the slice installs **nothing** — it is
  reads + one insert over the existing Drizzle/Neon `consent` model. **Do NOT run `npm install`.** At the
  end, `package.json` + `package-lock.json` MUST be unchanged (verified in T017). → research §6 (P-III)
- [X] T002 [P] **The owned consent view shapes** in NEW `src/lib/consent.ts` (client-safe; **type-only**
  `ConsentState`/`ClipFormat` imports, the `clip.ts`/`proof.ts`/`warmth.ts` idiom; no DB code). Define:
  **`ConsentLedgerEntry`** (`proofId`, `customerName`, `purpose`, `currentVersion: number | null`,
  `effectiveAt: string | null`, `state: ConsentState`); **`ConsentVersionEntry`** (`version`, `state`,
  `effectiveAt: string | null`); **`ProofConsentClip`** (`clipId`, `format`, `madeUnderVersion`,
  `createdAt`); **`ProofConsentDetail`** (`history: ConsentVersionEntry[]`, `clips: ProofConsentClip[]`).
  Owned consent data only — no fabricated field (FR-019). Per data-model.md. → FR-001, FR-002, FR-009,
  FR-011

**Checkpoint**: no dependency added; the owned view shapes exist. No DB/UI yet.

---

## Phase 2: Foundational (the three additive reads + the withdrawal write — BLOCKS the UI)

**⚠️ CRITICAL**: reuse the shared consent helpers — **no new gate**. `getProofs`/`getProof`/`ProofView`/
`getLibraryClips`/`getShowcase`/`getClip` and `effectiveConsentState`/`latestConsentState`/
`getGrantedConsentId` stay **byte-unchanged**; these are NEW siblings in `queries.ts`.

- [X] T003 [P] **`getConsentLedger(workspaceId): Promise<ConsentLedgerEntry[]>`** in `src/db/queries.ts`
  (`withDbRetry`, ADD only). One row per proof, workspace-scoped, each with the **current effective**
  state/version/date via the **reused** `latestConsentState` (= shared `effectiveConsentState(proof.id)`)
  / `latestConsentVersion` / `latestConsentEffectiveAt`; `purpose` = an owned label (from
  `captureContext` or a seed-matching constant — research §4). Lists ALL proofs/states (chips filter
  client-side); order effective date desc. → FR-001 (P-VII, research §3)
- [X] T004 [P] **`getConsentHistory(workspaceId, proofId): Promise<ConsentVersionEntry[]>`** in
  `src/db/queries.ts` (`withDbRetry`, ADD only). **All retained** consent rows for the proof
  (workspace-scoped via a `proof` join), ordered `version asc` — the full audit timeline (Q3:A). Each:
  `version`, `state`, `effectiveAt` = `coalesce(revoked_at, granted_at, created_at)`. **Never** filters
  out superseded/withdrawn versions. → FR-002 (P-VII "pull, don't destroy")
- [X] T005 [P] **`getProofConsentClips(workspaceId, proofId): Promise<ProofConsentClip[]>`** in
  `src/db/queries.ts` (`withDbRetry`, ADD only) — **THE SHARED READ**. The proof's clips with their
  **made-under** version: `derived_asset ⨝ consent` on `derived_asset.consentId`, `derived_asset.proofId
  = proofId`, workspace-scoped. Each: `clipId`, `format`, `madeUnderVersion` (`consent.version`),
  `createdAt`. **Powers BOTH** the cascade-preview N (`= result.length`) and the provenance list
  (US3/Q2). → FR-004, FR-011 (research §1)
- [X] T006 **`recordConsentWithdrawal(workspaceId, proofId): Promise<{ status: 'recorded' | 'not_granted'; version?: number }>`**
  in `src/db/queries.ts` (ADD only). (1) **Re-check current grant** — reuse `getGrantedConsentId`; if
  null → `{ status: 'not_granted' }` (honest no-op, no second version). (2) Else `version = max(version)+1`
  for the proof; insert a **new existing-shape** `consent` row `{ proofId, state: 'revoked', revokedAt:
  now, version }` (grantedAt null). **Single-attempt** insert (D4 — not `withDbRetry`-wrapped; the unique
  `(proofId, version)` index guards a double write). Prior versions **RETAINED** (no update/delete).
  **No re-grant write exists.** → FR-003, FR-007, FR-008 (P-VII, research §2)

**Checkpoint**: three additive reads + the withdrawal write exist; `queries.ts` only GAINED functions;
the shared helpers + every existing read are byte-unchanged. No UI yet.

---

## Phase 3: User Story 1 — See the ledger and per-proof retained history (Priority: P1) 🎯 MVP

**Goal**: `/app/consent` shows the ported ledger (every proof's current effective state) + each proof's
full retained version timeline; the backbone made visible.
**Independent test**: open `/app/consent` → the ledger lists every proof with state + working
All/Granted/Awaiting/Withdrawn filters; open Leo M. → the retained *v1 granted → v2 withdrawn* timeline.

- [X] T007 [US1] **Replace the placeholder route** `src/app/app/consent/page.tsx` — drop the
  `SectionPlaceholder`; render `Suspense` + `ConsentData` (the spine pattern, like Library/showcase). Add
  `src/app/app/consent/loading.tsx` (skeleton fallback) + `src/app/app/consent/error.tsx` (the shared
  `<ErrorState>` boundary). → FR-001 (P-Governance states)
- [X] T008 [US1] **The data integrator + states** — NEW `src/components/app/consent/consent-data.tsx`
  (async Server): `getConsentLedger(workspaceId)`; empty → `ConsentEmpty`; else `ConsentLedger`. Add NEW
  `consent-empty.tsx` (honest empty ledger) + `consent-skeleton.tsx` (loading). → FR-001, FR-009
- [X] T009 [US1] **The ported ledger table** — NEW `src/components/app/consent/consent-ledger.tsx`
  (`"use client"`), ported from design-reference **screen 13**: a table of Customer · consent
  (purpose + `v{n}`) · captured date · **current effective status** (granted / awaiting / **withdrawn**),
  with **status filter chips** (All / Granted / Awaiting / Withdrawn) filtering the rows **client-side**.
  Pressroom tokens (status dots like proof/clip detail; persimmon NOT used here). Owns the **row-open**
  state that reveals the detail panel. **Honest count** of rows. → FR-001, FR-006 (P-V port, FR-019)
- [X] T010 [US1] **The detail panel (history) + its lazy fetch** — NEW `src/app/app/consent/actions.ts`
  with **`getProofConsentDetail(proofId)`** (`"use server"`; resolve workspace server-side; return
  `{ history: getConsentHistory(ws,proofId), clips: getProofConsentClips(ws,proofId) }` — one round-trip)
  + NEW `src/components/app/consent/consent-detail-panel.tsx` (`"use client"`) that, on row-open, fetches
  the detail and renders the **full retained version timeline** (history, `v{n}` granted/withdrawn @date,
  superseded versions shown). (Provenance clips = US3; withdrawal entry = US2 — same panel, added later.)
  → FR-002 (P-XII derived surface, research §1/§3)

**Checkpoint**: US1 is independently shippable — the visible ledger + retained history on fixtures (MVP).

---

## Phase 4: User Story 2 — Record a withdrawal with an honest cascade preview (Priority: P1)

**Goal**: for a granted proof, record the customer's withdrawal behind a cascade-preview confirm; one
write + one revalidate makes every surface reflect it (the free cascade). No re-grant anywhere.
**Independent test**: open a granted proof → "Record withdrawal" → preview names the proof + N clips
(retained, not deleted) → confirm → ledger shows withdrawn (timeline appended); Library/showcase/export
drop the clips, dashboard/warmth/inbox adjust — with no edits to those surfaces.

- [X] T011 [US2] **The record-withdrawal action** — add **`recordWithdrawal(proofId)`** to
  `src/app/app/consent/actions.ts` (`"use server"`): resolve workspace server-side; call
  `recordConsentWithdrawal(ws.id, proofId)`; on `recorded` → **`revalidatePath` the cascade cluster**
  (`/app/consent`, `/app`, `/app/library`, `/app/showcase`, `/app/proof`, `/app/proof/${proofId}`); on
  `not_granted` → return it (honest no-op); try/catch → `{ status: 'error' }`. **No re-grant action.** →
  FR-003, FR-005, FR-008 (the free cascade, A-11)
- [X] T012 [US2] **The cascade-preview confirm + the withdrawal entry** — NEW
  `src/components/app/consent/consent-withdraw-dialog.tsx` (`"use client"`, `shadow-modal`): the
  **honest preview** using the already-loaded `clips` — "Recording {customer}'s withdrawal will withhold
  their proof and **{clips.length}** clip(s) from Library, showcase, and export — **retained, not
  deleted**." Persimmon **confirm** → `recordWithdrawal(proofId)`; quiet **Cancel**; honest result
  (recorded / already withdrawn / error). In `consent-detail-panel.tsx` add a **"Record withdrawal"**
  entry **only for a currently-granted proof** (FR-003 eligibility); withdrawn/awaiting → no action, and
  **never a re-grant**. Copy: "the customer withdrew" / "Record withdrawal," never "revoke." → FR-004,
  FR-005, FR-006, FR-007 (Q1, A-11, FR-019)
- [X] T013 [US2] **Free-cascade verification** (no code beyond T011/T012): confirm that **no consuming
  surface is edited** — the recorded withdrawal ripples to inbox/`ProofCard`, Library, dashboard, export,
  warmth, showcase, clip detail, proof detail **via their existing `effectiveConsentState` reads** after
  the single revalidate. Document this in the quickstart walk (T018). → FR-008 (SC-002, P-VII)

**Checkpoint**: recording a withdrawal genuinely works, previews its cascade, and ripples everywhere with
zero consuming-surface edits.

---

## Phase 5: User Story 3 — Made-under provenance (Priority: P2)

**Goal**: each of a proof's clips shows the consent version it was made under — tying the ledger to the
assets it governs.
**Independent test**: open a granted proof with clips → each clip shows "made under v{n}" (real owned
provenance), distinct from the proof's current effective version.

- [X] T014 [US3] **Provenance list in the detail panel** — in
  `src/components/app/consent/consent-detail-panel.tsx`, render the **made-under provenance** from the
  already-fetched `clips` (the shared `getProofConsentClips` via `getProofConsentDetail`): each clip with
  its format and **"made under v{n}."** No extra read (reuses the T010 detail fetch). Owned provenance
  only. → FR-011 (Q2, research §1)

**Checkpoint**: the ledger connects to the clips it governs; provenance reuses the shared read.

---

## Phase 6: Polish & Cross-Cutting (Definition of Done)

- [X] T015 [P] **States & a11y**: empty workspace → honest empty ledger (no error); the lazy detail
  fetch shows a brief loading state, a failed fetch → honest message (no crash); a failed/`not_granted`
  withdrawal → honest result (no fabricated success); keyboard reach + visible focus on the filter chips,
  the row-open, and the confirm dialog (focus-trap/escape); responsive `480 / 1024 / 1280`. → spec Edge
  Cases (P-Governance DoD)
- [X] T016 [P] **Byte-stability audit** (diff review): NO change to `effectiveConsentState` /
  `effectiveConsentGranted` / `latestConsentState` / `latestConsentVersion` / `latestConsentEffectiveAt`
  / `getGrantedConsentId`; NO change to `getProofs` / `ProofView` / `getProof` / `getLibraryClips` /
  `getProofClips` / `getShowcase` / `getClip*`; NO change to `ProofCard` or any consuming surface
  (inbox, Library, dashboard, export, warmth, showcase, clip detail, proof detail); `generateClip` /
  `generateBatch` untouched; nav rail (`src/lib/nav.ts`) unchanged (no new route); **no migration**, no
  `src/db/schema.ts` change. The ONLY additions: `src/lib/consent.ts`, the `queries.ts` reads/write, the
  `/app/consent` route + components, `consent/actions.ts`. → FR-010 (P-V, P-VII)
- [X] T017 [P] **Green build, no env, no new dep**: `npm run lint` + `npm run build` pass **without**
  `DATABASE_URL` and **without** R2 env (CI parity — the reads/write are `getDb()`-lazy; the actions
  aren't called at build); `git diff package.json package-lock.json` shows **NO new dependency** (the
  T001 guard). → research §6 (P-III)
- [X] T018 **Quickstart walkthrough** (`specs/T5-consent/quickstart.md`): the ledger + filters; the
  retained timeline (Leo M. v1→v2); made-under provenance; the cascade-preview (N = clip count) + record;
  **the free cascade** (Library/showcase/export/dashboard/warmth/inbox all reflect it with no edits); the
  honest edges (already-withdrawn/awaiting → no action, no re-grant; double-withdraw → no-op). → all SC

---

## Dependencies & execution order

- **Phase 1 (Setup)** → **Phase 2 (Foundational)** → **Phase 3 (US1)** → **Phase 4 (US2)** →
  **Phase 5 (US3)** → **Phase 6 (Polish)**.
- **Phase 2 BLOCKS the UI** — US1 needs `getConsentLedger` (T003) + `getConsentHistory` (T004) via the
  detail action; US2 needs `recordConsentWithdrawal` (T006); US2/US3 need `getProofConsentClips` (T005).
- **US1 (P1)** is the **MVP** and is independently shippable after Phase 2.
- **The detail panel** (`consent-detail-panel.tsx`) is built across phases on the same file: T010 (history)
  → T012 (withdrawal entry) → T014 (provenance) — sequential.
- **US3 (P2)** reuses the T010 detail fetch (no new read) — only the render.
- **Polish (Phase 6)** runs last (the byte-stability + no-dep + green-build audits need all code present).

## Parallel opportunities

- **Setup**: T001 ‖ T002.
- **Foundational**: T003 ‖ T004 ‖ T005 are independent additive reads (same file `queries.ts` — author
  together); T006 (write) is independent of the reads.
- **US1**: T007 (route) ‖ T008 (data+states) can start together; T009 (ledger) then T010 (panel) build on them.
- **Polish**: T015 ‖ T016 ‖ T017 are independent audits.

## Implementation strategy (MVP first)

1. **MVP = Phase 1 + Phase 2 + Phase 3 (US1)** — the visible ledger + retained history: the consent
   backbone made visible from real owned data. Independently demoable.
2. **+ Phase 4 (US2)** adds the live control: record a withdrawal behind the cascade preview; the free
   cascade ripples everywhere with zero consuming-surface edits.
3. **+ Phase 5 (US3)** ties the ledger to the clips via made-under provenance (reuses the shared read).
4. **+ Phase 6** finalizes states, byte-stability, zero-dep, and the env-free green build.

**Total: 18 tasks** — Setup 2 · Foundational 4 · US1 4 · US2 3 · US3 1 · Polish 4.
