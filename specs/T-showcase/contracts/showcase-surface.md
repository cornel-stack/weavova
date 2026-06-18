# Contract — Showcase surface (route + components)

Replaces the `/app/showcase` T1 placeholder with the curate/preview wall, inside the existing AppChrome.
Ports the **owned half** of `/design-reference` screen 10 "Showcase manager".

## Route segment

```text
src/app/app/showcase/
├── page.tsx        # Server (REPLACES placeholder): workspace = getCurrentWorkspace();
│                   #   <Suspense fallback={<ShowcaseSkeleton/>}><ShowcaseData workspaceId/></Suspense>
│                   #   export const metadata = { title: "Showcase — Weavova" }  (inherits /app force-dynamic + AppChrome)
├── loading.tsx     # Server → <ShowcaseSkeleton/>
└── error.tsx       # "use client" boundary → <ErrorState onRetry={reset}/>  (no raw text) — the ONLY client file
```

## Components (`src/components/app/showcase/`)

- **`showcase-data.tsx`** (async Server): `items = await getShowcase(workspace.id)`; `items.length === 0` →
  `<ShowcaseEmpty/>`, else `<ShowcaseWall items={items}/>`.
- **`showcase-wall.tsx`** (Server): a header (title "Showcase" + the **honest count** + a quiet, honest note
  that publishing/embedding arrives later) and the **public-style wall** — a "Wall of Love"-style responsive
  layout, **distinct** from the inbox masonry and the Library grid, newest-first, of `<ShowcaseItem>`.
- **`showcase-item.tsx`** (Server): discriminates on `kind`:
  - **proof** → a testimonial card: the customer's verbatim words/quote as the headline (P-II) + customer +
    the verified mark (when verified) + date.
  - **clip** → a clip card: the **non-playing sample/preview** still in the clip's format + format/hook +
    customer + verified mark + date.
  - **Owned data only; internal chrome OMITTED** — no consent dot, no "Unreviewed" stamp, no "Make" button (a
    public-style wall shows none of those). The whole item **links to its detail** — proof → `/app/proof/[id]`,
    clip → `/app/clip/[id]` (both exist; A-11-clean internal affordance, keyboard-focusable).
- **`showcase-empty.tsx`** (Server): the honest empty state (no fabricated rows/counts) — orients toward
  capturing proof / making clips (links to `/app/proof`). Reached for zero eligible **or** all-withheld.
- **`showcase-skeleton.tsx`** (Server): on-token loading skeleton mirroring the wall.

## A-11 — NOT rendered (hidden, not dead; asserted by inspection)

- Screen 10's **LIVE / "public set"** badges; the **"Add from library"** curation control + the proof picker
  (screen 18); the **Single highlight / Carousel / Wall of Love** layout/embed preset switchers; the embed
  **`<script>` snippet + "Copy embed"**; any **publish / "go live" / public URL / share** control.
- Any **view / reach / likes / social-proof / published-since** metric; any fabricated **LIVE/published**
  badge or "live since" date (FR-019).
- The curation + publish/embed **cluster defers to T9 as one coupled feature**.

## State set

| State | Source |
|---|---|
| Populated | `<ShowcaseWall>` — the public-style wall + honest count |
| Empty (honest) | `<ShowcaseEmpty>` — zero eligible OR all withheld; no fabricated rows/counts |
| Loading | `<ShowcaseSkeleton>` via `loading.tsx` + the page Suspense |
| Error | `error.tsx` → shared `<ErrorState>` (retry, no raw text); transient cold start retried by `getShowcase`'s `withDbRetry` |

## Assertions

- **P-II**: the wall *is* the customers — their words/faces lead; chrome quiet. **FR-019**: owned values only;
  clips shown as honest sample/preview. **P-VII**: visibility = the shared gate (parity with dashboard/
  Library/detail). **A-11**: only live-destination affordances (the per-item detail links) render; the
  distribution/curation cluster does not.
- **Byte-stable**: ProofCard (wall uses its **own** item, not ProofCard), `ProofView`/`getProofs`/`getProof`/
  `ProofDetailView`, `ClipView`/`LibraryClipView`/`ClipDetailView`, and all existing reads unchanged;
  `schema.ts` unchanged; AppChrome untouched. No new dependency.
