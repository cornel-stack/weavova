# Phase 1 — Data Model: T5-Consent

## Schema change: NONE (confirmed)

The withdrawal writes an **existing-shape** `consent` row; all reads are additive; the provenance link
already exists. **No new table, column, enum, or migration.**

Existing `consent` table (unchanged): `id`, `proofId → proof (cascade)`, `state` (`granted` / `awaiting`
/ `revoked`), `grantedAt`, `revokedAt`, `version`, `captureContext` (jsonb), `createdAt`; unique
`(proofId, version)`, index `(proofId, version desc)`. Existing `derived_asset.consentId → consent.id`
is the made-under provenance link. The shared `effectiveConsentState(proofId)` /
`effectiveConsentGranted(proofId)` and `latestConsentState/Version/EffectiveAt` helpers are reused.

## New read shapes (additive — `src/lib/consent.ts`, client-safe, type-only enum import)

```text
ConsentLedgerEntry {            // one row per proof — the ported screen-13 list
  proofId: string
  customerName: string
  purpose: string               // owned label (captureContext / seed-matching constant) — §4
  currentVersion: number | null // latestConsentVersion
  effectiveAt: string | null    // ISO — latestConsentEffectiveAt (captured/changed date)
  state: ConsentState           // current effective state (granted | awaiting | revoked) — labeled "withdrawn" in UI
}

ConsentVersionEntry {           // one retained version — the full timeline (Q3:A)
  version: number
  state: ConsentState
  effectiveAt: string | null    // ISO — coalesce(revokedAt, grantedAt, createdAt)
}

ProofConsentClip {              // the SHARED read row (preview N + provenance, §1)
  clipId: string
  format: ClipFormat
  madeUnderVersion: number      // derived_asset.consentId → consent.version
  createdAt: string             // ISO
}

ProofConsentDetail {            // the per-proof detail bundle (fetched on row-open)
  history: ConsentVersionEntry[]      // full retained timeline, version asc
  clips: ProofConsentClip[]           // made-under provenance; clips.length = cascade-preview N
}
```

All fields are **real owned consent data** (FR-019) — no fabricated value. `ConsentState`/`ClipFormat`
are type-only imports from the schema (the `clip.ts`/`proof.ts`/`warmth.ts` idiom).

## New reads (additive — `src/db/queries.ts`)

- `getConsentLedger(workspaceId): Promise<ConsentLedgerEntry[]>` — all proofs, workspace-scoped, each
  with current effective state/version/date via the **reused** `latestConsentState/Version/EffectiveAt`
  (the `getProof` helpers). Ordered (e.g. effective date desc, matching screen 13). `withDbRetry`.
- `getConsentHistory(workspaceId, proofId): Promise<ConsentVersionEntry[]>` — **all** retained consent
  rows for the proof (workspace-scoped via `proof` join), `version asc`. `withDbRetry`.
- `getProofConsentClips(workspaceId, proofId): Promise<ProofConsentClip[]>` — **the shared read**: the
  proof's clips with their made-under version (`derived_asset ⨝ consent` on `consentId`),
  workspace-scoped. `withDbRetry`. Powers **both** the cascade-preview count and the provenance list.

**Byte-stable**: `getProofs` / `ProofView` / `getProof` / `getLibraryClips` / `getProofClips` /
`getShowcase` / `getClip` and the shared consent helpers are **untouched**; these are new siblings.

## New write (additive — `src/db/queries.ts`)

- `recordConsentWithdrawal(workspaceId, proofId): Promise<{ status: 'recorded' | 'not_granted'; version?: number }>`
  — re-check current grant (reuse `getGrantedConsentId`); if not granted → `{ status: 'not_granted' }`
  (honest no-op). Else insert `{ proofId, state: 'revoked', revokedAt: now, version: max(version)+1 }` —
  an **existing-shape** row. **Single-attempt** insert (D4 precedent; unique `(proofId, version)` guards
  a double write). Returns the new version. Prior versions **retained** (no update/delete).

## State transitions

Consent state per proof advances **append-only**: `… → granted (vN) → withdrawn/revoked (vN+1)`. The
**current effective state** is the latest version (shared `effectiveConsentState`). There is **no**
backward transition in this slice — **no re-grant** (FR-007); re-consent is the customer's act (T7).

## Validation / honesty rules

- **Eligibility**: only a proof whose current effective state is **granted** can have a withdrawal
  recorded; awaiting/already-withdrawn → action not offered + write no-ops (FR-003, edge cases).
- **Retained (P-VII)**: the write never updates/deletes a prior version; history shows all (FR-002).
- **Honest copy (FR-006/007)**: "Record withdrawal" / "the customer withdrew"; no "revoke"; no re-grant
  control.
- **Owned-only (FR-019)**: every shown value is a real owned consent fact; the purpose is an owned
  label, never a fabricated per-row metric.
- **Free cascade (FR-008)**: enforced by the existing read-time gate; no consuming surface is modified.
