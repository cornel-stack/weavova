import type { ShowcaseItem as ShowcaseItemType } from "@/lib/showcase";
import { ShowcaseItem } from "./showcase-item";

// The Showcase wall (Server, T-Showcase), ported from the OWNED half of
// /design-reference screen 10. A public-style "wall of love" — a responsive CSS
// multi-column collection (distinct from the inbox masonry and the Library grid),
// newest-first, of consented proof + clips. The header carries an HONEST count (the
// list is already withdrawal-filtered by getShowcase — FR-005) and a quiet, honest
// note that publishing/embedding arrives later. Screen 10's distribution machinery
// (LIVE/"Add from library"/layout-embed presets/embed snippet/"Copy embed") is NOT
// rendered — that cluster defers to T9 (A-11).

function countLabel(n: number): string {
  return n === 1 ? "1 piece of proof" : `${n} pieces of proof`;
}

export function ShowcaseWall({ items }: { items: ShowcaseItemType[] }) {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="font-display text-display-lg text-ink">Showcase</h1>
          <span className="font-mono text-mono-sm text-ink-3">
            {countLabel(items.length)}
          </span>
        </div>
        <p className="font-ui text-body-sm text-ink-2">
          Your wall of consented proof. Publishing and embedding arrive later.
        </p>
      </header>

      <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {items.map((item) => (
          <div
            key={item.kind === "proof" ? `p-${item.proof.id}` : `c-${item.clip.id}`}
            className="mb-6 break-inside-avoid"
          >
            <ShowcaseItem item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
