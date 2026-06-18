# Contract — Selection surface (inbox selection mode + the action bar)

Wires the cluster T2.2 deferred — per-proof selection, "Select all ready", "Make clips" — into the existing
inbox (`/app/proof`), inline (Q3). **ProofCard stays byte-unchanged** (selection is a sibling overlay).

## Selection model (`inbox-client.tsx`, Client)

- State: `selecting: boolean`, `selected: Set<string>` (proof ids), `format: ClipFormat` (one batch format,
  default `9x16`). Added to the existing in-memory island.
- **Enter/exit selection**: a "Make clips" control (surfaced in `inbox-toolbar.tsx`) toggles `selecting`;
  exiting clears `selected`.
- **"Select all ready"**: sets `selected` to the **granted** proofs among the visible list
  (`consentState === 'granted'`); non-granted excluded (Q2/FR-003).

## Per-card overlay (`inbox-wall.tsx`)

The wall keeps wrapping each byte-unchanged `ProofCard` in a `relative` container. **In selection mode** it
renders, instead of the stretched-link nav:
- **granted proof** → a **selection toggle** (checkbox / selected ring) bound to `selected` — the whole card
  area toggles; visible focus; `aria-pressed`/checkbox semantics.
- **non-granted proof** → a non-interactive **"needs consent"** badge — **not selectable** (Q2; matches B1).

Outside selection mode the existing stretched-link nav is unchanged. **ProofCard is not modified** —
`ProofView.id` + `consentState` drive the overlay.

## Selection-action bar (`inbox-selection-bar.tsx`, Client; Q3)

Appears when `selected.size ≥ 1`:
- **"{n} selected"** · a **one-format picker** over `FORMAT_OPTIONS` (default `9x16`) · **"Make clips"**
  (persimmon primary) · a clear/exit affordance.
- On "Make clips": calls `generateBatch({ proofIds: [...selected], format })`, **disables the button while
  pending** (no double-submit), then renders the **honest per-proof result** in place:
  - **"{made} clips made"**; when non-zero, **"{skipped} skipped · needs consent"** and **"{failed}
    couldn't be made — try again"**. No all-or-nothing; skipped/failed never faked (FR-007/019).
- An on-token **in-progress** state covers the generate wait (FR-011).

## A-11 — NOT rendered (hidden, not dead)

- **Warmth sort** (B3), **upload** (B2), **export** (B4) — separate T4 slices.
- The inbox **List** view (still undesigned — T2.2 A-12).
- Any fabricated success / "estimated reach" / metric (FR-012/019).

## Assertions

- **ProofCard byte-unchanged** (the selection control is a sibling overlay). The T2.2 stretched-link nav is
  unchanged outside selection mode; suppressed within it (a card toggles selection, not navigates).
- **P-VII**: "Select all ready" + selectability are granted-only up front; the **generate-time re-check**
  (`generateBatch`) is the actual guarantee (covers revoked-after-select).
- **FR-019**: owned values only (selected count, honest result counts); no fabricated success.
- **Byte-stable**: ProofView/getProofs/getProof/ProofDetailView, ClipView/LibraryClipView/ClipDetailView,
  ShowcaseItem, every existing read, `generateClip`, and `schema.ts` unchanged. No new dependency.
