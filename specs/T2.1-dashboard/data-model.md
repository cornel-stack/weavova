# Phase 1 — Data Model: T2.1 Dashboard (read model only)

**No database schema change.** This slice reads the existing T0.3 tables (`workspace`, `source`,
`proof`, `consent`) through the existing query layer and `ProofView` projection. The only "model" added
is a **derived read model** assembled in `getDashboardSummary` — it is computed, not stored.

## Existing entities used (T0.3, unchanged)

- **workspace** — scope; resolved by the session seam (`getCurrentWorkspace`). Reads use `workspace.id`.
- **proof** — `customerName`, `proofType`, `quote`/`transcript`, `sourceId`, `capturedAt`, `reviewed`,
  `verified`, `thumbnail`, `workspaceId`. Drives hero, grid, and the proof-derived KPIs.
- **consent** — versioned; the effective state is the latest version (existing `latestConsentState`
  correlated subquery). Gates the clip action.
- **source** — `label` shown on hero/cards.
- **ProofView** (`src/lib/proof.ts`) — the flattened shape ProofCard consumes; **reused as-is** for both
  the grid cards and the hero. No change.

## Derived read model (new, computed)

### `DashboardSummary`

| Field | Type | Derivation | T2.1 value |
|---|---|---|---|
| `proofThisWeek` | `number` | count of workspace proof with `capturedAt >= now() - 7 days` (FR-004/A-02) | computed |
| `needsReview` | `number` | count of workspace proof with `reviewed = false` (also drives the greeting count, A-01) | computed |
| `totalProof` | `number` | count of all workspace proof (distinguishes the empty state) | computed |
| `clipsThisMonth` | `number` | count of derived clip assets created this calendar month | **0** (`// T2.4`: read `derived_asset`) |
| `latestClip` | `LatestClipDescriptor \| null` | the most recent owned clip (no view count) | **null** (`// T2.4`) |
| `heroProof` | `ProofView \| null` | most-recently-captured workspace proof (A-03); `null` when no proof | computed |
| `recentProof` | `ProofView[]` | next most-recent proof after the hero, capped at 6 (A-04), hero excluded | computed |

### `LatestClipDescriptor` (shape defined now, unused/`null` until T2.4)

| Field | Type | Notes |
|---|---|---|
| `customerName` | `string` | from the clip's source proof |
| `verified` | `boolean` | source proof's verified mark |
| `createdAt` | `string` (ISO) | when the clip was made |

> **No `views`/`reach`/`engagement` field exists on this descriptor** — those are un-owned external
> analytics, excluded by FR-019 / A-09. The descriptor carries only owned, internal descriptors.

## Derivation rules

- **Time windows (FR-004/A-02)**: "this week" = trailing 7 days ending at the real DB `now()`; "this
  month" = current calendar month. Predicates evaluated in SQL (server-authoritative). Never anchored
  to the newest proof. Future-dated proof (edge case) does not count toward "this week".
- **Hero / grid (A-03/A-04)**: order all workspace proof by `capturedAt desc`; element 0 is the hero,
  elements 1..6 are the grid. The hero is chosen regardless of consent/review; its clip CTA obeys the
  consent gate. The hero is never duplicated in the grid (FR-008).
- **Consent gate (P-VII/FR-007)**: hero "Make a clip" renders only when effective `consentState ===
  "granted"`. Grid cards inherit ProofCard's existing identical gate (unchanged).
- **Empty state (FR-012)**: `totalProof === 0` ⇒ `heroProof = null`, `recentProof = []`, all counts `0`;
  the body renders the empty panel.
- **Greeting count (A-01)**: the greeting's "N to review" uses `needsReview` (one computed value).

## Forward-compatibility (P-VI)

- The `clipsThisMonth`/`latestClip` fields are present in the contract now, returning `0`/`null`, so the
  T2.4 swap to the real `derived_asset` read changes only `getDashboardSummary`'s internals — the
  masthead/UI consuming `DashboardSummary` does not change shape.
- Workspace scoping via `workspaceId` makes the T6 multi-tenant swap (real auth → real membership)
  mechanical; the dashboard already reads only one workspace's data.
