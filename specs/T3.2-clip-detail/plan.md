# Implementation Plan: T3.2 — Clip detail (a generated clip's focused view)

**Branch**: `main` (a `T3.2-clip-detail` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T3.2-clip-detail/spec.md` (Status: ACTIVE — built early; Q1–Q3 resolved)

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Stop and report after Phase 2
planning. When implemented, the implementation will **leave every change uncommitted** — Cornel reviews and
commits manually (mirrors the T2.4a/T2.4b/T3.1 hand-off).

## Summary

The focused view of one generated clip — the destination the T3.1 Library card graduates to. It is the
**read sibling of the proof detail (T2.3)**: where the proof detail focuses one testimonial, the clip detail
focuses one `derived_asset`, showing the clip (an honest non-playing sample/preview pre-T8), its **owned
metadata** (format, brand hook, created date), and its **provenance** (the source customer/proof + the
consent version it was made under).

**There is no clip-detail screen in `/design-reference`** — so P-V cannot apply literally. This is a
**derived surface**, built faithfully from the established patterns: the **proof-detail (03)** two-column
layout + the **no-oracle tenant-isolation** read, the **studio (04)** clip/sample framing, and the render
spec. Not a reinvented design language.

One new **workspace-scoped, withdrawal-gated** read — **`getClip(workspaceId, clipId)`** — returns the
clip's detail projection or **null**, with **missing / cross-workspace / withdrawn** all yielding null →
**one content-free `notFound()`** (no existence oracle; the exact T2.3 pattern, extended so a clip whose
source proof's effective consent isn't `granted` is unreachable). It reuses the shared
`effectiveConsentGranted` gate (visibility identical to the Library/dashboard/detail). A new additive
**`ClipDetailView`** carries owned data only: clip metadata + source-proof provenance + the **made-under**
consent (provenance) and the proof's **current effective** consent (the gate). `ClipView`/`LibraryClipView`
and every existing read stay byte-stable.

The clip is shown per **Q1** as a **non-playing "Sample preview" still** in the chosen format — an explicit
stand-in for the real render (FR-019), behind the **same UI seam** real playback swaps into at **T8** (so
the early build is not throwaway). **A-11 actions**: the **source-proof link** lives inside the detail
(provenance), **re-make** routes to the consent-gated **studio** for that proof; **download / export /
publish / share are not rendered** (T4 / T9). The route is **`/app/clip/[id]`** (Q2). Completing the slice
**re-wires the T3.1 Library card** to this detail (Q3): the card's source-proof link **relocates into the
detail**, and the card is otherwise **appearance-preserving**.

Server-first throughout (only `error.tsx` is a client boundary), mirroring T2.3. **No schema change** (reads
existing `derived_asset`). **No new dependency.**

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing only — `next`, `react`, `drizzle-orm`, `@neondatabase/serverless`,
`lucide-react`. **No new dependency.**

**Storage**: Neon Postgres via the lazy `getDb()` + Drizzle. **No schema change** — one new **read** of the
existing `derived_asset` joined to `proof` + `source` + the made-under `consent` row + the shared
effective-consent subquery. No migration, no write.

**Testing**: No unit-test runner (as throughout). Verification = `npm run typecheck`/`lint`/`build` (green
**without** `DATABASE_URL`) + the `quickstart.md` manual checks (open a clip; the no-oracle not-found across
withdrawn/missing/cross-workspace; provenance + actions; the re-wired card; byte-stability; no new dep).

**Target Platform**: Vercel; modern browsers. `/app/*` is `force-dynamic` (inherited from the `/app` layout
that wraps AppChrome). The clip-detail route renders inside that chrome automatically.

**Performance Goals**: Demo scale. One small read (a `derived_asset`⋈`proof`⋈`source`⋈`consent` select + the
correlated effective-consent subquery — same family as `getProof`/`getProofClips`). Single row, by id.

**Constraints**: Drizzle only; Server Components by default (only `error.tsx` is client); Tailwind classes
only; `withDbRetry` on the read; workspace-scoped + tenant-isolated + withdrawal-gated; owned values only
(FR-019); A-11 (no dead/fabricated controls, no inline play of an absent render); ProofCard + shared
proof/clip shapes + existing reads byte-stable; no schema change; no new dependency.

**Scale/Scope**: One new query function, one new view type, one new route segment (`/app/clip/[id]` +
`loading`/`error`/`not-found`), one new component folder (`clip-detail/`), and the one-line Library-card
re-wire.

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS — no violations to justify.*

- [x] **Customer is the headline (P-II)**: The detail keeps the **source customer** + their proof primary;
      the clip's brand hook is clearly the brand's framing, separate from the customer's words (render spec
      §7.4). Chrome stays quiet.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4 + tokens, Neon + Drizzle, R2
      reference for the sample. **No new dependency.** The clip stays sample-stubbed (real render T8).
- [x] **Pressroom tokens (P-IV)**: On-token only; persimmon reserved for the primary action (**re-make**) +
      the verified mark.
- [x] **Port, don't redesign (P-V)** — **honest exception**: **no clip-detail screen exists in
      `/design-reference`**, so there is nothing to port. The surface is **derived** faithfully from screen
      03 (proof-detail two-column + tenant isolation), screen 04 (studio clip/sample framing), and the render
      spec — not reinvented. This divergence-by-necessity is surfaced (P-XII), and Q1–Q3 were resolved with
      the human, not guessed.
- [x] **Fixtures-first (P-VI)**: Reads the existing `derived_asset`/`proof`/`consent`/`source` via the query
      layer; `ClipDetailView` is additive; the existing seed (active + withdrawn clips) exercises the view
      and the withdrawal not-found. The non-playing still sits behind the same seam T8's real playback swaps
      into.
- [x] **Consent enforcement (P-VII)**: Visibility is gated on the source proof's **current effective**
      consent via the shared helper; a withdrawn clip funnels to the no-oracle not-found (unreachable, not
      merely hidden); the **made-under** consent is shown as provenance; re-make re-checks consent at the
      studio. Records retained (audit).
- [x] **No editor (P-VIII)**: N/A — the detail is read-only; re-make routes to the studio (a format picker,
      not an editor).
- [x] **SDD scope (P-IX, P-XI)**: One vertical slice — the read + projection + surface + states + the card
      re-wire. Showcase (T9), the real engine (T8), export (T4), and publishing (T9) are out of scope. No
      speculative additions; no metric Weavova doesn't own.
- [x] **Ambiguity handling (P-XII)**: The absent design screen is surfaced; Q1 (representation), Q2 (route),
      Q3 (card nav) were resolved against the named references before this plan.

**Definition of done (P-Governance)**: renders on real (fixture) data (a seeded clip's detail); handles the
no-oracle not-found / loading / error states; responsive across `480 / 1024 / 1280` (+1240 max);
keyboard-accessible (the clip frame, provenance links, re-make); matches Pressroom tokens; builds green
without `DATABASE_URL`. Tracked in `quickstart.md`.

## Architecture & Data Flow

### The read — `getClip(workspaceId, clipId)` (added to `src/db/queries.ts`; existing reads untouched)

- Signature: `getClip(workspaceId: string, clipId: string): Promise<ClipDetailView | null>`,
  `withDbRetry`-wrapped.
- Query: `select` from `derived_asset` **innerJoin** `proof` (source customer / type / verified / link
  target) **innerJoin** `source` (capture source label) **innerJoin** `consent` as the **made-under** row
  (`consent.id = derived_asset.consentId` — the version the clip was made under), `where derived_asset.id =
  clipId AND proof.workspaceId = workspaceId AND effectiveConsentGranted(derived_asset.proofId)`, `limit 1`.
- **Three-into-one null (no oracle)**: a **missing** id, a **cross-workspace** id (fails the workspace
  predicate), and a **withdrawn** clip (fails the `effectiveConsentGranted` gate) **all** return no row →
  `null`. `clip-detail-data.tsx` calls `notFound()` on null → one content-free not-found; the viewer cannot
  tell which case (the exact T2.3 pattern, now also covering withdrawal).
- **Two consent roles** (both owned, both projected): the **made-under** consent (from the `consentId`
  join — its `version` + `grantedAt`) for the provenance line; and the proof's **current effective** consent
  (state + version + effective date) via the **existing** `effectiveConsentState`/`latestConsentVersion`/
  `latestConsentEffectiveAt` subqueries (reused, not modified) — so the detail can show "made under v{n} ·
  {date}" distinctly from the current consent (always granted when viewable).
- Owned only (FR-019): no view/reach/engagement/performance, no render status.

### The view type — `ClipDetailView` (added to `src/lib/clip.ts`; `ClipView`/`LibraryClipView` unchanged)

A new interface, owned fields only:
- **Clip**: `id`, `kind`, `format`, `hook: string|null`, `assetUrl`, `createdAt`.
- **Source-proof provenance**: `proofId`, `customerName`, `proofType`, `verified`, `source` (label).
- **Consent provenance**: `madeUnderVersion: number`, `madeUnderAt: string|null` (the made-under consent's
  grantedAt) — and the proof's **current** effective consent: `consentState`, `consentVersion: number|null`,
  `consentAt: string|null` (mirroring `ProofDetailView`'s fields, reused for the "vs current" framing).

### The route & components (server-first, inside AppChrome)

```text
src/app/app/clip/[id]/
├── page.tsx        # Server: const { id } = await params; workspace = getCurrentWorkspace();
│                   #   <Suspense fallback={<ClipDetailSkeleton/>}><ClipDetailData workspaceId id/></Suspense>; metadata
├── loading.tsx     # Server → <ClipDetailSkeleton/>
├── error.tsx       # "use client" boundary → <ErrorState onRetry={reset}/> (no raw text) — the ONLY client file
└── not-found.tsx   # Server → <ClipDetailNotFound/> (content-free; one state for missing/cross-ws/withdrawn)
```
- `src/components/app/clip-detail/clip-detail-data.tsx` (async Server): `clip = await getClip(ws.id, id)`;
  `if (!clip) notFound();`; → `<ClipDetail clip={clip}/>`.
- `clip-detail.tsx` (Server): the two-column layout (proof-detail 03 pattern) —
  - **content column**: the clip as a **non-playing "Sample preview" still** in the chosen format (studio-04
    framing; a labelled frame, no `<video>`, no play control — Q1/FR-019) + the brand **hook** (clearly the
    brand's words, separate from any customer quote — render spec §7.4); a back affordance to the Library.
  - **side panel**: **provenance** — the source customer + a **source-proof link** (`/app/proof/[proofId]`),
    the **made-under** consent ("made under consent v{n} · {date}"), the proof's current consent (granted ·
    {date} · v{m}), the format, and the created date; and the **re-make** action (persimmon) →
    `/app/proof/[proofId]/studio` (the consent-gated studio). **No** download/export/publish/share.
- `clip-detail-skeleton.tsx` (Server): on-token loading skeleton mirroring the two-column layout.
- `clip-detail-not-found.tsx` (Server): content-free not-found ("Clip not found", back to the Library) —
  mirrors `proof-detail-not-found.tsx`, no clip data, no case-distinguishing hint.

### The Library-card re-wire (Q3 — A-11 completion)

`src/components/app/library/library-clip-card.tsx`: the card's `href` changes from `/app/proof/${proofId}`
to **`/app/clip/${id}`** (the clip detail — its destination now exists), and the `aria-label` updates
accordingly ("Open {customer}'s clip"). The source-proof link **relocates into the clip detail** (the side
panel). The card's markup, classes, and appearance are **otherwise unchanged** (appearance-preserving —
SC-008).

### Honest representation (Q1 / FR-019) + the T8 seam

The clip is a labelled **non-playing still** in the chosen format — the same honest stand-in as the studio
result and the Library card, given more room. No `<video>`, no play affordance (there is no real per-proof
render, and the source proof carries no media in fixtures). At T8 real playback swaps in **behind this same
frame** — the early build is the seam, not throwaway.

### Byte-stability (asserted)

ProofCard, `src/lib/proof.ts` (`ProofView`/`ProofCardProps`/`ProofDetailView`), `src/lib/clip.ts`
(`ClipView`/`LibraryClipView` — `ClipDetailView` is **new**), and **every existing read** (`getProofs`/
`getProof`/`getProofClips`/`getLibraryClips`/the `getDashboardSummary` clip reads/`effectiveConsentState`/
`effectiveConsentGranted`/`getGrantedConsentId`/`insertDerivedAsset`, and the reused `latestConsentVersion`/
`latestConsentEffectiveAt` subqueries) are **unchanged** — the slice only **adds** `getClip` + `ClipDetailView`
+ the route/components, and re-points the one Library-card `href`. **No schema change.** Chrome untouched.

## Project Structure

### Documentation (this feature)

```text
specs/T3.2-clip-detail/
├── plan.md              # This file
├── research.md          # Phase 0 — D1 derived-not-ported, D2 getClip three-into-one null, D3 ClipDetailView,
│                        #            D4 non-playing still (Q1), D5 route /app/clip/[id] (Q2), D6 card re-wire (Q3)
├── data-model.md        # Phase 1 — ClipDetailView shape + getClip projection + the withdrawal/no-oracle derivation
├── contracts/
│   ├── clip-read.md            # getClip signature, the joins, the three-into-one null, byte-stability
│   └── clip-detail-surface.md  # the route + components + states, provenance/actions, the card re-wire, A-11 omissions
├── quickstart.md        # Phase 1 — open a clip; no-oracle not-found (withdrawn/missing/cross-ws); actions; DoD
└── checklists/requirements.md   # (from /speckit.specify; Q1–Q3 resolved)
```

### Source Code — files this slice adds / changes

```text
src/
├── db/queries.ts                 # CHANGE (ADD only): getClip(workspaceId, clipId) — joined, withdrawal-gated,
│                                 #   three-into-one null. EXISTING reads byte-unchanged.
├── lib/clip.ts                   # CHANGE (ADD): ClipDetailView. ClipView/LibraryClipView byte-unchanged.
├── app/app/clip/[id]/
│   ├── page.tsx                  # ADD: Server — workspace + Suspense → ClipDetailData; metadata
│   ├── loading.tsx               # ADD: Server → <ClipDetailSkeleton/>
│   ├── error.tsx                 # ADD: "use client" → <ErrorState onRetry={reset}/>
│   └── not-found.tsx             # ADD: Server → <ClipDetailNotFound/>
├── components/app/clip-detail/
│   ├── clip-detail-data.tsx      # ADD: async Server — getClip; null → notFound(); → <ClipDetail/>
│   ├── clip-detail.tsx           # ADD: Server — two-column; sample-still + hook | provenance + actions
│   ├── clip-detail-skeleton.tsx  # ADD: Server — on-token loading skeleton
│   └── clip-detail-not-found.tsx # ADD: Server — content-free not-found (back to Library)
└── components/app/library/
    └── library-clip-card.tsx     # CHANGE: href → /app/clip/[id] (Q3); aria-label; appearance otherwise identical

# UNCHANGED (asserted in quickstart DoD checks):
#   src/components/proof-card.tsx                                   (byte-identical)
#   src/lib/proof.ts → ProofView/ProofCardProps/ProofDetailView    (unchanged)
#   src/lib/clip.ts → ClipView/LibraryClipView                     (byte-unchanged; ClipDetailView is new)
#   src/db/queries.ts → getProofs/getProof/getProofClips/getLibraryClips/getDashboardSummary clip reads/
#                       effectiveConsentState/effectiveConsentGranted/getGrantedConsentId/insertDerivedAsset
#                       + latestConsentVersion/latestConsentEffectiveAt subqueries  (all unchanged/reused)
#   src/db/schema.ts                                               (NO schema change — reads existing derived_asset)
#   AppChrome / rail / top-bar / switcher / palette, the proof detail + studio + Library surfaces (except the card href)
```

**Structure Decision**: Single Next.js App Router project. The read lives in the existing `src/db/` layer;
the view type alongside `ClipView`/`LibraryClipView` in `src/lib/clip.ts`; the surface in a new
`src/components/app/clip-detail/` folder mirroring `proof-detail/`. The route is top-level `/app/clip/[id]`
(Q2). The only existing-UI edit is the Library-card `href` (Q3).

## Phase 0 — Outline & Research

All Technical Context items are known; research records the design choices (full write-up in `research.md`):

- **D1 — Derived surface, not ported (honest P-V exception)**: no clip-detail screen exists; build from
  screen 03 (layout + tenant isolation) + screen 04 (clip/sample framing) + render spec.
- **D2 — `getClip` three-into-one null**: missing / cross-workspace / withdrawn all → null → one no-oracle
  `notFound()`, reusing the shared `effectiveConsentGranted` gate (T2.3 pattern + P-VII). Chosen over
  distinct error/empty states (would leak existence/withdrawal).
- **D3 — `ClipDetailView` (new), `ClipView`/`LibraryClipView` unchanged**: the detail needs provenance +
  two consent roles the other views don't carry; additive, so existing reads stay byte-stable.
- **D4 — Non-playing "Sample preview" still (Q1)**: honest stand-in (FR-019); no `<video>` (no real render,
  no source media); the same seam T8 swaps real playback into. Chosen over playing the generic sample
  (implies a finished render) or leading with absent source footage.
- **D5 — Route `/app/clip/[id]` (Q2)**: durable canonical clip URL, reusable beyond the Library.
- **D6 — Library-card re-wire (Q3)**: card → clip detail; the source-proof link relocates into the detail;
  appearance-preserving.

**Output**: `research.md` (no NEEDS CLARIFICATION remain — Q1–Q3 resolved in the spec; D1–D6 recorded).

## Phase 1 — Design & Contracts

- **`data-model.md`**: the `ClipDetailView` shape, the `getClip` projection (clip + proof + source +
  made-under consent + current effective consent), and the **no-oracle / withdrawal** derivation — no
  entity/schema change.
- **`contracts/clip-read.md`**: `getClip` signature, the four-way join, the three-into-one null, the two
  consent roles, the owned-only projection, and the byte-stability assertions.
- **`contracts/clip-detail-surface.md`**: the route (page/loading/error/not-found) + the data/detail/
  skeleton/not-found components, the two-column layout (sample-still + hook | provenance + actions), the
  re-make → studio action, the source-proof link, the Library-card re-wire, and the A-11 omissions
  (download/export/publish/share, no inline play) with the FR-019 + P-VII assertions.
- **`quickstart.md`**: open a clip from the Library; confirm the sample-still + owned metadata + provenance
  (made-under vs current consent); deep-link a withdrawn (Leo M.) / missing / cross-workspace id → the
  identical content-free not-found; the source-proof link + re-make → studio; the re-wired card
  (appearance-preserving); the DoD gates (no inline play / download / export / publish; byte-stability; no
  new dep; build green without `DATABASE_URL`; responsive + keyboard).
- **Agent context**: update the `<!-- SPECKIT START/END -->` pointer in `CLAUDE.md` to this plan and mark
  T3.2 the active slice (the only edit outside `specs/` during planning; left **uncommitted** for review).

**Re-check Constitution after Phase 1**: still all PASS — one additive read + view + a derived surface, no
schema change, no new dependency, P-VII via the shared gate + no-oracle not-found (audit-preserving), A-11
honest omissions + non-playing still, owned-only values (FR-019), ProofCard/shared shapes/existing reads
byte-stable, chrome untouched.

## Complexity Tracking

No constitution violations to justify — the table is intentionally empty. (The P-V "no screen to port" is a
documented derived-surface exception, not a violation — see Constitution Check.)

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
