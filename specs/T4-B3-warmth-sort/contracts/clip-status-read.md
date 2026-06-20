# Contract — Clip-status read, opt-in-lazy action & inbox wiring

The **un-tapped** signal's input (clip status per proof) — added **additively** and fetched **only** on
opt-in to Warmest, so the default Newest path is byte-stable and the read never fires by default.

## New read (`src/db/queries.ts`, additive)

### `getProofClipStatus(workspaceId: string): Promise<string[]>`

- `select distinct derived_asset.proofId from derived_asset where derived_asset.workspaceId =
  workspaceId` → the proofIds with **≥1** clip ("tapped"). `withDbRetry`-wrapped.
- **Not** consent-filtered: "tapped" is a provenance fact (a clip was made from this proof). Withdrawn
  proof is ranked cold by the consent gate regardless, so no consent filter is needed or wanted here.
- Returns a plain `string[]` (the client builds a `Set` for O(1) lookups).
- **Does NOT touch** `getProofs`, `getLibraryClips`, `getProofClips`, `ProofView`, or any existing read.

## New server action (`src/app/app/proof/warmth-actions.ts`, NEW)

### `getInboxClipStatus(): Promise<string[]>`

```text
"use server"
- workspace = await getCurrentWorkspace()        // identity server-side, never trusted from client
- return getProofClipStatus(workspace.id)
```

No input from the client (no ids to trust); workspace-scoped server-side. No write, no `revalidatePath`
(it's a read). Lives in its **own** file so `proof/actions.ts` (`generateBatch`) stays byte-stable.

## Inbox wiring (`inbox-client.tsx` + `inbox-toolbar.tsx`, in-scope edits)

### `inbox-toolbar.tsx` (enable the existing control)

- `SortKey` → `"newest" | "warmest"` (was `"newest"`).
- The `<select>`'s "Warmest" option: drop `disabled`, drop "— coming soon"; the `onChange` now accepts
  `"warmest"` as well as `"newest"`.
- Add the **one-line honesty copy** (FR-008) with the control (helper text / `title`): content-readiness,
  not an engagement prediction. On-token `text-ink-3`.

### `inbox-client.tsx` (opt-in-lazy + the warmth branch)

- State additions: `sort` type gains `"warmest"` (**default stays `"newest"`**); add
  `tappedIds: Set<string> | null` (**initial `null`**) and a small `warmthLoading` flag.
- **Opt-in fetch** — when `onSortChange("warmest")` is selected and `tappedIds === null`: call
  `getInboxClipStatus()` once, set `tappedIds = new Set(result)`. Wrap in try/catch → on failure leave
  `tappedIds` null and fall back to Newest order (honest; no crash). The default Newest path **never**
  calls it.
- **The `visible` useMemo** — extend its dependency list with `sort` + `tappedIds`:
  - `sort === "newest"` → the **byte-identical** existing newest ordering (`capturedAt` desc).
  - `sort === "warmest"` **and** `tappedIds !== null` → `sortByWarmth(filtered, tappedIds)`.
  - `sort === "warmest"` **and** `tappedIds === null` (in flight / failed) → fall back to the newest
    ordering (no fabricated warmth).
  - **Filtering is unchanged and applied first** (status/type/search), then warmth orders the result —
    so the **count is identical** to Newest for the same filters (FR-005/FR-006).

## Byte-stability checklist (contract-level)

- `getProofs` / `ProofView` — unchanged (warmth uses existing fields; clip status is a separate read).
- `getLibraryClips` / `getProofClips` / `getShowcase` / `getClip*` — unchanged.
- `generateClip` / `generateBatch` (`proof/actions.ts`) — unchanged (new action in its own file).
- `ProofCard`, `inbox-wall.tsx` — unchanged (no per-proof badge; warmth changes order only).
- `inbox-data.tsx` — unchanged (one `getProofs` read; no eager clip-status).
- **Default Newest order** — byte-identical (the newest branch of the useMemo is untouched).
- nav rail / routes — unchanged (no new route). No schema, no migration, no new dependency.
