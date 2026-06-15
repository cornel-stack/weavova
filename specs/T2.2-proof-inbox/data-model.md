# Phase 1 — Data Model: T2.2 Proof Inbox (read model only)

**No database schema change.** The inbox reads the existing T0.3 tables through the query layer and the
existing `ProofView` projection. The "model" added here is (a) the **workspace scoping** of the read and
(b) a pure, client-side **inbox derivation** over `ProofView[]`. Nothing new is stored.

## Existing entities used (T0.3, unchanged)

- **workspace** — scope; resolved by the session seam (`getCurrentWorkspace`). The inbox reads only
  `proof.workspaceId = ws.id`.
- **proof** — `customerName`, `proofType` (text/video/photo/audio), `quote`/`transcript`, `sourceId`,
  `capturedAt`, `reviewed`, `verified`, `thumbnail`, `workspaceId`. Drives the Wall, filters, search,
  sort, count.
- **consent** — versioned; effective (latest-version) state drives the "Awaiting consent" filter and the
  ProofCard's consent gate.
- **source** — `label` (Shopify, Stripe, …) shown on each card and matchable by search.
- **ProofView** (`src/lib/proof.ts`) — the flattened card shape; **reused unchanged** for the Wall.

## Read change: workspace-scoped queries

| Function | Before | After (T2.2) |
|---|---|---|
| `getProofs` | `getProofs(): ProofView[]` (all proof) | `getProofs(workspaceId): ProofView[]` — `where workspaceId`, ordered `capturedAt desc`, wrapped in `withDbRetry` |
| `getProof` | `getProof(id): ProofView \| null` | `getProof(workspaceId, id): ProofView \| null` — adds the workspace predicate (cross-workspace → `null`), wrapped in `withDbRetry` |

- The `proofColumns` projection, `latestConsentState` subquery, and `toView` mapper are reused as-is.
- Only existing caller (`styleguide/data/page.tsx`) is updated to pass a workspace id.

## Inbox derivation (pure transform over `ProofView[]`, client-side)

Applied in order; all combine (AND). Counts and results are computed — never fabricated (FR-008/011).

| Step | Input state | Rule |
|---|---|---|
| **status filter** | `'all' \| 'new' \| 'reviewed' \| 'awaiting'` | all → keep; new → `!reviewed`; reviewed → `reviewed`; awaiting → `consentState === 'awaiting'` |
| **type filter** | `'all' \| 'video' \| 'text' \| 'photo' \| 'audio'` | all → keep; else `proofType === type` |
| **search** | string | case-insensitive substring over `customerName` + (`quote` ?? `transcript`) + `source` |
| **sort** | `'newest'` (working) / `'warmest'` (disabled) | newest → `capturedAt` descending; warmest → disabled, never applied |
| **count** | — | `shown` = derived list length; `total` = workspace `proofs.length` → "{shown} of {total} pieces of proof" |

### States derived from the result

- **no-proof-at-all** (server): `getProofs(ws).length === 0` → `<InboxEmpty/>` (capture-oriented copy).
- **filtered-empty** (client): derived list length `0` while `total > 0` → distinct "no matches" panel
  with a **clear-filters** action that resets status/type/search to defaults.

## Not modeled (carry-over honesty)

- **Warmth / sentiment signal** — backs the disabled "Warmest" sort; not in the T0.3 schema, not
  introduced here (FR-019, A-10; real ranking = T4/B3).
- **Selection state / batch** — no selection model; the batch cluster is not rendered (A-12; T4/B1).
- **List view shape** — undesigned; deferred (A-12).

## Forward-compatibility

- `getProofs(workspaceId)` returns the workspace set; the D2 migration to server-side filtering/
  pagination at scale is localized to this function + the page (the Client island's contract is the
  derivation above).
- Workspace scoping makes the T6 multi-tenant swap mechanical (already reads one workspace).
