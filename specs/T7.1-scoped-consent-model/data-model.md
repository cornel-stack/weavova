# Phase 1 Data Model — Scoped consent model

Additive only. Existing columns, indexes, enums, and the P-VII versioning mechanism are unchanged.

## New enums (`src/db/schema.ts`)

```text
consent_scope  : 'organic' | 'paid' | 'showcase' | 'embed'
name_display   : 'full' | 'first_initial' | 'anonymous'
```

Mirrors the existing `consentStateEnum` / `clipFormatEnum` idiom. The closed enum domain makes an
"unknown scope value" unrepresentable at write time (FR-012).

## `consent` table — new columns (additive)

| Column | Type | Null? | Default | Meaning |
|---|---|---|---|---|
| `use_scope` | `consent_scope[]` | NOT NULL | `'{}'` | The permitted uses on **this version**. Empty = permits nothing (fail-closed). Enforceable gate (D4). |
| `name_display` | `name_display` | nullable | — | How the customer is named on this version. Null → fallback chain (workspace default → built-in). |
| `show_face` | `boolean` | nullable | — | Whether the face may be shown on this version. Null → fallback chain. |

**Unchanged**: `id`, `proofId`, `state`, `grantedAt`, `revokedAt`, `version`, `captureContext` (jsonb —
**untouched**, still records capture provenance, NOT display prefs), `createdAt`, the unique
`(proofId, version)` and the `(proofId, version desc)` index.

### New index

| Index | Definition | Purpose |
|---|---|---|
| `consent_use_scope_gin` | `gin (use_scope)` | Serves `@>` / `&&` containment for the scope gate at scale. |

## `workspace` table — new columns (Q1 = A, additive)

| Column | Type | Null? | Meaning |
|---|---|---|---|
| `default_name_display` | `name_display` | nullable | Workspace default name display for new captures. |
| `default_show_face` | `boolean` | nullable | Workspace default face visibility for new captures. |

Null on either ⇒ resolver uses the built-in fallback `{ nameDisplay: 'first_initial', showFace: true }`
(research R4). The demo workspace is seeded with these explicit values.

## The `ConsentDisplay` payload (the read-projection shape, `src/lib/consent.ts`)

```text
ConsentScope = 'organic' | 'paid' | 'showcase' | 'embed'   // from consentScopeEnum
NameDisplay  = 'full' | 'first_initial' | 'anonymous'      // from nameDisplayEnum

ConsentDisplay {
  useScope:    ConsentScope[]   // the permitted uses of the EFFECTIVE version
  nameDisplay: NameDisplay      // resolved (override clamped toward privacy, else ws default, else built-in)
  showFace:    boolean          // resolved (same chain)
}
```

Type-only imports from `@/db/schema` (the erased-at-build idiom already used for `ConsentState` /
`ClipFormat`) keep this **client-safe** — no DB code reaches any bundle.

## Resolution rules (the invariants, encoded)

1. **Latest version wins** (unchanged): the effective consent is the row with `max(version)` for the
   proof. `useScope` / `nameDisplay` / `showFace` are read from that row. Prior versions are retained but
   not effective.
2. **Fail-closed scope gate**: a scope is permitted **iff** the effective version's `state = 'granted'`
   **and** its `use_scope @>` the scope. Non-granted (awaiting / revoked / missing row) ⇒ **every** scope
   is denied. Empty `use_scope` ⇒ permits nothing.
3. **Least-privilege default** (new captures, T7.2 / app insert path): a new consent's `useScope` is
   `['organic']` unless the customer explicitly opts into more. `paid` / `showcase` / `embed` are never
   pre-granted. (The DB column default `'{}'` is the fail-closed baseline; the app insert sets `organic`
   explicitly so intent is auditable — the DB default is never relied on for a granted row.)
4. **One-directional privacy override**: per field, the resolved display is the **more-private** of the
   workspace default and the customer override (privacy ranks: `full<first_initial<anonymous`;
   `showFace true<false`). A less-private override is clamped to the default; the customer is never
   recorded as less private than they chose.
5. **Backfill (existing rows, honest prior behaviour)**: existing **granted** versions →
   `useScope = {organic,paid,showcase,embed}`, `nameDisplay = full`, `showFace = true`. Non-granted
   versions keep `useScope = '{}'`. (research R5.)

## Entity relationships (unchanged)

`workspace 1—* proof 1—* consent (versions)`; `proof 1—* derivedAsset`; `derivedAsset.consentId → consent.id`
(provenance: the version a clip was made under). T7.1 adds **no** relationship — only columns + one index.
