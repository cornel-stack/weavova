# Contract — Consent reads (`src/db/queries.ts`, additive)

All `withDbRetry`-wrapped, workspace-scoped, owned data only (FR-019). Reuse the existing shared consent
helpers — **no new gate**. `getProofs`/`getProof`/`getLibraryClips`/`getShowcase`/`getClip` and the
shared helpers stay **byte-unchanged**.

## `getConsentLedger(workspaceId): Promise<ConsentLedgerEntry[]>`

- One row per proof in the workspace. Select: `proof.id`, `proof.customerName`, the **current effective**
  `state` (`latestConsentState` = shared `effectiveConsentState(proof.id)`), `currentVersion`
  (`latestConsentVersion`), `effectiveAt` (`latestConsentEffectiveAt`), and the `purpose` owned label
  (from `captureContext` or a seed-matching constant — research §4).
- Lists **all** proofs/states (the inbox-style "show everything"); the status chips filter **client-side**
  in the ledger component. Order: effective date desc (screen-13 feel).
- Reuses the **module-level** `latestConsentState/Version/EffectiveAt` already defined for `getProof`
  (byte-stable — no new helper).

## `getConsentHistory(workspaceId, proofId): Promise<ConsentVersionEntry[]>`

- **All retained** consent rows for the proof (workspace-scoped via a `proof` join), ordered `version
  asc` — the full audit timeline (Q3:A). Each: `version`, `state`, `effectiveAt`
  (`coalesce(revoked_at, granted_at, created_at)`).
- Never filters out superseded/withdrawn versions ("pull, don't destroy" — FR-002).

## `getProofConsentClips(workspaceId, proofId): Promise<ProofConsentClip[]>` — THE SHARED READ

- The proof's clips with their **made-under** consent version: `derived_asset ⨝ consent` on
  `derived_asset.consentId`, `derived_asset.proofId = proofId`, workspace-scoped. Each: `clipId`,
  `format`, `madeUnderVersion` (`consent.version`), `createdAt`.
- **Powers both** (research §1): the **cascade-preview N = result.length** and the **made-under
  provenance list** (Q2/US3). Not consent-filtered — it counts/lists the proof's own clips the
  withdrawal will affect.

## Notes

- `ConsentLedgerEntry` / `ConsentVersionEntry` / `ProofConsentClip` are defined in `src/lib/consent.ts`
  (client-safe, type-only enum imports).
- `getConsentHistory` + `getProofConsentClips` are bundled by the `getProofConsentDetail` action
  (contracts/withdrawal-action.md) so the per-proof detail loads on row-open with one round-trip.
