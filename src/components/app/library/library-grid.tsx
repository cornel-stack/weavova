import type { LibraryClipView } from "@/lib/clip";
import { LibraryClipCard } from "./library-clip-card";

// The Library grid (Server, T3.1), ported from /design-reference screen 09. A
// responsive CSS multi-column collection (columns-1 → 2 → 3) of clip cards, newest
// first — the inbox Wall's masonry approach, no JS dependency. The header shows an
// HONEST owned count = the number of consent-visible clips (the list is already
// withdrawal-filtered by getLibraryClips — FR-007). No filters, no List/Grid toggle,
// no bulk-download, no Status column (A-11 — hidden, not dead).

function countLabel(n: number): string {
  return n === 1 ? "1 clip" : `${n} clips`;
}

export function LibraryGrid({ clips }: { clips: LibraryClipView[] }) {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-display-lg text-ink">Library</h1>
        <span className="font-mono text-mono-sm text-ink-3">
          {countLabel(clips.length)}
        </span>
      </header>

      <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {clips.map((clip) => (
          <div key={clip.id} className="mb-6 break-inside-avoid">
            <LibraryClipCard clip={clip} />
          </div>
        ))}
      </div>
    </div>
  );
}
