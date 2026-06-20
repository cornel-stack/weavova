# Quickstart — Validating T4-B4 Export (manual, on fixtures)

Prerequisites: `npm run dev` (localhost:3000), the stub session / fixtures (the established Phase-1
setup). No migration, no env changes (no new dependency, R2 untouched).

## 1. Single export — copy post text (US1, FR-001/002/004)

1. Open a **granted** clip's detail (`/app/library` → a clip card → `/app/clip/[id]`).
2. Activate **"Copy post text"**.
3. Expect: a "Copied" confirmation; paste into any text field and verify the text contains, in order:
   - the **customer's verbatim words** (headline) first (P-II),
   - the **brand hook** (if the clip has one), clearly the brand's line,
   - an **attribution** line (customer name, "verified customer" if verified, the capture source),
   - a bracketed **sample note** ("…replaces this when rendering ships (T8). Not a finished clip…").
4. Verify the text contains **no** view/reach/engagement metric and **no** finished-video link.
5. Clipboard fallback: in a context where the clipboard API is blocked, confirm the post-text is
   still offered (selectable textarea) — the control is **never dead** (A-11).

## 2. Bulk export — download one manifest (US3, FR-009/010, Q3:C)

1. On `/app/library`, activate **"Select"** to enter selection mode.
2. Select 2–3 clips (or "Select all"); confirm the selection overlay appears **around** the cards and
   the cards themselves look unchanged.
3. Activate **"Export selected"**.
4. Expect: **one** file downloads (`weavova-export-<n>-clips.json`) — not N files, no zip.
5. Open it: a JSON manifest with `exportedAt`, `count`, and a `clips[]` array; each entry has the
   structured owned fields **plus** a `postText` string, and a clearly-labeled `sampleVideo`
   (`status: "arrives_at_T8"`, the sample note, the sample reference) — **no** finished-video file,
   **no** metric.
6. Confirm the selection-bar result reads honestly: "**N exported**" (+ "· M skipped · needs consent"
   if any were withdrawn).

## 3. Consent gate — withdrawn proof is not exportable (US2, P-VII, FR-005)

1. **Single**: withdraw a proof's consent (consent flow), then open its clip detail directly by URL —
   expect the detail to `notFound()` (already consent-gated), so there is no export surface for it.
2. **Bulk race**: enter Library selection, select a clip; in another tab withdraw that proof's
   consent; back in the first tab activate "Export selected". Expect: that clip is **absent** from the
   manifest and counted in **skipped** — re-checked at read time (the B1 race). No payload for it, no
   fabricated success.

## 4. States (Definition of Done)

- **Empty Library**: the existing empty state is unchanged; no selection affordance implies content.
- **Empty selection**: "Export selected" is disabled / a no-op; no empty file.
- **Loading**: existing skeletons unchanged.
- **Error**: a thrown `exportClips` shows an honest "couldn't export — try again", not a fake success.
- **Responsive** `480 / 1024 / 1280`; **keyboard**: tab to the copy button, the selection toggles, and
  the bar; activate with Enter/Space.

## 5. Byte-stability spot checks

- Diff confirms **no** change to `getClip` / `getLibraryClips` / `generateClip` / `generateBatch`,
  the `ClipView` / `LibraryClipView` / `ClipDetailView` / showcase shapes, `ProofCard`,
  the `LibraryClipCard` shape, `SAMPLE_CLIP_URL`, the nav rail, or any migration.
- `npm run build` and `npm run lint` are green.

## 6. Dependency check (the ratified determination)

- `git diff package.json package-lock.json` shows **no new dependency**. If implementation ever needs
  a zip/lib, it must **stop and surface** for ratification (research §1) — it should not.
