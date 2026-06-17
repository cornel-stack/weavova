# Phase 0 — Research: T2.4b Clip Studio

All of the spec's open questions were resolved with the human before planning (Q1→B, Q2→A, Q3→A), so no
`NEEDS CLARIFICATION` remain. This file records the **implementation design decisions** (D1–D8) the plan
rests on — each as Decision / Rationale / Alternatives.

---

## D1 — Overlay routing: a dedicated nested route inside AppChrome

**Decision**: Implement `/app/proof/[id]/studio` as a normal nested **route segment** (`page.tsx` +
`loading`/`error`/`not-found`/`actions`), rendered **full-bleed inside the existing `/app` AppChrome**.
"Overlay over the proof" = the studio covers the proof content area within the unchanged chrome; the
**close** affordance Links back to `/app/proof/[id]`.

**Rationale**: Screen 04 is a **full studio surface**, not a small modal floating over a visible proof. A
real route is **hard-refresh- and direct-URL-safe**, which is *required* by the spec: the consent gate and
tenant isolation must run when the studio is reached directly (FR-008 edge, US3 edge), not only via the
button. The `/app` layout already wraps every child in the rail/top-bar/switcher/palette, so the route sits
inside the chrome with no chrome changes (FR-001).

**Alternatives considered**:
- *Intercepting + parallel route modal* (`@modal` slot + `(.)studio`): the canonical Next "modal from a
  page" pattern. Rejected — it still needs the underlying page for hard-nav, adds slot wiring, and frames a
  full-screen studio as a modal, which fits screen 04 poorly.
- *Client-only overlay state on the detail* (no route): rejected — breaks the `/app/proof/[id]/studio`
  sitemap URL, loses direct-access consent enforcement, and pushes the read to the client.

---

## D2 — Generate is a Next.js Server Action (the app's first mutation)

**Decision**: `generateClip` is a `"use server"` Server Action co-located at the route
(`studio/actions.ts`), invoked by the one Client island (`clip-studio-form.tsx`). It returns a typed
discriminated result.

**Rationale**: Generate is a **write** — the first mutation in an otherwise read-only app. A Server Action
keeps Drizzle and the session seam server-side, gives end-to-end types to the client, and integrates with
`revalidatePath` so T2.4a's reads refresh. It matches Principle X (Server Components by default; the client
island exists only for the interactive form + the press-run).

**Alternatives considered**:
- *Client `fetch` → a route handler*: more plumbing, hand-rolled serialization, no built-in revalidation
  ergonomics. Rejected.
- *Mutating inside a Server Component render*: forbidden (renders must be side-effect-free). Rejected.

---

## D3 — Consent re-check: a new gated read `getGrantedConsentId`, reusing the shared helper

**Decision**: Add `getGrantedConsentId(workspaceId, proofId): Promise<{ consentId: string } | null>`
(`withDbRetry`-wrapped, workspace-scoped via a `proof` join). It returns the **latest** consent row's `id`
**iff** the proof's **effective** consent is `granted`, reusing T2.4a's shared `effectiveConsentState`;
otherwise `null` → the action blocks (no write).

**Rationale**: The write needs the **consent row id** (for `derived_asset.consentId` provenance) *and* a
fresh effective-consent decision. `getProof` exposes `consentVersion`/`consentAt` but **not** the consent
row id, so a dedicated gated read is required. Reusing `effectiveConsentState` guarantees the generate gate
**provably matches** T2.4a's withdrawal gate and the proof-read consent logic (one source of truth, P-VII).
Scoping via the `proof` join means a cross-workspace or missing `proofId` returns `null` (block, no leak).

**Alternatives considered**:
- *Reuse `getProof` and trust its `consentState`*: rejected — no consent row id, and it would re-derive the
  gate separately from the shared helper (drift risk).
- *Read all consent versions and pick latest in JS*: rejected — duplicates the correlated-subquery logic
  already centralized in `effectiveConsentState`.

---

