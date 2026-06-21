# Implementation Plan: T5-Consent — Consent surface (the live control for the consent backbone)

**Branch**: `main` (a `T5-consent` branch is created at `/speckit.implement`, not for planning) | **Date**: 2026-06-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/T5-consent/spec.md` with clarifications folded: **Q1→A**
cascade-preview confirm · **Q2→A** light-include made-under-consent provenance · **Q3→A** full retained
version timeline.

**Guardrail**: PLAN only. Do **not** run `/speckit.tasks` or implement. Do **not** run git. **No decision
needs ratification** — no new dependency, no schema change, no new gate, no new route beyond the
already-railed `/app/consent`. When implemented, every change is left **uncommitted** for Cornel to
review and commit (mirrors prior slices).

## Summary

The consent model has **gated every surface all session** (`effectiveConsentState`) but never had a
surface of its own. T5-Consent makes the backbone **visible and operable** — and is, almost entirely, a
**read + one write over the model that already exists**. It ships:

1. **The ported ledger** (`/app/consent`, replacing the T1 placeholder) — design-reference **screen 13**
   ported faithfully: a table of every workspace proof (Customer · consent purpose + current version ·
   captured date · **current effective state**) with **status filter chips** (All / Granted / Awaiting /
   Withdrawn).
2. **Derived per-proof detail** (raised per P-XII — screen 13 has the ledger only): a **full retained
   version timeline** (*v1 granted @t → v2 withdrawn @t*, superseded versions shown, never erased) and
   the **made-under-consent provenance** (which consent version each of the proof's clips was generated
   under).
3. **The record-withdrawal action** — the centerpiece: for a currently-**granted** proof, record that
   the customer has withdrawn, behind an **honest cascade-preview confirm** ("will withhold {customer}'s
   proof and {N} clips from Library, showcase, export — retained, not deleted").

**The one design idea worth review — the SHARED read (Q1 ∩ Q2).** The cascade-preview's **N** = the
clips a withdrawal will withhold = **exactly the proof's clips** = the **made-under-consent provenance
list** (Q2). They are **one read**, not two: `getProofConsentClips(workspaceId, proofId)` returns the
proof's clips each with its made-under version; the **preview shows the count**, the **provenance UI
shows the list**. (Because the cascade is proof-level — withdrawing a proof's consent withholds *all*
its clips via the read-time gate — N is simply that list's length.)

**The free cascade — why this is mostly read + one write.** Every consuming surface already reads
effective consent at read time, so the recorded withdrawal **ripples through all of them with zero edits**:
the inbox shows withdrawn, the Library/showcase/clip-detail withhold the clips, the dashboard count
adjusts, export skips them, warmth ranks the proof cold. This slice **writes** the withdrawal and
**reads** the ledger/history/provenance — it does **not** touch a single consuming surface.

**Honest semantics (the heart).** The action **records the customer's withdrawal** (the brand keeping an
honest ledger of the customer's wishes) — never a brand-side "revoke." It writes a **new withdrawn
version through the existing model** (a new row, never a delete; prior versions retained), reusing the
shared `effectiveConsentState` — **no new gate, no new mechanism**. There is **no re-grant / un-withdraw
control** anywhere; re-consent is the customer's act via a real capture/request flow (T7), and the demo
resets via re-seed. (Data note: the stored enum state is `revoked`; the UI copy frames it as
**"withdrawn"** with a **"Record withdrawal"** label — a copy choice, no schema change.)

**No schema change.** The `consent` table (`proofId`, `state`, `grantedAt`, `revokedAt`, `version`,
`captureContext`, `createdAt`; unique `(proofId, version)`) and `derived_asset.consentId` provenance
already exist. The withdrawal writes an **existing-shape row** (a new `revoked` version); all reads are
additive. **No new dependency, no new gate.**

**Byte-stable.** `effectiveConsentState` / `latestConsentState` / `latestConsentVersion` /
`latestConsentEffectiveAt` / `getGrantedConsentId` are **reused unchanged**; **every consuming surface**
— inbox / `ProofCard`, Library, dashboard, export, warmth, showcase, clip detail, proof detail,
`generateClip`, `generateBatch` — and the **nav rail** (the `/app/consent` destination already exists)
stay **byte-unchanged**. The slice adds **only**: the `/app/consent` route + its components, the additive
ledger/history/provenance reads, the new-version write, and the record-withdrawal action.

## Technical Context

**Language/Version**: TypeScript (strict), React 19, Next.js 15.5 (App Router, `--turbopack`).

**Primary Dependencies**: **NONE NEW**. Reads + one write over the existing Drizzle/Neon `consent` model.

**Storage**: Neon Postgres + Drizzle. Reads (ledger / history / provenance) + **one additive write** (a
new `consent` row, existing shape). **No migration, no schema change.**

**Testing**: manual quickstart validation on fixtures (project convention; no automated suite). Build
green via `npm run build` / `npm run lint`.

**Target Platform**: Vercel (Next.js App Router).

**Project Type**: Web application (single Next.js app, `src/`).

**Performance Goals**: the ledger is one workspace-scoped read; the per-proof detail (history +
provenance) is fetched on row-open (small, opt-in), mirroring the lazy patterns used elsewhere. The
withdrawal is a single insert + one revalidate cluster.

**Constraints**: only real owned consent data (FR-019); honest record-withdrawal semantics (no
brand-revoke, no re-grant — FR-006/007); reuse the shared gate (no new gate — FR-008); the consuming
surfaces + nav rail byte-stable.

**Scale/Scope**: workspace-scoped; ~12 fixture proofs. One new lib (view shapes), three additive reads,
one additive write, one server action (+ a detail-fetch action), the route page + ~5 components.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Customer is the headline (P-II)**: PASS — the ledger leads with the **customer** and their
      consent state; the surface exists to honor the customer's wishes. Chrome stays quiet.
- [x] **Locked stack (P-III)**: PASS — Next.js 15 / React 19 / TS strict, Drizzle/Neon. **No new
      dependency.** One write over the existing model.
- [x] **Pressroom tokens (P-IV)**: PASS — the ported ledger table + the derived detail/dialog reuse the
      exact tokens (the proof-detail/clip-detail consent framing precedent — status dots, `bg-card`,
      `shadow-modal` for the confirm). Persimmon stays on the one primary action (the confirm) only.
- [x] **Port, don't redesign (P-V)**: PASS — the **ledger is a faithful port of screen 13**; the
      **history timeline, provenance, and withdrawal action + cascade preview** are **derived** (screen
      13 has the ledger only) and **raised per P-XII**, built from on-token precedent, not redesigned.
- [x] **Fixtures-first (P-VI)**: PASS — built on the existing fixtures (the seeded Leo M.
      *granted v1 → revoked v2* retained timeline + made-under clip versions). No schema change.
- [x] **Consent enforcement (P-VII)**: PASS — this slice **IS** P-VII made visible/operable: visible,
      versioned, revocable, **retained**; revocation **cascades** through the existing read-time checks;
      honest record-the-withdrawal semantics, no brand re-grant. **No new gate/mechanism.**
- [x] **No editor (P-VIII)**: PASS — N/A; the version "timeline" is a read-only audit history, not an
      editor.
- [x] **SDD scope (P-IX, P-XI)**: PASS — one slice: the consent surface + record-withdrawal. No
      re-grant, no consent capture (T7), no licensing/rights beyond the owned consent record, no
      consuming-surface rework (the cascade is free).
- [x] **Ambiguity handling (P-XII)**: PASS — the port/derived split is documented; the three forks (Q1
      confirm, Q2 provenance, Q3 history depth) were raised in the spec and resolved before planning.

**Definition of done (P-Governance)** — render on fixtures; handle empty (no proofs → honest empty
ledger), loading (skeleton), and error (failed detail/withdrawal → honest message, no crash) states;
responsive at `480 / 1024 / 1280`; Pressroom tokens exact; keyboard-accessible (filters, row-open, the
confirm dialog); pass acceptance criteria; build green.

## Project Structure

### Documentation (this feature)

```text
specs/T5-consent/
├── plan.md              # This file
├── research.md          # Phase 0 — the SHARED read, the withdrawal write, port/derived split, purpose-label source, no-dep/no-schema
├── data-model.md        # Phase 1 — no schema change; the ledger/history/provenance read shapes + the new-version write
├── quickstart.md        # Phase 1 — manual validation (ledger, retained timeline, cascade preview, free cascade, byte-stability)
├── contracts/
│   ├── consent-reads.md       # getConsentLedger / getConsentHistory / getProofConsentClips (the shared read)
│   └── withdrawal-action.md   # recordWithdrawal + getProofConsentDetail actions + the consent-version write
└── tasks.md             # Phase 2 (/speckit.tasks — NOT created here)
```

### Source Code (repository root) — additions are ADDITIVE; the consent page replaces its placeholder

```text
src/
├── lib/
│   └── consent.ts                         # NEW — client-safe view shapes (ConsentLedgerEntry, ConsentVersionEntry, ProofConsentClip, ProofConsentDetail); type-only enum import
├── db/
│   └── queries.ts                         # ADD getConsentLedger / getConsentHistory / getProofConsentClips + recordConsentWithdrawal (write); reuse latestConsentState/Version/EffectiveAt + getGrantedConsentId; existing reads byte-unchanged
├── app/app/consent/
│   ├── page.tsx                           # REPLACE the T5 SectionPlaceholder → Suspense + ConsentData (the spine pattern)
│   ├── actions.ts                         # NEW — recordWithdrawal() + getProofConsentDetail() server actions
│   ├── loading.tsx                        # NEW — skeleton (optional; or inline Suspense fallback)
│   └── error.tsx                          # NEW — shared <ErrorState> boundary (the established per-route pattern)
└── components/app/consent/
    ├── consent-data.tsx                   # NEW (async Server) — getConsentLedger; empty → ConsentEmpty; else ConsentLedger
    ├── consent-ledger.tsx                 # NEW (client) — ported screen-13 table + status filter chips + row-open state
    ├── consent-detail-panel.tsx           # NEW (client) — per-proof drawer: history timeline + made-under provenance + Record-withdrawal entry (lazy getProofConsentDetail)
    ├── consent-withdraw-dialog.tsx        # NEW (client) — the cascade-preview confirm → recordWithdrawal
    ├── consent-empty.tsx                  # NEW — honest empty ledger
    └── consent-skeleton.tsx               # NEW — loading skeleton
