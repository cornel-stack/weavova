# Phase 0 — Research & Decisions: T5-Consent

Grounded in the codebase. No decision requires ratification (no new dep, no schema change, no new gate,
no new route). The two items to review are §1 (the shared cascade/provenance read) and §2 (the
byte-stable free cascade + the withdrawal write).

---

## §1 — The SHARED read: cascade-preview N = made-under provenance (Q1 ∩ Q2 are one read)

**Question**: the cascade-preview needs the count of clips a withdrawal will withhold; the provenance
(Q2) lists each clip's made-under consent version. Are these one read or two?

**Decision**: **ONE read** — `getProofConsentClips(workspaceId, proofId)` returns the proof's clips,
each with its **made-under consent version** (`derived_asset ⨝ consent` on `derived_asset.consentId`).
The **cascade-preview N = `clips.length`**; the **provenance UI = the list**. No separate count query.

**Why N = the proof's full clip list**: the cascade is **proof-level** — withdrawing a proof's consent
flips its effective state, and **every** consuming read gates on `effectiveConsentGranted(proofId)`, so
**all** of that proof's clips are withheld at once (regardless of which version each was made under).
The proof is currently granted (eligibility), so all its clips are currently visible → all `N` become
withheld. Hence the withhold count is exactly the proof's clip list, which is exactly the provenance
list.

**Rationale**: satisfies Q1 and Q2 with a single owned-data read; the preview is honest (the real count)
and the provenance is real (each clip's `derived_asset.consentId → consent.version`). Not
consent-filtered — we are counting/Listing the proof's own clips that the withdrawal will affect.

**Alternatives considered & rejected**:
- A separate `count(*)` for the preview + a separate provenance read — rejected: two reads for one fact;
  the list's length *is* the count.
- Counting only currently-visible clips via the consent gate — rejected as redundant: the proof is
  granted at eligibility, so its clips are all visible; the simple per-proof clip list is correct and
  clearer.

---

## §2 — The withdrawal write + the free cascade (byte-stable)

**Decision (write)**: `recordConsentWithdrawal(workspaceId, proofId)` writes a **new `consent` row** of
the **existing shape** — `{ proofId, state: 'revoked', revokedAt: now, version: max(version)+1 }` —
through the established "new version, never a delete" model. It **re-checks current grant first** (reuse
`getGrantedConsentId`, the shared gate): a non-granted proof → **no-op, honestly reported** (no second
version). **Single-attempt insert** (the `insertDerivedAsset` D4 precedent — not `withDbRetry`-wrapped;
the unique `(proofId, version)` index guards a same-version double write). Prior versions **retained**.

**Decision (free cascade)**: nothing in any consuming surface changes. Each already gates on the shared
`effectiveConsentState` / `effectiveConsentGranted` at read time, so after the write + one
`revalidatePath` cluster (`/app/consent`, `/app`, `/app/library`, `/app/showcase`, `/app/proof`,
`/app/proof/[proofId]`), the withdrawal shows everywhere: inbox withdrawn, Library/showcase/clip-detail
withhold, dashboard count adjusts, export skips, warmth ranks cold.

**Byte-stable (reused unchanged)**: `effectiveConsentState`, `latestConsentState`,
`latestConsentVersion`, `latestConsentEffectiveAt`, `getGrantedConsentId`, and every consuming
surface/read + the nav rail. The slice only **adds** functions to `queries.ts` and new
route/components.

**Rationale**: the whole point of P-VII's read-time model — a recorded withdrawal is one honest write;
the cascade is emergent, not coded per-surface.

**Alternatives considered & rejected**:
- Mutating the existing granted row to `revoked` — rejected: destroys the audit trail (violates "pull,
  don't destroy" / retained versions).
- A new "withdrawal" table/flag — rejected: a new mechanism; the existing version model already
  expresses this.
- Per-surface cascade updates — rejected: unnecessary (read-time gate) and would break byte-stability.

---

## §3 — Reads: ledger + history reuse the existing effective-consent helpers

**Decision**:
- `getConsentLedger(workspaceId)` — one row per proof: customer, consent **purpose label** + **current
  version** (`latestConsentVersion`), captured/effective date (`latestConsentEffectiveAt`), and
  **current effective state** (`latestConsentState` = the shared `effectiveConsentState(proof.id)`).
  **Reuses the existing module-level helpers** already used by `getProof` — byte-stable, no new gate.
  Lists **all** proofs (the ledger shows every state; the status chips filter client-side).
- `getConsentHistory(workspaceId, proofId)` — **all** consent rows for the proof, ordered by `version`
  asc (the retained timeline, Q3:A full), each with `version`, `state`, and effective date (coalesce
  `revoked_at` / `granted_at` / `created_at`). Workspace-scoped via a `proof` join.

**Rationale**: the ledger's "current effective state/version/date" is exactly what `getProof` already
computes — reuse those helpers rather than re-derive. History is a plain ordered select of the retained
rows (the audit trail is just "don't filter out old versions").

---

## §4 — The consent "purpose" label (screen 13 shows "Marketing use")

**Finding**: screen 13 shows "Marketing use · v{n}". The seed stores a constant `captureContext`
(`CAPTURE_CONTEXT`) and a `consentCopyVersion` ("2026-05"); there is **no per-row free-text "purpose"
column**.

**Decision**: render the purpose as an **owned label** — derived from the consent record's
`captureContext` (the owned capture metadata) or a single on-token constant matching the seed ("Marketing
use"). **No schema change, no fabricated per-row value** — it is a real owned/constant label, honest
about what it is.

**Rationale**: faithful to screen 13 without inventing a data field; stays within owned data (FR-019).

---

## §5 — Port vs derived (P-V / P-XII)

**Decision**: the **ledger table is a faithful port** of screen 13 (Customer · purpose+version ·
captured · status + filter chips). The **history timeline, made-under provenance, and the
record-withdrawal action + cascade-preview confirm** are **not** depicted in screen 13 → built as
**documented derived surfaces** using on-token precedent (the proof-detail/clip-detail consent framing:
status dots, version/date lines, `shadow-modal` dialog). Raised here, not invented as a redesign.

---

## §6 — No dependency · no schema · no new gate · no new route (confirmations)

- **No new dependency**: reads + one insert over the existing Drizzle/Neon model.
- **No schema change**: the withdrawal writes an existing-shape `consent` row (a new `revoked` version);
  all reads are additive; `derived_asset.consentId` provenance already exists. No migration.
- **No new gate / mechanism**: reuses `effectiveConsentState` / `getGrantedConsentId`; the cascade is
  the existing read-time model.
- **No new route**: `/app/consent` already exists in the rail; the detail/dialog live within it.

---

## Resolved unknowns

| Unknown | Resolution |
|---|---|
| Preview count vs provenance | ONE read — `getProofConsentClips`; N = list length (§1). |
| Withdrawal write shape | New `consent` row, existing shape, `state:'revoked'`, `version+1`, re-check grant first (§2). |
| Does any consuming surface change? | No — free cascade via existing read-time gate + one revalidate (§2). |
| Ledger/history mechanism | Reuse `latestConsentState/Version/EffectiveAt`; history = ordered retained rows (§3). |
| "Purpose" label source | Owned label from `captureContext` / a seed-matching constant; no new field (§4). |
| Port vs derived | Ledger ported; history/provenance/action derived + documented (§5). |
| New dep / schema / gate / route? | None / none / none / none (§6). |
