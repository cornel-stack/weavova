# Phase 1 — Data Model: T6.2 Onboarding Wizard

**Two additive columns. No other schema change. One additive migration (`drizzle/0012_*.sql`).**

## Changed entity

### `workspace` (add two columns)

| Field | Type | Null? | Default | Notes |
|---|---|---|---|---|
| … existing … | | | | unchanged (incl. `onboarded_at` from T6.1) |
| **business_type** | **text** | **yes** | none | NEW. Step 1 selection. Code-side allowlist. |
| **first_format** | **text** | **yes** | none | NEW. Step 4 preference. Code-side allowlist. Honoured by the render engine later (T8); not a produced asset now. |

**Migration (additive, safe on live table):**

```sql
ALTER TABLE "workspace" ADD COLUMN "business_type" text;
ALTER TABLE "workspace" ADD COLUMN "first_format" text;
```

Generated via `npx drizzle-kit generate` after adding both to the `workspace` table in
`src/db/schema.ts`. Nullable, no default → existing rows (incl. seed) get `NULL`, which is the honest
"not chosen" state. No backfill.

### Allowlists (validated in code, not the DB — `source.kind` precedent)

- **business_type** ∈ `{ ecommerce, services, saas, local, creator, agency }`
  (design labels: E-commerce · Services & bookings · SaaS · Local business · Creator · Agency)
- **first_format** ∈ `{ raw_review, ugc, digital_product, physical_product, quote_card }`
  (design labels: Raw review · UGC · Digital product · Physical product · Quote card)

A write with a value outside the allowlist is rejected at the data layer.

## Reused entities (unchanged — no new model)

- **`brand_kit`** — Step 3 writes logo/colour/fonts via the existing `saveBrandKit` → `upsertBrandKit`
  (`{ name, logoAssetUrl, brandColor, fonts }`). Logo key uploaded via `presignBrandKitLogoUpload`;
  `logoAssetUrl = assetUrlForKey(key)` = the **PUBLIC** brand bucket. No schema change.
- **`webhook_endpoint`** — Step 2 surfaces the real URL + secret via `getOrCreateWebhookEndpoint`. No
  schema change; no new source model.
- **`workspace.onboarded_at`** (T6.1) — set by `markWorkspaceOnboarded` on Finish/Skip; read by the
  routing gate. No schema change.

## New data-layer writes (in `src/db/queries.ts`)

| Function | Effect | Guard |
|---|---|---|
| `setWorkspaceBusinessType(workspaceId, value)` | writes `business_type` | value ∈ allowlist |
| `setWorkspaceFirstFormat(workspaceId, value)` | writes `first_format` | value ∈ allowlist |
| `markWorkspaceOnboarded(workspaceId)` | sets `onboarded_at = now()` | idempotent (harmless re-set) |

(Step 3 has no new query — it delegates to the existing `saveBrandKit`. Step 2 has no write — it reads
`getOrCreateWebhookEndpoint`.)

## Invariants

- **INV-1 (gate):** `onboarded_at IS NULL` ⇒ app routes redirect to the wizard; `onboarded_at` set ⇒
  wizard routes redirect to the app. Symmetric across the two Layer-2 layouts.
- **INV-2 (partial-safe):** each step writes independently; Skip/exit persists only chosen values —
  an untouched step leaves its column NULL / the brand kit unwritten (no fabricated config).
- **INV-3 (onboarded terminal):** once `onboarded_at` is set (Finish or Skip), the wizard is
  unreachable — the tour and any later config edits happen in-app, never by re-running the wizard.
- **INV-4 (public logo):** the Step 3 logo is addressed by `assetUrlForKey` (public class) — never the
  private captures bucket (T7.4a split preserved).
