# Contracts — Scoped consent model (read path + scope gate + resolver)

Exact signatures the slice delivers. Additive: existing exports unchanged unless noted "EXTENDED".
No UI contract (no surface in this slice).

## 1. Types — `src/lib/consent.ts` (client-safe, type-only DB imports)

```ts
export type ConsentScope = (typeof consentScopeEnum)["enumValues"][number]; // organic|paid|showcase|embed
export type NameDisplay  = (typeof nameDisplayEnum)["enumValues"][number];  // full|first_initial|anonymous

export interface ConsentDisplay {
  useScope: ConsentScope[];
  nameDisplay: NameDisplay;
  showFace: boolean;
}
```

## 2. Pure logic — `src/lib/consent.ts` (no DB; unit-checkable; called by T7.2 + the read path)

```ts
// Least-privilege default for a NEW consent (organic only).
export const DEFAULT_USE_SCOPE: ConsentScope[] = ["organic"];

// The built-in workspace display fallback when the workspace columns are null (research R4).
export const BUILTIN_DISPLAY_DEFAULT: { nameDisplay: NameDisplay; showFace: boolean }
  = { nameDisplay: "first_initial", showFace: true };

// THE one-directional enforcement point. Per field, result = more-private(default, override).
// Privacy ranks: nameDisplay full<first_initial<anonymous ; showFace true<false.
// A less-private override is clamped to the default; absent override -> default.
export function resolveDisplay(
  wsDefault: { nameDisplay: NameDisplay; showFace: boolean },
  override?: Partial<{ nameDisplay: NameDisplay; showFace: boolean }>,
): { nameDisplay: NameDisplay; showFace: boolean };
```

**Behaviour contract for `resolveDisplay`:**
- `override.nameDisplay` more private than `wsDefault.nameDisplay` ⇒ use override.
- `override.nameDisplay` less private ⇒ use `wsDefault` (clamp; never below the default floor).
- `override.nameDisplay` equal or absent ⇒ `wsDefault.nameDisplay`.
- same three rules for `showFace` (with `false` more private than `true`).

## 3. Read-path helpers — `src/db/queries.ts`

### 3a. New latest-version sibling subselects (mirror `latestConsentVersion`, byte-stable additions)

```ts
const latestConsentScope:       SQL<ConsentScope[] | null>;
const latestConsentNameDisplay: SQL<NameDisplay | null>;
const latestConsentShowFace:    SQL<boolean | null>;
```

Each: `select c.<col> from consent c where c.proof_id = ${proof.id} order by c.version desc limit 1`.
The existing `latestConsentState` / `latestConsentVersion` / `latestConsentEffectiveAt` and
`effectiveConsentState(col)` / `effectiveConsentGranted(col)` are **unchanged**.

### 3b. The scope gate — fails closed (the T9 forward-contract)

```ts
// SQL predicate for WHERE clauses: "the proof's EFFECTIVE consent grants <scope>".
// Non-granted / missing row / scope-absent => false (the trailing `is true` coerces NULL -> false).
export function effectiveConsentGrantsScope(
  proofIdColumn: AnyColumn,
  scope: ConsentScope,
): SQL;
// ( select c.state = 'granted' and c.use_scope @> array[${scope}]::consent_scope[]
//   from consent c where c.proof_id = ${proofIdColumn}
//   order by c.version desc limit 1 ) is true

// Imperative boolean (mirrors getGrantedConsentId): workspace-scoped, withDbRetry-wrapped.
export async function consentGrantsScope(
  workspaceId: string,
  proofId: string,
  scope: ConsentScope,
): Promise<boolean>;
```

### 3c. Effective display read (the clean entry point for T7.2 / verified bar)

```ts
// The effective version's RESOLVED display + scope, or null if no consent row. Workspace-scoped.
// display fields resolved through the fallback chain (override already applied at write; here the
// stored value -> workspace default -> BUILTIN_DISPLAY_DEFAULT). NOT called by any T7.1 surface.
export async function getEffectiveConsentDisplay(
  workspaceId: string,
  proofId: string,
): Promise<ConsentDisplay | null>;
```

### 3d. EXTENDED — `getGrantedConsentId` return widened (additive; `.consentId` byte-stable)

```ts
export async function getGrantedConsentId(
  workspaceId: string,
  proofId: string,
): Promise<{
  consentId: string;
  useScope: ConsentScope[];     // NEW — the granted effective version's scope
  nameDisplay: NameDisplay;     // NEW — resolved display
  showFace: boolean;            // NEW
} | null>;
```

Existing callers (`generateClip` / `generateBatch` gate, `recordConsentWithdrawal`) read only
`.consentId` and are byte-stable. New fields are available for downstream slices.

## 4. Schema exports — `src/db/schema.ts`

```ts
export const consentScopeEnum = pgEnum("consent_scope", ["organic","paid","showcase","embed"]);
export const nameDisplayEnum  = pgEnum("name_display",  ["full","first_initial","anonymous"]);
// consent: + useScope: consentScopeEnum("use_scope").array().notNull().default([])
//          + nameDisplay: nameDisplayEnum("name_display")   (nullable)
//          + showFace: boolean("show_face")                 (nullable)
//          + index("consent_use_scope_gin").using("gin", t.useScope)
// workspace: + defaultNameDisplay: nameDisplayEnum("default_name_display")  (nullable)
//            + defaultShowFace: boolean("default_show_face")                (nullable)
```

## 5. Migration `0005` — generated columns/enums/index + a hand-appended idempotent backfill

```sql
-- (generated by drizzle-kit from schema.ts: CREATE TYPE x2, ALTER TABLE ADD COLUMN x5, CREATE INDEX gin)
-- hand-appended idempotent backfill:
UPDATE consent SET use_scope = '{organic,paid,showcase,embed}'
  WHERE state = 'granted' AND use_scope = '{}';
UPDATE consent SET name_display = 'full', show_face = true
  WHERE name_display IS NULL;
```

(Constitution X permits raw SQL **inside migrations**. Guards make both re-runnable.)
