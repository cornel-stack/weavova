# Implementation Plan: T2.4b — Clip Studio (the spine finale)

**Branch**: `main` (a `T2.4b-clip-studio` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T2.4b-clip-studio/spec.md`

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Stop and report after Phase 2 planning. When this slice is later implemented, the implementation will **leave every change uncommitted** — Cornel reviews and commits manually (no auto-commit/push/merge, mirroring the T2.4a hand-off).

## Summary

The finale of the spine (Dashboard → Proof inbox → Proof detail → **Clip studio**). T2.4a built the data
layer — the `derived_asset` table, the read-time withdrawal gate, the seed, and the dashboard/detail clip
reads. **This slice builds the studio UI + the stubbed Generate that writes into that table**, wiring the
proof detail's previously-inert, consent-gated **"Make a clip"** to a real surface.

The studio is a **configure-and-generate** screen ported from `/design-reference` screen 04, with **no
timeline/track/scrubber** (Principle VIII). It exposes exactly **Format** (the owned render-contract aspect
set 9×16 / 1×1 / 4×5 / 16×9) + an **editable brand-authored hook** + **Generate** (Q3→A). The pictured
pipeline/un-owned controls — cutaways/product-media, a music library, a multi-brand-kit selector, the
scene/highlight timeline, AI suggestions — are **not rendered** (A-11 / FR-011 / FR-019).

**Generate is stubbed** (CLAUDE.md §3): a Next.js **Server Action** re-checks the proof's **current
effective consent** (P-VII — never cached from page open), and only if it is `granted` **writes one
`derived_asset` row** (kind `clip`, the chosen `format`, the brand `hook`, `assetUrl` = the shared
pre-made R2 sample reference, and the re-checked `consentId` for provenance) into T2.4a's existing table —
**no schema change** — then revalidates the proof detail + dashboard so T2.4a's reads light up (SC-008).
The client plays the signature **press-run** animation and reveals the result **explicitly labelled a
sample / preview** standing in for the real render (Q2→A / FR-007) — never passed off as a render of the
customer's words. If consent is not granted at generate time, the action **blocks** (no write) and the UI
shows an honest consent-required state.

Everything reuses the proven T2.1–T2.3 building blocks: workspace-scoped `getProof` (tenant-isolated;
`null → notFound()`), `withDbRetry` on reads, the shared `<ErrorState>`, the loading skeleton, and
server-first composition. **Byte-stable**: ProofCard, `ProofView`/`getProofs`/`getProof`/`ProofDetailView`,
and **all T2.4a reads** (`getProofClips`, the `getDashboardSummary` clip reads, `effectiveConsentState`/
`effectiveConsentGranted`) are unchanged — the studio only **adds** a gated consent read and an insert. The
one in-scope edit to existing UI is the explicit wiring of the inert "Make a clip" (FR-001). **No new
dependency** (notably: Zod is constitution-preferred but not currently installed — see D8).

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing only — `next`, `react`, `drizzle-orm`, `@neondatabase/serverless`,
`lucide-react`. **No new dependency** (no animation lib — the press-run is CSS/token-driven; no Zod — D8).

**Storage**: Neon Postgres via the lazy `getDb()` + Drizzle. **No schema change** — the studio **writes a
row** into T2.4a's `derived_asset` and re-reads consent. The write is the first **mutation** in the app
(prior slices are read-only); it goes through a Next.js Server Action.

**Testing**: No unit-test runner (as in T0.3/T2.x). Verification = `npm run typecheck`/`lint`/`build`
(green **without** `DATABASE_URL` — lazy client), plus the `quickstart.md` manual checks (open → configure
→ generate → the clip appears on the detail + dashboard via T2.4a reads; revoke → it withdraws; the
consent re-check blocks; no fabricated controls; byte-stability; no new dep).

**Target Platform**: Vercel; modern browsers. `/app/*` is `force-dynamic` (inherited from the `/app`
layout that wraps everything in AppChrome). The studio route renders **inside** that chrome automatically.

**Performance Goals**: Demo scale. Open = one `getProof` read (as the detail). Generate = one small consent
re-check read + one insert + two `revalidatePath`s. The press-run animation covers the (sub-second) wait.

**Constraints**: Principle VIII (no editor) is the headline constraint — zero timeline/track/scrubber.
Drizzle only; Server Components by default (the config island is the only Client Component); Tailwind
classes only; `withDbRetry` on reads; workspace-scoped + tenant-isolated; honest stub + honest absent-data
(FR-007/011/019); ProofCard + shared proof shapes + T2.4a reads byte-stable; no new dependency.

**Scale/Scope**: One new route segment (`/app/proof/[id]/studio` + its `loading`/`error`/`not-found`/
`actions`), one new component folder (`clip-studio/`), two added query functions (a gated consent read +
the insert), a shared sample-clip constant + studio types, and the one-line "Make a clip" wiring.

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS — no violations to justify.*

- [x] **Customer is the headline (P-II)**: The studio preview leads with the proof/customer (screen 04's
      display panel); the **hook is clearly the brand's framing, visually/semantically separate** from the
      customer's quote and never presented as their words (render spec §7.4). Chrome/controls stay quiet;
      the stub never dresses up fabricated words as the customer's (FR-007).
- [x] **Locked stack (P-III)**: Next 15 App Router (Server Action for the mutation) / React 19 / TS strict,
      Tailwind v4 + tokens, Neon + Drizzle, R2 reference for the sample clip. Heavy render stays **off
      Vercel** — stubbed → the same sample the T8 engine swaps behind. **No new dependency.**
- [x] **Pressroom tokens (P-IV)**: On-token only; the **press-run** is the signature motion (celebrate
      ≤420ms, `cubic-bezier(0.2,0,0,1)`, settles under `prefers-reduced-motion`). Persimmon reserved for
      the primary **Generate** action and the verified mark — nowhere else.
- [x] **Port, don't redesign (P-V)**: Ported from **screen 04**. The **A-11 port-completeness rule**
      governs: Format + hook + Generate render; cutaways, music, multi-brand-kit, the scene/highlight
      timeline, and AI suggestions are **not rendered** (no backing data / T7-T8 pipeline). The undesigned
      states (consent-required, not-found, loading, error) are honest **derived** states, not invented
      screens (P-XII).
- [x] **Fixtures-first (P-VI)**: Reads the existing fixtures via the T0.3/T2.3 query layer; writes into the
      `derived_asset` table T2.4a created (schema already written before this screen). The fixture/seed
      shape is the contract; T8's real render swaps in behind the same Generate seam.
- [x] **Consent enforcement (P-VII)**: The constitution-critical core — consent is **re-checked at generate
      time** via a gated read reusing T2.4a's shared `effectiveConsentState`; **no `derived_asset` is
      written for a non-granted proof**; the written row carries `consentId`, so T2.4a's read-time
      withdrawal removes it everywhere the instant consent is revoked. The gate is enforced **at the
      studio** (server-side), not only at the entry button.
- [x] **No editor (P-VIII)**: Explicitly honoured — a Format picker + editable hook + Generate. **Zero**
      timeline/track/scrubber the user edits; the system "assembles" (stubbed). Screen 04's preview
      scrubber and "auto-stitched · N scenes" are render *output* chrome (T8) — not rendered as editable.
- [x] **SDD scope (P-IX, P-XI)**: One vertical slice — the studio surface + stubbed Generate + the write +
      the consent re-check. The real engine (T8), transcription, highlight/caption editing, cutaway/music
      libraries, multiple brand kits, publishing, and the batch studio are out of scope. No speculative
      additions; no metric Weavova doesn't own (FR-012).
- [x] **Ambiguity handling (P-XII)**: The three screen-04 ambiguities were resolved with the human (Q1→B,
      Q2→A, Q3→A) and folded into the spec. The one mechanism choice this plan makes (the overlay routing,
      D1) ports screen 04 faithfully and is surfaced for review rather than buried.

**Definition of done (P-Governance)**: renders on real (fixture) data (the studio over a seeded proof;
the generated clip surfaces on the detail/dashboard via T2.4a reads); handles loading / error / the honest
consent-required + not-found derived states; responsive across `480 / 1024 / 1280` (+1240 max);
keyboard-accessible (open, Format, hook, Generate, close — focus managed); matches Pressroom tokens;
builds green without `DATABASE_URL`. Tracked in `quickstart.md`.

## Architecture & Data Flow

### Routing & the "overlay" (D1)

`/app/proof/[id]/studio` is a **dedicated nested route** rendered **full-bleed inside the existing AppChrome**
(the `/app` layout already wraps every child in the rail/top-bar/switcher/palette — unchanged). The studio
covers the proof content area ("over the proof"); a **close affordance** Links back to `/app/proof/[id]`.

- **Why a real route, not an intercepting/parallel-route modal**: screen 04 is a **full studio surface**,
  not a small modal over a visible proof; a real route is hard-refresh- and direct-URL-safe, which is
  **required** so the studio-side consent gate and tenant isolation run on direct access (FR-008 edge,
  US3 edge). The intercepting + `@modal` parallel-route pattern is the considered alternative (D1 in
  research) — rejected as heavier and a worse fit for a full-screen port.
- Segment files mirror the proof detail's reliability scaffold: `page.tsx`, `loading.tsx`, `error.tsx`,
  `not-found.tsx`.

### Open flow (server-first, tenant-isolated)

1. `page.tsx` (Server) awaits `params.id`, resolves the workspace via the unchanged session seam
   (`getCurrentWorkspace`), and streams the studio skeleton via `<Suspense>` → `<StudioData>`.
2. `studio-data.tsx` (async Server) calls the **existing** `getProof(workspaceId, id)` (already
   `withDbRetry`-wrapped, tenant-isolated). `null → notFound()` (same content-free, no-leak not-found as
   the detail — reuse `ProofDetailNotFound`).
3. Branch on the proof's effective `consentState`:
   - `granted` → render `<ClipStudio proof={proof} />` (the configure-and-generate surface).
   - not granted (covers a **directly-reached** studio for a non-granted proof) → render
     `<StudioConsentRequired />` — the honest consent-required derived state; **no configure/Generate path**.

### The studio surface (ported from screen 04)

- `clip-studio.tsx` (Server) — the screen-04 shell: the **display/preview** panel (the proof as the
  headline — Principle II) and the **configuration** panel. It renders the static, server-safe chrome and
  embeds the one Client island. The pictured un-owned controls are **omitted** (FR-011), not greyed-out.
- `clip-studio-form.tsx` (**Client**, `"use client"`) — the only interactive piece:
  - **Format** control — a selectable control over the `ClipFormat` set, defaulting to the vertical `9x16`.
  - **Editable hook** — a text field pre-filled with a **non-fabricated** brand-side default (a brand
    placeholder, clearly the brand's words — never an AI suggestion, never presented as the customer's;
    render spec §7.4). Bounded length.
  - **Generate** — the persimmon primary action. On submit it calls the `generateClip` Server Action,
    plays the **press-run** animation (CSS/token-driven; settles instantly under `prefers-reduced-motion`),
    and on the action's result either reveals the **labelled sample** (`generated`), shows the
    **consent-required** state (`consent_required`), or shows an inline retry (`error`).
- `studio-consent-required.tsx` (Server) — the honest "consent required, no clip produced" state (reused
  for both the at-open non-granted branch and the at-generate block).
- `studio-skeleton.tsx` (Server) — the on-token loading skeleton used by `loading.tsx`.

### Generate — the Server Action (the first mutation) (D2–D5)

`generateClip` (`actions.ts`, `"use server"`):

1. **Resolve identity server-side** — workspace from `getCurrentWorkspace()` (the seam), **never** a
   client-passed workspace id; `proofId` + `format` + `hook` come from the client and are **validated by a
   small hand-rolled guard** (D8): `format ∈ ClipFormat`, `hook` trimmed + length-capped, `proofId` a
   non-empty string. Invalid input → an `error` result (no write).
2. **Re-check consent (P-VII)** — `getGrantedConsentId(workspaceId, proofId)` (new, `withDbRetry`-wrapped):
   returns the **latest** consent row's `id` **iff** the proof's **effective** consent is `granted`
   (reusing T2.4a's shared `effectiveConsentState`), workspace-scoped via a `proof` join (a cross-workspace
   or missing `proofId` → `null`, no leak). `null → block`: return `{ status: 'consent_required' }`,
   **no write** (FR-008/SC-004).
3. **Write (only when granted)** — `insertDerivedAsset({ workspaceId, proofId, consentId, kind: 'clip',
   format, assetUrl: SAMPLE_CLIP_URL, hook })` (new). A **single insert attempt** — deliberately **not**
   `withDbRetry`-wrapped, because an insert is non-idempotent and a blind retry could double-write; a
   genuine failure returns `{ status: 'error' }` and the user can re-Generate. (The read in step 2 keeps
   the `withDbRetry` cold-start hardening; FR-013 applies to reads.)
4. **Revalidate** — `revalidatePath('/app/proof/[id]')` and `revalidatePath('/app')` so the detail's
   "Generated assets" and the dashboard "clips this month" / latest-clip reflect the new row through
   **T2.4a's unchanged reads** (SC-008).
5. **Return** a typed discriminated result — `{ status: 'generated', clip: { format, hook, assetUrl,
   createdAt } } | { status: 'consent_required' } | { status: 'error' }` — the client uses it to reveal the
   labelled sample, the consent-required state, or the retry.

**P-VII robustness note**: even in the negligible window between the re-check and the insert, P-VII holds
at every surface because withdrawal is **read-time** — a clip written under a just-revoked consent is
immediately excluded by T2.4a's reads. The re-check still blocks the *write* when not granted (FR-008).

### The honest stub (Q2→A / FR-007)

- The Generate result is **explicitly labelled a sample / preview** — copy makes the stand-in unmistakable
  ("a sample standing in for the real render until the engine ships"); it is **not** presented as a render
  of the customer's words/voice/footage; no fabricated transcript/caption/scene is shown as theirs.
- The stub returns the **same** sample regardless of the chosen `format`/`hook` (it cannot truly render the
  config); this limitation is **surfaced, not hidden** — the configuration is captured (and persisted as
  provenance: the chosen `format` + `hook` on the row), not falsely reflected in the sample pixels.
- `SAMPLE_CLIP_URL` is **extracted to a shared module** (D5) so the Server Action and the seed reference
  one source of truth (the seed's current literal is byte-identical — `r2://weavova-samples/press-run-sample.mp4`).

### Wiring "Make a clip" (FR-001 — the one in-scope existing-UI edit)

`proof-detail-actions.tsx` changes from an inert `<button>` to a `<Link href={\`/app/proof/${proof.id}/studio\`}>`
(or a navigating control), **still consent-gated** (renders only when `consentState === 'granted'`,
unchanged) and styled identically (persimmon primary). This is the explicit T2.4 wiring the T2.3 comment
points at; it is **not** covered by the byte-stability list.

### Byte-stability (asserted)

- **ProofCard** byte-unchanged. **`ProofView` / `ProofCardProps` / `ProofDetailView` / `getProofs` /
  `proofColumns` / `toView` / `getProof` / `toDetailView`** output unchanged. **All T2.4a reads**
  (`getProofClips`, the `getDashboardSummary` clip count + latest-clip, `effectiveConsentState` /
  `effectiveConsentGranted`) unchanged — the studio only **adds** `getGrantedConsentId` + `insertDerivedAsset`.
  **No schema change** (writes into T2.4a's table). Session seam unchanged. The dashboard/detail UIs are
  unchanged — they reflect the new row purely through revalidation + the existing reads.

## Project Structure

### Documentation (this feature)

```text
specs/T2.4b-clip-studio/
├── plan.md              # This file
├── research.md          # Phase 0 — D1 overlay routing, D2 Server Action, D3 consent re-check read,
│                        #            D4 single-attempt insert, D5 shared sample const, D8 no-Zod guard
├── data-model.md        # Phase 1 — the transient clip config + GenerateResult + the write into derived_asset
├── contracts/
│   ├── studio-route.md          # the route segment, open/branch flow, states, "Make a clip" wiring
│   └── generate-action.md       # generateClip signature, consent re-check, the write, revalidation, byte-stability
├── quickstart.md        # Phase 1 — open → configure → generate → observe on detail+dashboard; revoke → withdraw; DoD
└── checklists/requirements.md   # (from /speckit.specify)
```

### Source Code — files this slice adds / changes

```text
src/
├── app/app/proof/[id]/studio/
│   ├── page.tsx            # ADD: Server — params + workspace; Suspense → StudioData; metadata
│   ├── loading.tsx         # ADD: Server — <StudioSkeleton/>
│   ├── error.tsx           # ADD: Client boundary — <ErrorState onRetry={reset}/> (no raw error text)
│   ├── not-found.tsx       # ADD: Server — reuse the detail's tenant-isolated not-found (no leak)
│   └── actions.ts          # ADD: "use server" generateClip — re-check consent, write, revalidate
├── components/app/clip-studio/
│   ├── studio-data.tsx               # ADD: async Server — getProof; null→notFound; branch granted vs consent-required
│   ├── clip-studio.tsx               # ADD: Server — screen-04 shell (preview + config panel); embeds the client island
│   ├── clip-studio-form.tsx          # ADD: Client — Format + editable hook + Generate; press-run; result reveal
│   ├── studio-consent-required.tsx   # ADD: Server — honest consent-required derived state
│   └── studio-skeleton.tsx           # ADD: Server — on-token loading skeleton
├── db/queries.ts           # CHANGE (ADD only): getGrantedConsentId() (gated, reuses effectiveConsentState);
│                           #                    insertDerivedAsset(). EXISTING reads byte-unchanged.
├── lib/
│   ├── clip.ts             # CHANGE (ADD): SAMPLE_CLIP_URL shared const (extracted); reuse ClipFormat/DerivedAssetKind
│   └── studio.ts           # ADD: DEFAULT_FORMAT + FORMAT_OPTIONS, the GenerateInput guard, the GenerateResult union
└── components/app/proof-detail/
    └── proof-detail-actions.tsx      # CHANGE: inert button → Link to /app/proof/[id]/studio (still consent-gated) — FR-001

# OPTIONAL (behaviour-identical):
#   src/db/seed.ts          # import SAMPLE_CLIP_URL from the shared module instead of the local literal (same value)

# UNCHANGED (asserted in quickstart DoD checks):
#   src/components/proof-card.tsx                                   (byte-identical — FR-018)
#   src/lib/proof.ts → ProofView, ProofCardProps, ProofDetailView  (shared shapes unchanged)
#   src/db/queries.ts → getProofs/proofColumns/toView/getProof/toDetailView, getProofClips,
#                       getDashboardSummary clip reads, effectiveConsentState/effectiveConsentGranted  (all unchanged)
#   src/db/schema.ts                                                (NO schema change — writes into T2.4a's table)
#   src/components/app/dashboard/*, src/components/app/proof-detail/proof-detail*.tsx (except -actions)  (reflect via revalidation only)
#   src/db/with-retry.ts, src/components/app/error-state.tsx, src/lib/session.ts  (reused; unchanged)
#   AppChrome / rail / top-bar / switcher / command palette        (FR-001 — chrome untouched)
```

**Structure Decision**: Single Next.js App Router project. The studio is a new route segment under the
existing proof route (so it inherits `/app`'s AppChrome + `force-dynamic`), with its components in a new
`src/components/app/clip-studio/` folder mirroring `proof-detail/`. The mutation is a co-located Server
Action; the DB read/write live in the `src/db/` layer (Drizzle only). Studio config types + the sample
constant live in `src/lib/` mirroring `clip.ts`/`proof.ts`.

## Phase 0 — Outline & Research

All Technical Context items are known; research records the design choices (full write-up in `research.md`):

- **D1 — Overlay = a dedicated nested route inside AppChrome** (not an intercepting/parallel-route modal):
  faithful to screen 04's full studio, hard-refresh/direct-URL safe (required for the studio-side consent
  gate + tenant isolation). Close = Link back to the proof.
- **D2 — Generate = a Next.js Server Action** (the app's first mutation), called from the one Client island;
  Drizzle stays server-side. Rejected: a client `fetch` to a route handler (Server Actions are the
  idiomatic Next 15 mutation and keep types end-to-end).
- **D3 — Consent re-check = a new gated read `getGrantedConsentId`** reusing T2.4a's shared
  `effectiveConsentState`, returning the granted consent row id or `null` (block). Rejected: reusing
  `getProof` — it exposes `consentVersion`/`consentAt` but **not** the consent **row id** the write needs.
- **D4 — The insert is a single attempt** (not `withDbRetry`-wrapped) because it is non-idempotent; the
  consent re-check read keeps the retry hardening. A failed write returns a retryable `error` result.
- **D5 — Extract `SAMPLE_CLIP_URL` to a shared module** so the action + seed share one source of truth
  (the value is byte-identical to the seed's current literal).
- **D6 — Undesigned states are honest derived states** (consent-required, not-found, loading, error),
  reusing the detail's not-found + the shared `<ErrorState>` + a skeleton (P-XII; no invented screens).
- **D7 — Reuse the T2.1–T2.3 reliability stack** verbatim (`withDbRetry` on reads, `<ErrorState>`,
  `loading.tsx`, server-first).
- **D8 — Hand-rolled input validation, NOT Zod**: Zod is constitution-preferred (P-X) but **not currently
  installed**; adding it is a new dependency (forbidden by FR-018 / "no new dependency"). Validate the
  action input against the existing `ClipFormat` enum values with a small guard. If the team wants Zod, it
  is a separate, explicitly-flagged dependency decision — **out of this slice**.

**Output**: `research.md` (no NEEDS CLARIFICATION remain — Q1–Q3 resolved in the spec; D1–D8 recorded).

## Phase 1 — Design & Contracts

- **`data-model.md`**: the **transient clip configuration** (`format` + `hook` — a subset of the render
  contract's `RenderInput`), the `GenerateResult` discriminated union, and the **write** mapping onto
  T2.4a's `derived_asset` (which columns the studio sets; `consentId` from the re-check). No entity/schema
  change — the table already exists.
- **`contracts/studio-route.md`**: the route segment + files, the open/branch flow (granted →
  configure-and-generate; not-granted → consent-required), the loading/error/not-found derived states, and
  the "Make a clip" wiring — with the no-editor (P-VIII) and no-fabricated-controls (FR-011) assertions.
- **`contracts/generate-action.md`**: `generateClip`'s input guard, the `getGrantedConsentId` re-check
  (reusing `effectiveConsentState`), the single-attempt `insertDerivedAsset`, the revalidation, the typed
  result, and the byte-stability + no-new-dep assertions.
- **`quickstart.md`**: from a granted proof → "Make a clip" → configure (format + hook) → Generate →
  press-run → labelled sample; confirm the clip on the proof detail + dashboard (via T2.4a reads); revoke
  the proof's consent (reseed variant) → it withdraws; a directly-reached studio for a non-granted proof
  shows consent-required; the DoD gates (no editor, no fabricated controls, byte-stability, no new dep,
  build green without `DATABASE_URL`, responsive + keyboard).
- **Agent context**: update the `<!-- SPECKIT START/END -->` pointer in `CLAUDE.md` to this plan and mark
  T2.4b the active slice. (This is the only edit outside `specs/` made during planning; it is **left
  uncommitted** for Cornel's review like the rest.)

**Re-check Constitution after Phase 1**: still all PASS — no schema change, no new dependency, no editor
(Format + hook + Generate only), P-VII enforced by a server-side re-check + T2.4a's read-time withdrawal,
honest stub + honest absent-data (FR-007/011/019), ProofCard/shared proof shapes/T2.4a reads byte-stable,
chrome untouched.

## Complexity Tracking

No constitution violations to justify — the table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
