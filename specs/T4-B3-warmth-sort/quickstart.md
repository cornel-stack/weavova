# Quickstart — Validating T4-B3 Warmth sort (manual, on fixtures)

Prerequisites: `npm run dev` (localhost:3000), the stub session / fixtures (the established Phase-1
setup). No migration, no env changes (no new dependency).

## 1. The toggle genuinely re-orders (US1, FR-001, A-11)

1. Open `/app/proof` — the inbox loads in **Newest** order (default unchanged).
2. Open the Sort control: **Warmest** is now selectable (no longer "coming soon").
3. Select **Warmest** — the Wall **re-orders** to a warmth ranking (a real change, not the same list).
4. Confirm a **granted, complete, un-clipped, recent** proof sits **above** an older / sparser /
   already-clipped one (e.g. a fresh video proof with a full quote and no clip outranks an
   already-clipped or quote-less one).
5. Switch back to **Newest** — the order returns to most-recent-first (byte-identical to step 1).

## 2. Withdrawn ranks cold but stays visible; count is stable (US2, P-VII, FR-005)

1. With a withdrawn-consent proof present (the fixtures include one), sort **Warmest**.
2. Confirm it ranks at/near the **bottom** (cold — below granted, content-ready proof) and is **still
   visible** in the inbox.
3. Confirm the **count** ("N of M pieces of proof") is **identical** to the Newest view under the same
   filters — warmth orders, never filters.
4. Apply a status/type/search filter, then toggle Warmest — warmth orders only the filtered set; the
   filtered count matches the Newest filtered count.

## 3. Opt-in laziness — the extra read never fires by default (Q3:A, FR-009)

1. Load `/app/proof` and stay on **Newest** — confirm (Network tab / server logs) that **no**
   clip-status action/read fires; the default render is the existing single `getProofs` read.
2. Toggle to **Warmest** — now the `getInboxClipStatus` action fires **once**; the un-tapped signal
   loads and the Wall re-sorts. Toggle Newest→Warmest again — it re-sorts **without** re-fetching
   (cached `tappedIds`).
3. (Honesty under latency) On a slow clip-status fetch, the order momentarily shows **Newest** (no
   fabricated warmth), then settles into warmth when the data arrives.

## 4. Honesty (FR-002/FR-008/FR-019)

1. Read the warmth control's copy — it frames Warmest as **content-readiness** (recent · has a full
   quote or media · not yet clipped) and explicitly **not** a view/engagement/conversion prediction.
2. Confirm there is **no per-proof warmth number or badge** on the cards (Q2:A) — `ProofCard` is
   unchanged.

## 5. Determinism & edges (FR-007, Edge Cases)

- Re-sort Warmest repeatedly — the order is **identical** each time (ties resolved by recency then id).
- Empty inbox: the sort control is present but inert (nothing to order); no error.
- All-equal inputs: Warmest degrades to recency order; no crash, no fake spread.

## 6. Byte-stability & build (FR-009)

- Diff confirms **no** change to `getProofs` / `ProofView` / `ProofCard` / `inbox-wall.tsx` /
  `inbox-data.tsx`, `getLibraryClips` / `getProofClips` / `getShowcase` / `getClip*`, `generateClip` /
  `generateBatch`, the nav rail, or any migration; the **default Newest order** is byte-identical.
- `npm run build` + `npm run lint` green (without `DATABASE_URL`); `git diff package.json
  package-lock.json` shows **no new dependency**.