## D4 — The insert is a single attempt (not retry-wrapped)

**Decision**: `insertDerivedAsset(...)` runs as a **single** insert; it is **not** wrapped in
`withDbRetry`. A failure returns `{ status: 'error' }` and the user can re-Generate. The consent re-check
read (D3) keeps the `withDbRetry` cold-start hardening.

**Rationale**: `withDbRetry` is designed for **idempotent reads**. An insert with no natural unique key is
non-idempotent — a blind retry on a "fetch failed"-style transient (where the write may actually have
landed) could **double-write** a clip. Reads can be retried freely; the write cannot.

**P-VII robustness**: the tiny window between re-check and insert is safe because withdrawal is
**read-time** — a clip written under a just-revoked consent is excluded by T2.4a's reads on the very next
render. The re-check still blocks the *write* itself when not granted (FR-008).

**Alternatives considered**:
- *Wrap the insert in `withDbRetry`*: rejected (double-write risk).
- *An `INSERT … SELECT … WHERE effective consent = granted` guarded write* (gate in one statement): a valid
  hardening, but the re-check-then-insert is simpler, reuses the shared read, and the read-time withdrawal
  already makes a stale write harmless. Recorded as a future option, not adopted now.

---

## D5 — Extract `SAMPLE_CLIP_URL` to a shared module

**Decision**: Move the stubbed sample-clip reference (currently the `seed.ts` literal
`r2://weavova-samples/press-run-sample.mp4`) into a shared module (`src/lib/clip.ts`) and have both the seed
and the Server Action import it.

**Rationale**: Both the seed and Generate must point the stubbed clip at the **same** R2 sample. A single
exported constant prevents drift (and is the seam the T8 engine swaps). The seed's current value is
byte-identical, so the seed change is behaviour-preserving (and optional — flagged in the plan).

**Alternatives considered**:
- *Duplicate the literal in the action*: rejected — two sources of truth drift.

---

## D6 — Undesigned states are honest derived states (P-XII)

**Decision**: The states screen 04 doesn't depict — **consent-required**, **not-found**, **loading**,
**error** — are rendered as honest derived states: reuse the detail's tenant-isolated not-found, the shared
`<ErrorState>` (retry, no raw text), and an on-token skeleton; the consent-required state is a small honest
panel ("consent required — no clip produced"). None are invented "designs."

**Rationale**: A-08/A-11 + P-XII: a faithful port surfaces real states rather than inventing screens or
rendering dead controls.

---

## D7 — Reuse the T2.1–T2.3 reliability stack

**Decision**: Reuse `withDbRetry` (reads), the shared `<ErrorState>`, the `loading.tsx`/skeleton pattern,
and server-first composition verbatim — exactly as the proof detail (T2.3).

**Rationale**: Proven building blocks; consistency; zero new surface area (FR-013/014).

---

## D8 — Hand-rolled input validation, not Zod

**Decision**: Validate the Server Action input (`proofId`, `format`, `hook`) with a **small hand-rolled
guard** against the existing `ClipFormat` enum values — **not** Zod.

**Rationale**: Principle X *prefers* Zod for shared validation, but Zod is **not currently a dependency**
(absent from `package.json`). Adding it is a **new dependency**, which this slice forbids (FR-018 / "no new
dependency", Principle XI). The validation needed here is tiny (one enum membership check, a string trim +
length cap, a non-empty id), so a guard is proportionate. Introducing Zod project-wide is a legitimate but
**separate, explicitly-flagged** decision — out of scope for T2.4b.

**Alternatives considered**:
- *Add Zod now*: rejected for this slice (new dependency; flag-and-approve required first).
- *No validation (trust the client)*: rejected — the action is a server trust boundary; a bad `format`
  would violate the `clip_format` enum at insert and a client could attempt a cross-workspace `proofId`
  (already neutralized by the workspace-scoped re-check, but the guard fails fast and honestly).

---

**Output**: all design decisions resolved; proceed to Phase 1 design artifacts.
