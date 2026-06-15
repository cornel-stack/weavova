# Contract — inbox derivation (client-side filter / sort / search / count)

**Location**: `src/components/app/proof-inbox/inbox-client.tsx` (the Client island). A pure transform
over the workspace `ProofView[]` the Server handed in. Deterministic, computed, no fabrication.

## State (intended)

```ts
type StatusFilter = "all" | "new" | "reviewed" | "awaiting";
type TypeFilter   = "all" | "video" | "text" | "photo" | "audio";
type SortKey      = "newest";          // "warmest" exists in the UI but is DISABLED — never a value here

type InboxState = {
  status: StatusFilter;   // default "all"
  type:   TypeFilter;     // default "all"
  search: string;         // default ""
  sort:   SortKey;        // default "newest"
};
```

## Derivation (applied in order; AND-combined)

```text
visible(proofs, state):
  1. status:  all → keep
              new → !p.reviewed
              reviewed → p.reviewed
              awaiting → p.consentState === "awaiting"
  2. type:    all → keep ; else p.proofType === state.type
  3. search:  term = state.search.trim().toLowerCase()
              term === "" → keep
              else (p.customerName + " " + (p.quote ?? p.transcript ?? "") + " " + p.source)
                   .toLowerCase().includes(term)
  4. sort:    newest → by p.capturedAt descending (ISO/Date compare)
  → returns the visible, ordered ProofView[]
```

## Count contract

- `shown` = `visible(...).length`
- `total` = `proofs.length` (the full workspace set passed from the Server)
- Rendered as **"{shown} of {total} pieces of proof"** (FR-011). When no filter/search is active,
  `shown === total`.

## State contract

- **filtered-empty**: `visible(...).length === 0 && total > 0` → render the "no matches" panel with a
  **clear-filters** control that resets `status`/`type`/`search` to defaults (and re-shows the Wall).
- **no-proof-at-all** is NOT handled here — it is decided on the Server (`InboxData`, `total === 0` →
  `<InboxEmpty/>`), so the toolbar/Wall do not render for an empty workspace.

## Disabled "Warmest"

- The sort control renders "Warmest" as a disabled option (`aria-disabled`, "coming soon" affordance).
  Selecting it is impossible; `sort` can only ever be `"newest"` in T2.2 (FR-010, A-10). No proxy
  ordering is computed for it (FR-019).
