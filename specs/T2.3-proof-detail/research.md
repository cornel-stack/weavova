# Phase 0 — Research: T2.3 Proof Detail

Technical Context is fixed by the locked stack; the three product ambiguities (media / consent fidelity /
tabs) were resolved with the human in the spec (Q1–Q3). This file records the plan-level design
decisions. No `NEEDS CLARIFICATION` remain.

## D1 — Where `ProofDetailView` lives and how `getProof` builds it (Q2/A-12)

- **Decision**: `ProofDetailView` is a **superset type** declared in `src/lib/proof.ts` next to
  `ProofView` (`ProofDetailView extends ProofView` + `consentVersion: number | null`, `consentAt: string |
  null`). In `src/db/queries.ts`, `getProof` builds it from a **detail-only projection**:
  `detailColumns = { ...proofColumns, consentVersion, consentEffectiveAt }` + a `toDetailView` mapper that
  spreads `toView(row)` and adds the two consent fields. `proofColumns`, `toView`, and `getProofs` are
  **not touched**.
- **Rationale**: Faithful to screen 03's "granted · {date} · v{n}" using **owned** consent data, while
  keeping the shared `ProofView` / `getProofs` / ProofCard **byte-stable** (T2.2 and the inbox must not
  rework). Projection-only — no schema/seed change.
- **Alternatives rejected**: (a) extend the shared `proofColumns`/`ProofView` — ripples into the inbox and
  the card (byte-stability lost) for data only the detail needs; (b) a separate `getProofDetail()` function
  — needless duplication of the scoped read, and `getProof` had no consumer yet (T2.2 fixed the signature
  for exactly this), so refining its return type (`ProofView` → `ProofDetailView`) is safe and
  forward-compatible.

## D2 — The effective consent date + version

- **Decision**: The effective consent = the **latest version** row (max `version`). Carry its **version**
  and an **effective date** = `coalesce(revokedAt, grantedAt, createdAt)`: **granted → grantedAt**,
  **revoked → revokedAt**, **awaiting → createdAt** (capture time). Read via **two correlated subqueries**
  mirroring the existing `latestConsentState` idiom; the UI labels the date by `consentState`.
- **Rationale**: All three are owned columns on `consent` (no fabrication). Coalescing gives an honest,
  state-appropriate date for every state — including the seeded revoked proof (its revocation date+version).
  Correlated subqueries keep the established pattern and a minimal diff.
- **Alternatives rejected**: a `LATERAL` join selecting the latest consent row once (one subquery instead
  of three) — cleaner in isolation, but diverges from the file's idiom for no real gain at single-row
  scale; deferred unless a future read needs many consent fields at once. Fabricating an "awaiting" date
  other than the real capture time — forbidden (FR-019).

## D3 — The not-found mechanism (US3 / tenant isolation)

- **Decision**: When `getProof(ws.id, id)` returns `null`, the data component calls Next's **`notFound()`**,
  rendering `app/app/proof/[id]/not-found.tsx` **inside** the persisting AppChrome. A non-existent id and a
  cross-workspace id both return `null` → both hit the **same** not-found output.
- **Rationale**: Idiomatic Next 404 semantics; renders within the layout (chrome persists); is structurally
  **distinct** from `error.tsx` (which catches thrown failures) so not-found is never confused with an
  error (FR-012); and is naturally **oracle-safe** — identical output for "missing" and "not yours", no
  proof content leaked (SC-005).
- **Alternatives rejected**: an in-page conditional rendering a not-found panel (works, but muddies the
  page's happy path and risks diverging copy/status from a real 404); throwing an error (wrong semantics —
  would surface the error state, conflating not-found with failure).

## D4 — Conditional media region (Q1)

- **Decision**: A pure `hasMedia(proof)` predicate (true only when a **real media reference** exists —
  `proof.thumbnail` present on a media-type proof) gates `ProofDetailMedia`. When false (every current
  fixture: `thumbnail = null`), the media component **renders nothing** — no frame, poster, placeholder, or
  disabled player — and the transcript/quote leads as the content.
- **Rationale**: Honest now (FR-009/019) and **forward-compatible**: real media (T7/T8) renders in the same
  region with no relayout. This is the **same seam logic as the T2.1 clip cells** (render-from-data-presence).
- **Alternatives rejected**: a disabled "coming soon" player or an empty poster — the A-11 greyed-out
  anti-pattern; implies media exists when none does (Q1→A explicitly refined to *no placeholder*).

## D5 — Server-first; no Client island (P-X)

- **Decision**: Every detail component is a **Server Component**. The only `"use client"` file is
  `app/app/proof/[id]/error.tsx` (error boundaries must be Client) — a framework boundary, not an
  interaction surface.
- **Rationale**: The detail is read + display. Its single action ("Make a clip", plus the secondary inert
  actions) is a **handler-less `<button type="button">`** (present-but-inert, wired in T2.4), and the back
  navigation is a `<Link>` — neither needs client state. Keeping it Server-first minimises the client
  bundle and matches the dashboard's Server-first split.
- **Alternatives rejected**: a client island for the actions — unnecessary while the actions are inert;
  would be introduced in T2.4 when "Make a clip" actually opens the studio.

## D6 — The screen-03 action cluster (A-11 application of FR-016c — RESOLVED)

- **Decision** (human, 2026-06-16): render **only "Make a clip"** (persimmon, present-but-inert,
  consent-gated; destination = clip studio **T2.4**). **Hide** "Carousel" (**T4**), "Embed" (**T5**), and
  "Ask this customer for more" (outreach, later tier) — **defer-whole**, as T2.2 hid its batch cluster.
- **Rationale**: "Make a clip" is the detail's primary spine action and its destination is the **very next
  slice**, so it's the live CTA; the rest are secondary outputs with further-out homes, and three more
  inert buttons is the "dead toolbar" A-11 tells us to avoid. They return when they actually work (which is
  also when they best tell the multi-format story).
- **Consequence**: for non-granted proof the side panel carries **no** action (honest — read-only), since
  "Make a clip" is consent-gated and the rest are deferred.

## D7 — Reuse of the T2.1/T2.2 reliability + state infrastructure

- **Decision**: Reuse, unchanged — `withDbRetry` (wrap the `getProof` read), the shared `<ErrorState>`
  (the `[id]` error boundary), the Suspense + `loading.tsx` skeleton pattern, and the root `app/error.tsx`.
  Add a `[id]`-scoped `error.tsx` so `reset()` re-runs the **detail** read.
- **Rationale**: These encode the cold-start/error behaviour the detail needs; rebuilding would duplicate
  UI and diverge. Only detail-specific UI + the projection are new.
- **Alternatives rejected**: relying on the T2.2 inbox `error.tsx` to also cover `[id]` — it would catch the
  throw, but `reset()` would target the inbox segment, not the detail; a scoped boundary is correct.
