# Implementation Plan: T2.3 — Proof Detail (the spine continues)

**Branch**: `main` (a `T2.3-proof-detail` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T2.3-proof-detail/spec.md`

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Stop and report after Phase 2 planning.

## Summary

Replace the `/app/proof/[id]` placeholder with a faithful port of `/design-reference` screen 03 (Proof
detail) inside the existing T1 AppChrome. A **Server** page resolves the current workspace via the
unchanged T1 seam and performs **one workspace-scoped read** of a single proof through
`getProof(workspaceId, id)` (the T2.2 signature), wrapped in `withDbRetry`. To be faithful to screen
03's consent panel ("granted · {date} · v{n}") without changing the shared read, `getProof` is upgraded
to return a **detail-specific projection `ProofDetailView`** = `ProofView` + the effective consent's
**version** and **effective date** (for all states) — a **projection-only** change; the shared
`ProofView`, `getProofs`, and the canonical ProofCard stay byte-stable. The detail is **Server-first**:
read + display only, with **no Client island** (the single "action", "Make a clip", is consent-gated and
inert). **Tenant isolation**: the scoped `getProof` returns `null` for a missing **or** cross-workspace
id; the page calls Next's **`notFound()`**, rendering one honest **not-found** state — identical for both
cases (no existence oracle, no leak) and distinct from the genuine-failure **error** boundary. Per **Q1**
the media region is **conditional** (rendered only when the proof actually has media; absent for every
current fixture → the transcript/quote leads with no empty frame). Per **Q3** there is **no tab chrome** —
the transcript is shown as the content. Loading / not-found / error reuse the T2.1/T2.2 skeleton,
`withDbRetry`, and the shared `<ErrorState>`. No schema/seed/seam change, no new dependency.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: Existing only — `next`, `react`, `drizzle-orm`, `@neondatabase/serverless`,
`lucide-react`, `next-themes`. **No new dependency.**

**Storage**: Neon Postgres via the lazy `getDb()` + Drizzle. Read-only; **schema unchanged**. The
consent date+version are read from the existing `consent` table (projection-only).

**Testing**: No unit-test runner (as in T1/T2.1/T2.2). Verification = `npm run typecheck`/`lint`/`build`,
CI, the rendered `/app/proof/[id]`, and the `quickstart.md` DoD checks (ProofView/ProofCard byte-stable,
no new dep, both themes, breakpoints, keyboard, tenant-isolation not-found).

**Target Platform**: Vercel; modern browsers. `/app/*` is `force-dynamic` (from the T1 layout), inherited
by `[id]`.

**Performance Goals**: Detail interactive within a few seconds even on a Neon cold start; single-row read.

**Constraints**: Server Components by default, Client only where interaction requires it (P-X) — here that
is **only** the framework-required `error.tsx` boundary; Tailwind token utilities only; no
`localStorage`/`sessionStorage`; Drizzle only; `prefers-reduced-motion` honoured by the global rule.

**Scale/Scope**: One screen (screen 03); one proof per request; the `ProofDetailView` projection change
and the detail UI. No list, no studio.

## Constitution Check

*GATE: re-checked after Phase 1 (below). All gates PASS.*

- [x] **Customer is the headline (P-II)**: The largest, warmest element is the customer's verbatim words
      (quote/transcript) in Fraunces. With no media file (every fixture), the words lead honestly rather
      than a placeholder pretending to be a video; metadata/consent/source/actions stay quiet chrome.
- [x] **Locked stack (P-III)**: Next 15 / React 19 / TS strict, Tailwind v4, Neon + Drizzle. No new
      dependency. Auth seam untouched. No heavy render (the studio is T2.4/T8; "Make a clip" is inert).
- [x] **Pressroom tokens (P-IV)**: Token utilities only. **Persimmon appears ONLY** on the primary
      "Make a clip" action and the verified mark — consent panel, metadata, secondary actions, and the
      back link are ink. No off-token values.
- [x] **Port, don't redesign (P-V)**: Ported from `/design-reference/Weavova/The spine/03 _ Proof
      detail _app_proof_id_`. The **A-11 port-completeness rule** governs which not-yet controls render:
      the un-owned warmth/sentiment panel is **not rendered** (FR-008/019); the Transcript-only content
      replaces the dead tab strip (Q3); the media region is **conditional** (Q1); "Make a clip" (and the
      secondary format/ask actions) are present-but-inert standalone entry-points. Undesigned states
      (not-found / loading / error) are surfaced as derived states (A-06), not invented layouts.
- [x] **Fixtures-first (P-VI)**: Data flows through the T0.3 query layer (`getProof`, workspace-scoped)
      over the seeded fixtures; `ProofDetailView` is a projection over the existing schema (no new stored
      entity); the shared `ProofView` contract is unchanged, so the T6 multi-tenant swap stays mechanical.
- [x] **Consent enforcement (P-VII)**: The consent state + date + version are shown honestly and
      **read-only**; asset-deriving actions ("Make a clip", and the secondary format actions) render
      **only when consent is "granted"** — no clip/asset path from non-consented proof. Revocation
      cascade remains a model property (T0.3), unchanged here.
- [x] **No editor (P-VIII)**: N/A — the detail reads one proof and links toward the studio. "Make a clip"
      is an inert link target, not an editor; no timeline/track/scrubber.
- [x] **SDD scope (P-IX, P-XI)**: One vertical slice (T2.3). The studio, format makers, request flow, and
      real consent management are NOT built. No speculative work.
- [x] **Ambiguity handling (P-XII)**: The three screen-03 ambiguities (media / consent fidelity / tabs)
      were resolved with the human (Q1–Q3) and are reflected in the spec; not-found (no reference screen)
      is a derived state, not guessed.

**Definition of done (P-Governance)**: renders on real (fixture) data; handles not-found (tenant
isolation) / loading / error; responsive at 480/1024/1280 + 1240 max; on-token; keyboard-accessible;
passes its acceptance criteria; builds green. Tracked in `quickstart.md`.

## Architecture & Data Flow

### Runtime path (request → screen)

```text
GET /app/proof/[id]
  └─ app/app/layout.tsx (Server, force-dynamic)            [T1, unchanged] — resolves workspace for chrome
       └─ app/app/proof/[id]/page.tsx (Server)             [REPLACES placeholder]
            const { id } = await params                     (Next 15 — params is a Promise)
            const ws = await getCurrentWorkspace()           (seam, retry-hardened via getDefaultWorkspace)
            <Suspense fallback={<ProofDetailSkeleton/>}>
              <ProofDetailData workspaceId={ws.id} id={id}/> (async Server)
                 proof = await getProof(ws.id, id)           ── ProofDetailView | null, withDbRetry, scoped
                 proof === null  → notFound()                (missing OR cross-workspace → 404 semantic)
                 else            → <ProofDetail proof={proof}/>  (Server presentational)
            </Suspense>
  null (missing/other-workspace) → app/app/proof/[id]/not-found.tsx (Server) → <ProofDetailNotFound/>
  read fails past retries         → app/app/proof/[id]/error.tsx (Client)    → <ErrorState onRetry={reset}/>
  layout workspace read fails     → app/error.tsx (root, from T2.1)          → <ErrorState/>   (unchanged)
```

Three **distinct** state files, three distinct meanings (FR-012): `loading.tsx`/Suspense (loading) ·
`not-found.tsx` (an honest, expected 404 — proof not in this workspace) · `error.tsx` (a genuine read
failure past `withDbRetry`, with retry). The inbox's own `app/app/proof/error.tsx` (T2.2) is unrelated;
`[id]` gets its **own** `error.tsx` so `reset()` re-runs the detail read, not the inbox.

### The `ProofDetailView` projection (Q2 / A-12 — the one read change)

`ProofDetailView` lives in `src/lib/proof.ts` beside `ProofView` (the shared shape home). It is a
**superset** of `ProofView`:

```text
ProofDetailView = ProofView + {
  consentVersion: number | null   // the effective (latest-version) consent row's version
  consentAt:      string | null   // ISO; effective date per state (see below)
}
```

- **`consentAt` semantics** (owned data, never fabricated): the effective consent row's
  `coalesce(revokedAt, grantedAt, createdAt)` — i.e. **granted → grantedAt**, **revoked → revokedAt**,
  **awaiting → createdAt** (the consent capture time). The UI labels by `consentState` (already on
  `ProofView`): "Consent granted · {date} · v{n}" / "Consent revoked · {date} · v{n}" / "Awaiting consent
  · v{n}" (date optional for awaiting).
- **Where it is built** — `src/db/queries.ts`, **without touching the shared pieces**:
  - `proofColumns`, `toView`, **`getProofs`** are **unchanged** (byte-stable → the inbox/card/styleguide
    keep `ProofView`).
  - Add two correlated subqueries mirroring the existing `latestConsentState` idiom:
    `latestConsentVersion` (`select version … order by version desc limit 1`) and
    `latestConsentEffectiveAt` (`select coalesce(revoked_at, granted_at, created_at) … order by version
    desc limit 1`).
  - `detailColumns = { ...proofColumns, consentVersion, consentEffectiveAt }` and a `toDetailView` mapper
    = `{ ...toView(row), consentVersion, consentAt: row.consentEffectiveAt?.toISOString() ?? null }`.
  - **`getProof(workspaceId, id)`** now selects `detailColumns`, keeps the `and(eq(workspaceId), eq(id))`
    predicate + `limit(1)` + `withDbRetry`, and returns **`ProofDetailView | null`**. (No existing caller
    — T2.2 fixed the signature with no consumer — so refining the return type is safe and
    forward-compatible: `ProofDetailView extends ProofView`.)
- **No schema/seed change.** Three correlated subqueries on a single row is negligible; a `LATERAL` join
  selecting the latest consent row once was considered and rejected to keep the established correlated-
  subquery idiom and a minimal diff (see `research.md` D2).

### Tenant isolation & the not-found mechanism (US3 / FR-011–FR-012)

- `getProof(ws.id, id)` already filters on **both** `workspaceId` and `id`; a non-existent id and an id
  in another workspace **both** return `null` — there is no query path that returns another tenant's row.
- On `null`, `ProofDetailData` calls Next's **`notFound()`**, which renders the nearest
  `app/app/proof/[id]/not-found.tsx` **inside the persisting AppChrome** (the rail/top bar stay). This is
  the idiomatic Next 404 convention, semantically separate from `error.tsx` (thrown failures) — so
  not-found is never confused with an error (FR-012), and never shows raw error text.
- **No existence oracle**: both not-found causes render the **same** `not-found.tsx` output (same copy,
  same status) — an observer cannot distinguish "doesn't exist" from "exists but not yours". No proof
  content, name, or metadata of the requested/other proof is rendered (SC-005).

### Conditional media region (Q1 / FR-009)

- A pure predicate `hasMedia(proof)` — true only when the proof carries a **real media reference**
  (`proof.thumbnail` present; media type). `ProofView.thumbnail` is the only media ref and is `null` for
  every fixture → `hasMedia` is **false now**, so `ProofDetailMedia` **renders nothing** (no empty frame,
  poster, placeholder, or fake/disabled player). The content column then leads with the transcript/quote.
- Same **seam logic as the T2.1 clip cells**: when a real media reference lands (T7/T8), the same region
  renders the player with no relayout. The detail never fabricates a duration, scrubber, or play action.

### The screen-03 content & side panel (port; A-11 / FR-019)

- **Content column** (left): the **conditional** media region (above), then the customer's words as the
  headline — `transcript` (media proofs) or `quote` (text proofs) in Fraunces. **No tab chrome** (Q3): the
  transcript is the content; "Suggested formats" / "Generated assets" / "Activity" are **not rendered**
  (no fabricated "· N" count; they return at T2.4+). The "Use this as the hook" transcript action is
  **not rendered** (coupled to the T2.4 studio).
- **Side panel** (right): customer name + verified mark; source label; captured date; proof type;
  reviewed/unreviewed state. The **consent panel** shows state + date + version, **read-only** (no
  grant/revoke/edit; no "Record" history — deferred). The **un-owned warmth/sentiment panel is NOT
  rendered** (FR-008/019). The product/variant line and capture-channel phrasing are **omitted** (not
  owned — FR-017).
- **Action cluster** (A-11 application of FR-016c — **RESOLVED**, human decision 2026-06-16): render
  **only "Make a clip"**; **hide** the rest until their tiers.
  - **"Make a clip"** — persimmon primary, **present-but-inert** (no-op, never errors; wired to the clip
    studio at **T2.4** — the very next slice), **consent-gated** (rendered only when `consentState ===
    "granted"`). It is the detail's live spine CTA.
  - **"Carousel" (T4) / "Embed" (T5) / "Ask this customer for more" (outreach, later tier)** — **NOT
    rendered**. Their homes are further out, and three more inert buttons would be the "dead toolbar"
    A-11 warns against; they return when they actually work (and best tell the multi-format story then) —
    the same **defer-whole** logic as the T2.2 batch cluster (recorded in A-09).
  - For non-granted proof, "Make a clip" is hidden (P-VII); with the others deferred the side panel then
    carries **no** action — honest (nothing to do but read).

### Server / Client split (P-X)

- **Server (all of it)**: `app/app/proof/[id]/page.tsx`, `loading.tsx`, `not-found.tsx`,
  `proof-detail-data.tsx`, `proof-detail.tsx`, `proof-detail-media.tsx`, `proof-detail-consent.tsx`,
  `proof-detail-meta.tsx`, `proof-detail-actions.tsx`, `proof-detail-skeleton.tsx`,
  `proof-detail-not-found.tsx`. The detail is read + display; the inert actions are handler-less
  `<button type="button">` and the back link is a `<Link>` — **no Client island is needed**.
- **Client (framework-required only)**: `app/app/proof/[id]/error.tsx` (`"use client"`, error boundaries
  must be Client). This is a boundary, not an interaction surface.

### Reuse (from T2.1/T2.2)

`withDbRetry` (wrap `getProof`), the shared `<ErrorState>` (the `[id]` error boundary), the Suspense +
`loading.tsx` skeleton pattern, and the root `app/error.tsx` boundary are reused **unchanged**. Only
proof-detail-specific UI and the `ProofDetailView` projection are new.

## Project Structure

### Documentation (this feature)

```text
specs/T2.3-proof-detail/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions (projection shape/location, not-found mechanism, media predicate, actions)
├── data-model.md        # Phase 1 — ProofDetailView read model + the consent date/version derivation
├── contracts/
│   ├── queries-proof-detail.md   # getProof → ProofDetailView projection + tenant-isolation contract
│   └── detail-states.md          # loading / not-found / error state contract (distinctness, no-oracle)
├── quickstart.md        # Phase 1 — validation/run guide + DoD checks
└── checklists/requirements.md    # (from /speckit.specify)
```

### Source Code — files this slice adds / changes

```text
src/
├── app/app/proof/[id]/
│   ├── page.tsx                 # CHANGE: placeholder → Server detail page (resolve ws + Suspense(ProofDetailData))
│   ├── loading.tsx              # ADD: route-segment loading fallback → <ProofDetailSkeleton/>
│   ├── error.tsx                # ADD: "use client" page boundary → <ErrorState onRetry={reset}/>
│   └── not-found.tsx            # ADD: Server — honest not-found (tenant isolation) → <ProofDetailNotFound/>
├── components/app/proof-detail/
│   ├── proof-detail-data.tsx    # ADD: async Server — getProof(ws,id); null → notFound(); else <ProofDetail/>
│   ├── proof-detail.tsx         # ADD: Server — screen-03 layout (content column + side panel)
│   ├── proof-detail-media.tsx   # ADD: Server — CONDITIONAL media region (renders only when hasMedia)
│   ├── proof-detail-consent.tsx # ADD: Server — consent panel (state + date + version, read-only)
│   ├── proof-detail-meta.tsx    # ADD: Server — customer/source/date/type/verified/reviewed
│   ├── proof-detail-actions.tsx # ADD: Server — inert, consent-gated "Make a clip" ONLY (Carousel/Embed/Ask-for-more NOT rendered)
│   ├── proof-detail-skeleton.tsx# ADD: Server — layout skeleton (for Suspense + loading.tsx)
│   └── proof-detail-not-found.tsx # ADD: Server — honest not-found panel + back-to-inbox link
├── lib/proof.ts                 # CHANGE: ADD ProofDetailView (ProofView + consentVersion + consentAt). ProofView UNCHANGED.
└── db/queries.ts                # CHANGE: getProof → ProofDetailView (detailColumns + toDetailView + 2 consent subqueries). getProofs/proofColumns/toView UNCHANGED.

# UNCHANGED (asserted in quickstart DoD checks):
#   src/components/proof-card.tsx          (byte-identical — detail does NOT use it; FR-023)
#   src/lib/proof.ts → ProofView, ProofCardProps   (shared shape unchanged; only ProofDetailView added)
#   src/db/queries.ts → getProofs, proofColumns, toView, latestConsentState   (inbox/card stay byte-stable)
#   src/components/app/error-state.tsx, src/db/with-retry.ts   (reused as-is)
#   src/lib/session.ts, src/db/schema.ts, src/db/seed.ts       (seam/schema/seed untouched)
#   src/app/error.tsx, src/app/app/proof/error.tsx             (T2.1 root + T2.2 inbox boundaries, reused)
```

**Structure Decision**: Single Next.js App Router project. Detail UI grouped under
`src/components/app/proof-detail/` (mirroring `…/dashboard/` and `…/proof-inbox/`). The read + the
detail-only projection live in the existing `src/db/` + `src/lib/` layers; reliability (`withDbRetry`),
the error surface (`<ErrorState>`), and the loading pattern are reused verbatim from T2.1/T2.2.

## Phase 0 — Outline & Research

All Technical Context items are known; research resolved the plan-level design choices the spec's Q1–Q3
left to the plan (full write-up in `research.md`):

- **D1 — Where `ProofDetailView` lives & how it's built**: a superset type in `src/lib/proof.ts`; built in
  `getProof` via `detailColumns` (= `proofColumns` + two correlated consent subqueries) + `toDetailView`,
  leaving `proofColumns`/`toView`/`getProofs` byte-stable. Chosen over editing the shared projection
  (would ripple into the inbox/card) or a separate `getProofDetail` function (needless duplication —
  `getProof` had no consumer yet).
- **D2 — Consent effective date**: `coalesce(revokedAt, grantedAt, createdAt)` of the latest-version row,
  labelled by state in the UI. Correlated subqueries over a `LATERAL` join (keeps the existing idiom,
  smaller diff; single-row read so cost is moot).
- **D3 — Not-found mechanism**: Next's **`notFound()` + `[id]/not-found.tsx`** (inside the chrome) over an
  in-page conditional — idiomatic 404 semantics, cleanly distinct from `error.tsx`, and naturally
  oracle-safe (one output for missing and cross-workspace).
- **D4 — Conditional media (Q1)**: a `hasMedia` predicate gating `ProofDetailMedia`; renders nothing when
  absent (no placeholder). Same seam as the T2.1 clip cells; forward-compatible for real media.
- **D5 — Server-first, no Client island**: read + display + inert actions need no client interactivity;
  the only `"use client"` file is the framework-required `error.tsx` boundary.
- **D6 — Action cluster (A-11)**: present-but-inert, consent-gated for asset-deriving actions; documented
  as a reviewable A-11 call with a minimal-alternative.

**Output**: `research.md` (no NEEDS CLARIFICATION remain — Q1–Q3 resolved in the spec).

## Phase 1 — Design & Contracts

- **`data-model.md`**: documents `ProofDetailView` (the read projection), the consent date/version
  derivation, `hasMedia`, and the consent-gate predicate. No DB schema change; no new stored entity.
- **`contracts/queries-proof-detail.md`**: the `getProof(workspaceId, id) → ProofDetailView | null`
  contract — the projection, the consent date/version semantics, the tenant-isolation guarantee, and the
  byte-stability of `ProofView`/`getProofs`.
- **`contracts/detail-states.md`**: the loading / not-found / error contract — the three distinct
  mechanisms, the no-existence-oracle property, and "no raw error text".
- **`quickstart.md`**: runnable validation — open a proof from the inbox; verify the words lead, the
  metadata + consent (state/date/version) render from data, no media frame appears (no fixture media),
  the consent gate hides asset actions for awaiting/revoked, a non-existent id and a cross-workspace id
  both show the same not-found, cold-start recovery + error; DoD gates (ProofView/ProofCard byte-stable,
  no new dep, typecheck/lint/build green, both themes, breakpoints, keyboard).
- **Agent context**: update the `<!-- SPECKIT START/END -->` pointer in `CLAUDE.md` to this plan and mark
  T2.3 the active slice.

**Re-check Constitution after Phase 1**: still all PASS — no new dependency, no schema change, no
off-token styling, ProofView/ProofCard/getProofs/seam/schema/seed untouched, A-11 + FR-019 honoured,
tenant isolation enforced by the scoped read + `notFound()`.

## Complexity Tracking

No constitution violations to justify — the table is intentionally empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
