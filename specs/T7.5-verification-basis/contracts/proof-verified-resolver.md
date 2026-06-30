# Contract — `proofIsVerified` / `verificationState` (the sole sanctioned verified-state read)

**Module**: `src/lib/verification.ts` (NEW). Pure; type-only DB import (`ConsentState` from
`@/db/schema`) — no Drizzle reaches any bundle (mirrors `src/lib/proof.ts`).

## Signature

```ts
export type VerificationState = "verified" | "consent_only" | "unverified_no_consent";

export interface VerificationInput {
  /** effective (latest-version) consent state — T7.1 read (effectiveConsentState) */
  consentState: ConsentState;            // "granted" | "awaiting" | "revoked"
  /** whether a qualifying (strong|medium + confirmed) basis exists — qualifyingBasisExpr (D3) */
  hasQualifyingBasis: boolean;
}

export function verificationState(input: VerificationInput): VerificationState;
export function proofIsVerified(input: VerificationInput): boolean; // === state === "verified"
```

## Logic (consent AND basis)

```
consentState !== "granted"   → "unverified_no_consent"   // P-VII — consent is necessary
consentState === "granted" && hasQualifyingBasis  → "verified"
consentState === "granted" && !hasQualifyingBasis → "consent_only"
```

- **Consent necessary, never sufficient-by-transaction**: a `strong` basis on a withdrawn/awaiting proof
  → `unverified_no_consent`. (SC-004 / Leo M.)
- **Bar = strong OR medium**: `hasQualifyingBasis` is true only for a `strong`/`medium` basis with a
  non-null `transaction_verified_at` (D3). A `weak` (manual assertion) basis → false → never `verified`
  (FR-019).

## The SQL leg — `qualifyingBasisExpr(proofIdColumn)`

Lives in `src/db/queries.ts` beside `effectiveConsentState`. Correlated EXISTS:

```sql
EXISTS (
  SELECT 1 FROM verification_basis b
  WHERE b.proof_id = <proofIdColumn>
    AND b.strength IN ('strong','medium')
    AND b.transaction_verified_at IS NOT NULL
)
```

Surfaced into each proof projection as the internal row field `hasQualifyingBasis: boolean`. **Not**
exposed on any public view shape — it is consumed only by `toView`/`toDetailView`/clip mappers to
compute `verified` (and `verificationState` for detail).

## The chokepoint (P-XIV — structural, not conventional)

1. **No projection selects `proof.verified`.** Every `select({ … verified: proof.verified … })` is
   replaced by selecting `hasQualifyingBasis` (+ the already-present effective `consentState`).
2. **`verified` on views is produced only by `proofIsVerified`** in the view mappers. The boolean keeps
   its type/shape (byte-stable for cards).
3. **`proof.verified` column is marked write-frozen/internal** in `schema.ts`; unreferenced by app code.
4. **Surfaces cannot read verified-state any other way** — the column is absent from every view type
   they consume; the only import that yields verified-state is `src/lib/verification.ts`.

## Forward contract (deferred Sources — no resolver change)

A future native connector / webhook (T7.4+) earns the stamp solely by **writing a basis**:

```
native  : { source:'native',  strength:'strong', transaction_verified_at:<t>, transaction_ref:<id>, request_id:null }
webhook : { source:'webhook', strength:'medium', transaction_verified_at:<t>, transaction_ref:<id>, request_id:null }
```

`qualifyingBasisExpr` and the resolver already honor these — **do not modify the resolver** when Sources
land. This is the no-rework guarantee that the graded model + nullable `request_id` exist to provide.

## Consumers (read this, never `proof.verified`)

- Boolean (`proofIsVerified` → stamp/absence): proof card, dashboard hero, showcase item (proof + clip),
  clip studio, clip detail, library card, export attribution.
- State (`verificationState` → stamp / label / nothing): proof detail meta only.

(Per-site routing + byte-stability in `consumer-swap.md`.)
