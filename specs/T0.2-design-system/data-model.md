# Phase 1 — Data Model: T0.2

This slice introduces **no database, schema, or persistence**. It defines one TypeScript **props
type** that anticipates the T0.3 `proof` entity, so the real schema/fixtures slot in without
reworking the ProofCard. This file documents that shape (the forward contract).

## Enums

```text
ProofType    = "text" | "video" | "photo" | "audio"
ConsentState = "granted" | "awaiting" | "revoked"
```

## ProofCardProps (anticipates the T0.3 `proof` entity)

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | stable identifier (UUID in T0.3) |
| `customerName` | `string` | shown as initials avatar + name (quiet) |
| `proofType` | `ProofType` | drives text-vs-media rendering |
| `quote` | `string \| null` | verbatim text proof — dominant in Fraunces when `proofType="text"` |
| `transcript` | `string \| null` | media transcript/caption — secondary on media variants |
| `source` | `string` | e.g. Shopify, Stripe, Instagram, Calendly, Square (source glyph + label) |
| `consentState` | `ConsentState` | colours the consent dot; gates the "Make" action |
| `thumbnail` | `string \| null` (optional) | media reference; **neutral placeholder** in this slice |
| `capturedAt` | `string` (ISO date) | the captured date, shown in mono |
| `reviewed` | `boolean` | `false` → "Unreviewed" corner stamp |
| `verified` | `boolean` | `true` → persimmon "verified real customer" mark |

### Derived (in-component, not stored)

- `canMake = consentState === "granted"` — only then is the persimmon "Make" action rendered
  (Principle VII; FR-020).
- `isMedia = proofType !== "text"` — selects the thumbnail-dominant layout vs the quote-dominant
  layout.

### Validation / invariants (UI-level this slice; enforced in schema at T0.3)

- A `text` proof SHOULD have a non-empty `quote`; a media proof SHOULD have a `transcript` and MAY
  have a `thumbnail` (neutral placeholder when absent).
- `consentState` MUST be one of the three states; a non-`granted` state MUST suppress "Make".

### Forward-compatibility note (Fixtures-first, P-VI)

This is the contract the T0.3 `proof` schema + fixtures must satisfy. T0.3 may add fields (e.g.
`workspaceId`, `createdAt`, consent version/timestamps), but the fields above MUST remain
shape-compatible so the ProofCard renders real data without rework. The type lives in
`src/lib/proof.ts`.
