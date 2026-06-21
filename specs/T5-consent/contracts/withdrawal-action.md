# Contract — The record-withdrawal write, the detail fetch & the actions

Honest semantics are binding: this **records the customer's withdrawal**, never a brand "revoke"; there
is **no re-grant**; prior versions are **retained**; it reuses the **shared gate** (no new mechanism).

## Write (`src/db/queries.ts`, additive)

### `recordConsentWithdrawal(workspaceId, proofId): Promise<{ status: 'recorded' | 'not_granted'; version?: number }>`

1. **Re-check current grant** — reuse `getGrantedConsentId(workspaceId, proofId)` (the shared
   effective-consent gate). If it returns null (already withdrawn / awaiting) → `{ status:
   'not_granted' }` — an **honest no-op**, no second version (handles the stale/duplicate race).
2. Else compute `version = (max consent.version for proofId) + 1` and insert a **new, existing-shape**
   `consent` row: `{ proofId, state: 'revoked', revokedAt: now, version }`. `grantedAt` stays null.
3. **Single-attempt** insert (the `insertDerivedAsset` D4 precedent — not `withDbRetry`-wrapped; the
   unique `(proofId, version)` index guards a same-version double write). Prior versions are **retained**
   (no update, no delete).
4. Return `{ status: 'recorded', version }`.

**No re-grant / un-withdraw write exists** (FR-007).

## Actions (`src/app/app/consent/actions.ts`, NEW — `"use server"`)

### `getProofConsentDetail(proofId): Promise<ProofConsentDetail>`

- Resolve workspace server-side (`getCurrentWorkspace`; never trust the client).
- Return `{ history: getConsentHistory(ws.id, proofId), clips: getProofConsentClips(ws.id, proofId) }`
  — the per-proof detail bundle (one round-trip on row-open: timeline + provenance + the preview's N).
- A read: no `revalidatePath`.

### `recordWithdrawal(proofId): Promise<{ status: 'recorded' | 'not_granted' | 'error'; version?: number }>`

- Resolve workspace server-side. Call `recordConsentWithdrawal(ws.id, proofId)`.
- On `recorded`: **`revalidatePath` the cascade cluster** — `/app/consent`, `/app`, `/app/library`,
  `/app/showcase`, `/app/proof`, `/app/proof/${proofId}` — so the **free cascade** surfaces everywhere
  at once. Return the status + version.
- On `not_granted`: return it (the UI reports honestly; the action was a no-op).
- Wrap in try/catch → `{ status: 'error' }` on a genuine failure (honest, no fabricated success).

## UI wiring (within `/app/consent` — no new route)

- **`consent-ledger.tsx`** (client) — ported screen-13 table + status filter chips (client-side filter
  over the `getConsentLedger` rows) + row-open state. Opening a row reveals the detail panel.
- **`consent-detail-panel.tsx`** (client) — on open, calls `getProofConsentDetail(proofId)` (lazy);
  renders the **full retained timeline** (history) + the **made-under provenance** (clips, each "made
  under v{n}"). For a **granted** proof only, shows a **"Record withdrawal"** entry (FR-003 eligibility);
  for withdrawn/awaiting, no action (and never a re-grant).
- **`consent-withdraw-dialog.tsx`** (client) — the **cascade-preview confirm** (`shadow-modal`): using
  the already-loaded `clips`, shows "Recording {customer}'s withdrawal will withhold their proof and
  **{clips.length}** clip(s) from Library, showcase, and export — **retained, not deleted**." On confirm
  → `recordWithdrawal(proofId)`; show the honest result (recorded / already withdrawn / error). The
  persimmon primary is the confirm; "Cancel" is the quiet secondary.

## Honesty checklist (binding)

- Copy: "Record withdrawal" / "the customer withdrew" — never "revoke on their behalf" (FR-006).
- No re-grant / un-withdraw control anywhere (FR-007).
- Retained: the write only appends a version; history shows all (FR-002).
- Reuse the shared gate; no new gate/mechanism (FR-008). The cascade is the existing read-time model.
- Owned data only; the preview count is the real `clips.length` (FR-019, FR-004).

## Byte-stability checklist (contract-level)

- `effectiveConsentState` / `effectiveConsentGranted` / `latestConsentState` / `latestConsentVersion` /
  `latestConsentEffectiveAt` / `getGrantedConsentId` — reused **unchanged**.
- Every consuming surface — inbox/`ProofCard`, Library, dashboard, export, warmth, showcase, clip
  detail, proof detail, `generateClip`, `generateBatch` — **untouched** (free cascade).
- nav rail (`src/lib/nav.ts`) — unchanged (`/app/consent` already present). No new route, no schema, no
  new dependency.
