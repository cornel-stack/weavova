# Contract — Typed query layer

Module: `src/db/queries.ts`. **Drizzle only** (no raw SQL outside migrations). Server-side. Returns
the `ProofView` the ProofCard consumes — proof row + resolved `source.label` + effective
`consentState` + ISO `capturedAt`.

## Types (from `src/lib/proof.ts`, derived from the schema)

```text
ProofType    = "text" | "video" | "photo" | "audio"     // from proof_type enum
ConsentState = "granted" | "awaiting" | "revoked"        // from consent_state enum

ProofView (= ProofCardProps) = {
  id: string
  customerName: string
  proofType: ProofType
  quote: string | null
  transcript: string | null
  source: string            // source.label
  consentState: ConsentState
  thumbnail: string | null
  capturedAt: string        // ISO
  reviewed: boolean
  verified: boolean
}
```

## Functions

| Function | Signature | Returns |
|---|---|---|
| `getProofs` | `getProofs(): Promise<ProofView[]>` | all proofs (newest `capturedAt` first), each as a `ProofView` |
| `getProof` | `getProof(id: string): Promise<ProofView \| null>` | a single proof or null |

## Rules

- `source` is resolved to `source.label` via a join on `proof.sourceId`.
- `consentState` is the **effective** (latest-version) consent state; a proof with no consent row
  resolves to a non-granted state (gate fails closed).
- `capturedAt` is serialized to an ISO string.
- The returned shape MUST equal `ProofCardProps` exactly — the ProofCard renders it with **no
  change** to the component (P-V, P-VI). No `consentState === "granted"` ⇒ no Make (P-VII).
- Access is Drizzle queries only; the client (`src/db/client.ts`) is lazy and server-only.