```

**Structure Decision**: Single Next.js app under `src/`. `/app/consent` (already a rail destination)
replaces its placeholder. The ledger is the ported screen-13 surface; the history/provenance/withdrawal
live **within** `/app/consent` as a derived detail panel + confirm dialog (**no new route**). The
per-proof detail (history + the shared provenance read) is fetched **on row-open** via one server action,
so the ledger render stays light.

## The record-withdrawal write & action (honest semantics — full spec in contracts/withdrawal-action.md)

- **Write** `recordConsentWithdrawal(workspaceId, proofId)` (new in `queries.ts`): re-check the proof is
  **currently granted** (reuse `getGrantedConsentId` — the shared gate); if not granted → **no-op,
  honestly reported** (already withdrawn / awaiting — no second version). Else compute `version = max(
  version)+1` for the proof and insert a **new `consent` row** `{ proofId, state: 'revoked', revokedAt:
  now, version }` — an **existing-shape** row (the unique `(proofId, version)` index guards a double
  write). **Single-attempt insert** (the `insertDerivedAsset` D4 precedent — not retry-wrapped). Prior
  versions **retained**.
- **Action** `recordWithdrawal(proofId)` (`src/app/app/consent/actions.ts`, `"use server"`): resolve
  workspace server-side (never trust the client); call the write; on success `revalidatePath` the
  **cascade cluster** — `/app/consent`, `/app`, `/app/library`, `/app/showcase`, `/app/proof`,
  `/app/proof/[proofId]` — so the **free cascade** shows everywhere at once. Returns an honest
  `{ status: 'recorded' | 'not_granted' | 'error', version? }`.
- **No re-grant action exists** anywhere (FR-007). Copy is "Record withdrawal" / "the customer
  withdrew," never "revoke" (FR-006).

## The cascade-preview confirm (Q1) — fed by the shared read

When the owner opens "Record withdrawal" on a **granted** proof, the confirm dialog shows the **honest
preview** using the **already-loaded provenance clips**: "Recording {customer}'s withdrawal will withhold
their proof and **{clips.length}** clip(s) from Library, showcase, and export — **retained, not
deleted**." Only on confirm does `recordWithdrawal` run. The preview **N is the shared
`getProofConsentClips` count** (no separate count query).

## Complexity Tracking

*No Constitution violations. No new dependency, no schema change, no new gate, no new route. Table omitted.*
