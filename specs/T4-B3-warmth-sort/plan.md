# Implementation Plan: T4-B3 — Warmth sort (rank the proof inbox by content-readiness)

**Branch**: `main` (a `T4-B3-warmth-sort` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T4-B3-warmth-sort/spec.md` with clarifications folded:
**Q1→A** all four signals (completeness + un-tapped + recency, **consent as a gate**) · **Q2→A**
sort-order only (no per-proof number/badge; honest explanatory copy on the control) · **Q3→A** a
toggle whose **default stays Newest** (opt into Warmest).

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Do **not** run git. **No decision
needs ratification** — the plan finds **no new dependency, no schema change, no new route**, and the one
non-trivial design choice (the **warmth function** + the **opt-in-lazy** wiring of the additive
clip-status read) is fully specified here for review. When implemented, every change is left
**uncommitted** for Cornel to review and commit (mirrors prior slices).

## Summary

The **last remaining T4 slice** — makes the inbox's long-stubbed **"Warmest — coming soon"** sort
option **real** (A-11). Warmth is an **honest, read-time ordering** of the proof inbox by
**content-readiness** — how ready and worth-it a proof is to become content — computed **only** from
owned facts. It ships **one real ordering** and keeps the inbox otherwise untouched:

1. **A real Newest ↔ Warmest toggle** on the inbox toolbar (the disabled option becomes live), with
   **honest copy** stating warmth = content-readiness from owned signals (recent · has a full quote or
   media · not yet clipped) — **never** an engagement/conversion/view prediction (FR-019). **No
   per-proof badge or number** (Q2:A).
2. **A transparent warmth function** (new pure `src/lib/warmth.ts`) ordering proof by a lexicographic
   composite of owned facts: **consent gate → content-readiness (completeness + un-tapped) → recency**.
   No magic weighted number is shown; the order is explicable from owned data.
3. **The opt-in-lazy clip-status read** — the one signal not already on `ProofView` (**un-tapped**)
   comes from an **additive** read fired **only when the user toggles to Warmest**, so the **default
   Newest render is byte-stable** and the extra read **never fires on the default path**.

**Two facts from the codebase shape this slice** (see research.md):

- **Three of the four signals are already on `ProofView`; the fourth is not.** The inbox's existing read
  (`getProofs` → `ProofView`) already carries **recency** (`capturedAt`), **completeness** (`quote` /
  `transcript` / `thumbnail` presence), and **effective consent** (`consentState`, via the shared
  `effectiveConsentState`). It does **not** carry **clip status** — the **un-tapped** signal's input
  (the same "missing-field" shape as B4's headline gap). So un-tapped needs an **additive** read,
  surfaced **without** changing the `getProofs`/`ProofView` shape (FR-009, FR-011).
- **The inbox already sorts in-memory in a client island.** `inbox-client.tsx` owns the `sort` state
  (today `SortKey = "newest"` only) and derives the visible, filtered, sorted list in a `useMemo`.
  Warmth plugs into **that** derivation — B3 extends `SortKey` to `"newest" | "warmest"` and adds the
  warmth branch. The toolbar already **renders** "Warmest" (disabled); B3 enables it. These two inbox
  components are the slice's surface — modifying them is in-scope; `ProofCard` and the read shapes are
  not touched.

**Consent (P-VII) stays sovereign and reused — no new gate.** Warmth reads the **effective consent
state already on `ProofView`** (computed by the shared `effectiveConsentState` in `getProofs`) and uses
it as warmth's **gate**: a **non-granted** proof (withdrawn **or** awaiting — neither can become content,
matching the generation gate) ranks **cold** (below all granted proof) but **stays visible**.
`getProofs` stays **unfiltered** — the inbox still shows every state; warmth orders, it never filters
(the visible count under Warmest equals Newest for the same filters). No new consent read, no new gate.

**No schema change.** Warmth is **computed at read/render time** over current owned facts — **no stored
warmth column** (it would go stale against recency/clip-status/consent). The only new read is the
additive clip-status lookup (existing `derived_asset` rows; no new table/column/enum/migration).

**No new dependency, no new route.** Warmth is plain comparison/ordering over owned fields; it is the
**existing inbox re-ordered** (like B1's selection is the inbox in a mode) — `/app/proof`, the rail
untouched.

**Byte-stable.** The `getProofs` read **shape** (`ProofView`), `ProofCard`, the proof / clip / showcase
read shapes, `generateClip`, `generateBatch`, the nav rail, and the **default Newest order** are all
unchanged. Everything B3 adds — `src/lib/warmth.ts`, the additive `getProofClipStatus` read, the
`getInboxClipStatus` action, the toolbar's enabled toggle + copy, and the inbox-client warmth branch —
is **additive and opt-in**.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: **NONE NEW**. Warmth is arithmetic/ordering over owned fields; the clip-status
read uses the existing Drizzle/Neon stack.

**Storage**: Neon Postgres + Drizzle (reads only). One additive read (`derived_asset` existence per
proof). **No write, no migration, no stored warmth.**

**Testing**: manual quickstart validation on fixtures (project convention; no automated suite). Build
green via `npm run build` / `npm run lint`. The pure warmth function is verifiable by construction.

**Target Platform**: Vercel (Next.js App Router).

**Project Type**: Web application (single Next.js app, `src/`).

**Performance Goals**: the default Newest path does **no** extra work (byte-stable); on opt-in to
Warmest, one additive read (a small `distinct proofId` lookup) + an in-memory sort. The result is cached
in client state so a second toggle re-sorts without re-reading.

**Constraints**: owned facts only (FR-019 — no fabricated metric); warmth is read-time, never stored;
consent reused as a gate (P-VII), inbox stays unfiltered; existing read shapes + `ProofCard` byte-stable.

**Scale/Scope**: workspace-scoped; a fixtures inbox of ~12 proofs (dozens at most). One new pure lib,
one additive read, one server action, two in-scope inbox-component edits (toolbar + client).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Customer is the headline (P-II)**: PASS — warmth re-orders the Wall but does **not** touch
      `ProofCard`; the customer's quote/face stays the largest element. Warmth chrome (the sort toggle +
      its one-line copy) stays quiet; **no per-proof badge** (Q2:A).
- [x] **Locked stack (P-III)**: PASS — Next.js 15 / React 19 / TS strict, Drizzle/Neon (one read). **No
      new dependency.** No heavy compute.
- [x] **Pressroom tokens (P-IV)**: PASS — the toggle reuses the **exact** existing sort-control tokens
      (the `Sort ·` `<select>` already in the toolbar); the explanatory copy is on-token `text-ink-3`.
      No persimmon added (it stays on the primary action + verified mark).
- [x] **Port, don't redesign (P-V)**: PASS — ported from `/design-reference` B3, which is the **inbox
      (screen 02) with "Warmest" active** — the Wall re-ordered, **no** prominent per-card score. B3
      makes the already-rendered control real; the one-line honesty copy is a minimal additive (P-XII),
      not a redesign.
- [x] **Fixtures-first (P-VI)**: PASS — computed/demonstrated on the existing fixtures (which already
      carry varied completeness, a born-then-withdrawn clip, and a withdrawn proof). No schema change.
- [x] **Consent enforcement (P-VII)**: PASS — reuses the **effective consent state already on
      `ProofView`** (shared `effectiveConsentState`) as warmth's cold-gate; `getProofs` stays
      unfiltered; withdrawn ranks cold but stays visible. **No new gate**; generation/withdrawal gates
      + cascade untouched.
- [x] **No editor (P-VIII)**: PASS — N/A; warmth adds no studio/timeline/scrubber. It is a sort.
- [x] **SDD scope (P-IX, P-XI)**: PASS — one vertical slice (the inbox re-ordered by a real warmth
      signal). No clip/showcase/campaign scoring, no recommendations, no stored ranking. No "while I'm
      here".
- [x] **Ambiguity handling (P-XII)**: PASS — the signal gap (un-tapped not on `ProofView`) and the
      presentation/interaction forks were raised in the spec (Q1–Q3) and resolved before planning; the
      warmth function is specified explicitly here.

**Definition of done (P-Governance)** — render on fixtures; handle empty (sort control inert by
emptiness; no error), loading (the brief opt-in clip-status fetch falls back to Newest order, never a
fake warmth), and error (a failed clip-status read → honest fallback to recency, no crash) states;
responsive at `480 / 1024 / 1280`; Pressroom tokens exact; keyboard-accessible (the sort control);
pass acceptance criteria; build green.

## Project Structure

### Documentation (this feature)

```text
specs/T4-B3-warmth-sort/
├── plan.md              # This file
├── research.md          # Phase 0 — the warmth function, recency-field reconciliation, opt-in-lazy, no-dep/no-schema
├── data-model.md        # Phase 1 — no schema change; the computed warmth signal + the additive clip-status read
├── quickstart.md        # Phase 1 — manual validation (toggle re-orders, withdrawn cold-but-visible, count stable, byte-stability)
├── contracts/
│   ├── warmth-function.md      # the transparent ordering contract (signals → composite → comparator)
│   └── clip-status-read.md     # the additive read + the opt-in-lazy server action + the inbox wiring
└── tasks.md             # Phase 2 (/speckit.tasks — NOT created here)
```

### Source Code (repository root) — additions are ADDITIVE; the two inbox edits are the slice's surface

```text
src/
├── lib/
│   ├── warmth.ts                          # NEW — pure, client-safe warmth contract: readiness points + the lexicographic comparator (type-only ProofView import)
│   └── proof.ts                           # UNCHANGED (ProofView byte-stable)
├── db/
│   └── queries.ts                         # ADD getProofClipStatus() (proofIds with ≥1 clip); existing reads byte-unchanged
├── app/app/proof/
│   ├── actions.ts                         # UNCHANGED (generateBatch byte-stable)
│   └── warmth-actions.ts                  # NEW — getInboxClipStatus() server action (opt-in-lazy; resolves workspace, calls getProofClipStatus)
└── components/app/proof-inbox/
    ├── inbox-data.tsx                      # UNCHANGED (still one getProofs read; no eager clip-status)
    ├── inbox-toolbar.tsx                   # EDIT (in-scope) — enable the Warmest option + honest copy; SortKey gains "warmest"
    ├── inbox-client.tsx                    # EDIT (in-scope) — sort state gains "warmest"; opt-in-lazy clip-status fetch; warmth branch in the visible useMemo
    └── inbox-wall.tsx                      # UNCHANGED (renders the already-byte-stable ProofCard; warmth only changes order)
```

**Structure Decision**: Single Next.js app under `src/`. Warmth is the **existing inbox re-ordered** —
no new route, no nav entry. The pure warmth function lives in `src/lib/warmth.ts` (testable, client-safe,
type-only schema import — the `clip.ts`/`studio.ts`/`export.ts` idiom); the un-tapped input arrives via
an additive read behind an opt-in-lazy server action so the default path is byte-stable.

## The warmth function (the honesty core — full spec in contracts/warmth-function.md)

Per proof, from **owned facts only**:
- **Consent gate** — `granted = (consentState === "granted")`. Non-granted (withdrawn **or** awaiting) →
  **cold** (ranked below all granted), ordered among themselves by recency. (Matches the generation
  gate: only granted can become content.)
- **Completeness** — `+2` if it has the customer's words (`quote || transcript`), `+1` if it has media
  (`thumbnail` present). Words count for more than a thumbnail (richer content).
- **Un-tapped** — `+2` if **no clip** has been made from it yet (`!tappedIds.has(id)`); already-harvested
  → `+0`.
- **Recency** — newer `capturedAt` is warmer; used as the **tie-breaker within equal readiness** (and
  the sole order among the cold group).

**Ordering** = lexicographic, descending: **(granted, readinessPoints = completeness + un-tapped,
capturedAt, then id asc for a fully deterministic final tiebreak)**. No continuous "score" is shown
(Q2:A) — warmth is purely the resulting order, explicable as "granted, has a full quote, not yet
clipped, recent." Weights/points are documented + tunable, but the **dominant ordering** (gate →
readiness → recency) is the contract.

Recency uses **`capturedAt`** — the timestamp already on `ProofView` and already used by "Newest" — so
warmth's recency is consistent with the existing sort and needs no shape change (research §2 reconciles
this with the spec's loose "proof.createdAt").

## The opt-in-lazy mechanism (byte-stable default — full spec in contracts/clip-status-read.md)

- **Default (Newest):** `inbox-client` initial `sort = "newest"`; the `visible` useMemo's newest branch
  is **byte-identical** to today. `tappedIds` client state starts **null**; the clip-status action is
  **not** called. The server `inbox-data`/`getProofs` path is unchanged — **the extra read never fires.**
- **Opt-in (toggle to Warmest):** on the first switch to `"warmest"`, the client calls the
  `getInboxClipStatus()` server action once, caches the returned `tappedIds` set, and the useMemo's
  warmth branch sorts via `warmth.ts`. While the fetch is in flight, the order falls back to Newest
  (no fabricated warmth); on resolve it re-sorts. A failed read → honest fallback to recency (no crash).
- The action resolves the workspace **server-side** (`getCurrentWorkspace`) and calls the additive
  `getProofClipStatus(workspaceId)` (the proofIds with ≥1 `derived_asset`, workspace-scoped, **not**
  consent-filtered — "tapped" is a provenance fact; withdrawn proof is gated cold by consent anyway).

## Complexity Tracking

*No Constitution violations. No new dependency, no schema change, no new route, no stored warmth. Table omitted.*
