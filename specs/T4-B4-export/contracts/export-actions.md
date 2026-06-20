# Contract — Reads, Server Action & the copy island

All reads reuse the **existing** shared `effectiveConsentGranted(proofIdColumn)` gate (P-VII). No new
gate. No write. `withDbRetry`-wrapped like every other read.

## New reads (`src/db/queries.ts`, additive)

### `getClipExport(workspaceId: string, clipId: string): Promise<PostTextPackage | null>`

- Joins `derived_asset → proof → source`, `where derived_asset.id = clipId AND proof.workspaceId =
  workspaceId AND effectiveConsentGranted(derived_asset.proofId)`. `limit 1`.
- Selects the owned columns (data-model §"Source column" table); `headline = quote ?? transcript`;
  builds `sampleVideo` from `SAMPLE_CLIP_URL` + `SAMPLE_VIDEO_NOTE`.
- Returns `null` for missing / cross-workspace / **withdrawn** clip — the same three-into-one opacity
  as `getClip` (no oracle).
- `getClip` and `ClipDetailView` are **byte-unchanged**; this is a new function beside them.

### `getClipExports(workspaceId: string, clipIds: string[]): Promise<PostTextPackage[]>`

- Same join + gate, `where derived_asset.id = ANY(clipIds) AND proof.workspaceId = workspaceId AND
  effectiveConsentGranted(...)`. Returns **only** the granted, in-workspace clips among `clipIds`.
- Order: by `derived_asset.createdAt desc` (the Library's order) for a stable manifest.
- The **difference** between requested `clipIds` and returned ids is the honest **skipped** set
  (withdrawn / missing / cross-workspace — indistinguishable, by design).
- Empty `clipIds` → `[]` (no query needed).

> Implementation note: `getClipExport` may be expressed as `getClipExports(ws, [id])[0] ?? null` to
> avoid duplicated SQL, or kept separate for the `limit 1` path — either is fine; both reuse the gate.

## Server Action (`src/app/app/library/actions.ts`, new — bulk only)

### `exportClips(input: { clipIds: string[] }): Promise<BulkExportResult>`

```text
"use server"

BulkExportResult {
  manifest: string            // buildManifest(packages, exportedAt) — JSON
  filename: string            // e.g. "weavova-export-3-clips.json"
  made: number                // packages.length (exported)
  skipped: number             // requested ids − returned ids
  items: Array<{ clipId: string; status: "exported" | "skipped" }>   // honest per-clip outcome
}
```

Flow:
1. `getCurrentWorkspace()` — identity resolved server-side, never trusted from the client.
2. Validate input: `clipIds` is a non-empty `string[]` of non-empty strings (hand-rolled guard; **no
   Zod** — none is a dependency, matching `validateGenerateInput`). Invalid → an empty/honest result.
3. `packages = await getClipExports(workspace.id, clipIds)` — **the read-time consent re-check** (the
   B1 race: a clip withdrawn after select is absent here → skipped).
4. `exportedAt = new Date().toISOString()` (server-side; allowed in an action).
5. `manifest = buildManifest(packages, exportedAt)`; compute `made`/`skipped`/`items` from the
   requested vs returned ids.
6. Return `BulkExportResult`. **No `revalidatePath`** — export is a read; nothing changed in the DB.

Honesty: `made` + `skipped` == `clipIds.length` (deduped); never all-or-nothing, never fabricated
(FR-006, mirroring B1's `BatchResult`). The manifest carries **no** finished video.

**Single export uses NO action** — it is assembled at clip-detail render (research §4) and copied
client-side. Only bulk needs the action (it produces the manifest from the gated read).

## Client island — single copy (`clip-export-button.tsx`, `"use client"`)

```text
props: { text: string }              // formatPostText(pkg), assembled server-side at render
```
- Renders a "Copy post text" button (on-token; secondary-strength ink or persimmon-consistent with
  the detail's action area — see plan; persimmon stays the single primary).
- On click (synchronous, in-gesture — research §4): `await navigator.clipboard.writeText(text)` →
  show "Copied" (`role="status"`, `aria-live="polite"`), revert after a short delay.
- **Fallback (A-11)**: if `navigator.clipboard` is missing/throws, reveal a focused, pre-selected
  read-only `<textarea>` with `text` (and/or `document.execCommand('copy')`) so copy always works.
  The control is **never dead**.

## Client wiring — bulk (`library-client.tsx` + `library-selection-bar.tsx`, `"use client"`)

`LibraryClient` (B1 `InboxClient` pattern):
- state: `selecting: boolean`, `selected: Set<string>`; actions `toggleSelecting`, `toggleClip(id)`,
  `selectAll()`, `exitSelection()`.
- renders the existing grid with a **sibling selection overlay** per card (the card shape unchanged —
  FR-009); a "Select" entry affordance; and, when `selecting`, the sticky `LibrarySelectionBar`.

`LibrarySelectionBar` (B1 `InboxSelectionBar` layout, simpler — no format picker):
- shows `{count} selected`, "Select all ({n})", "Export selected" (persimmon primary; disabled while
  pending / when count 0), "Cancel".
- on "Export selected": `const res = await exportClips({ clipIds: [...selected] })`; then
  **download**: `new Blob([res.manifest], { type: "application/json" })` → `URL.createObjectURL` →
  `<a download={res.filename}>` click → `URL.revokeObjectURL`. **Native, no dependency.**
- shows the honest tally (`role="status"`): `"{made} exported"` + (`" · {skipped} skipped · needs
  consent"` when `skipped > 0`); on a thrown action, an honest "couldn't export — try again". Mirrors
  `InboxSelectionBar`'s result line.

## Byte-stability checklist (contract-level)

- `getClip`, `getLibraryClips`, `getProof*`, `getShowcase`, `generateClip`, `generateBatch` — unchanged.
- `ClipView` / `LibraryClipView` / `ClipDetailView` / `ProofView` / showcase shapes — unchanged.
- `ProofCard`, `LibraryClipCard` (props/shape) — unchanged; selection overlay is a sibling.
- nav rail / routes — unchanged (no new route, no nav entry).
- `SAMPLE_CLIP_URL`, `src/lib/clip.ts` — unchanged (Q2:A).
- `ClipDetail` gains **one additive optional slot prop** for the copy island (existing markup
  preserved) — the read **shape** is what FR-008 freezes, not the component's prop list.
