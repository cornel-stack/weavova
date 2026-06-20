"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import type { LibraryClipView } from "@/lib/clip";
import { LibraryClipCard } from "./library-clip-card";

// The Library grid (T3.1 + T4-B4). A responsive CSS multi-column collection
// (columns-1 → 2 → 3) of clip cards, newest first — the inbox Wall's masonry approach,
// no JS masonry dependency. The header shows an HONEST owned count = the number of
// consent-visible clips (the list is already withdrawal-filtered by getLibraryClips).
//
// SELECTION MODE (T4-B4): when `selecting`, each byte-unchanged LibraryClipCard is
// wrapped in a `relative` container with a SIBLING full-cover toggle overlay (the B1
// InboxWall pattern) — a click anywhere toggles selection and suppresses the card's
// clip-detail link. Every Library clip is consent-visible (already withdrawal-filtered),
// so every card is selectable — no "needs consent" branch here. The card's props/shape
// are UNCHANGED (FR-009); `headerAction` (the Select/Done toggle) is an additive,
// optional header sibling and the count markup is byte-stable.

function countLabel(n: number): string {
  return n === 1 ? "1 clip" : `${n} clips`;
}

export function LibraryGrid({
  clips,
  selecting = false,
  selected,
  onToggleClip,
  headerAction,
}: {
  clips: LibraryClipView[];
  selecting?: boolean;
  selected?: ReadonlySet<string>;
  onToggleClip?: (id: string) => void;
  headerAction?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-display-lg text-ink">Library</h1>
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-mono-sm text-ink-3">
            {countLabel(clips.length)}
          </span>
          {headerAction}
        </div>
      </header>

      <div className="mt-8 columns-1 gap-6 sm:columns-2 lg:columns-3">
        {clips.map((clip) => {
          const isSelected = selected?.has(clip.id) ?? false;
          return (
            <div
              key={clip.id}
              className={`mb-6 break-inside-avoid ${selecting ? "relative" : ""}`}
            >
              <LibraryClipCard clip={clip} />

              {/* selection overlay — covers the card link so a click toggles select */}
              {selecting && (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  aria-label={`Select ${clip.customerName}'s clip`}
                  onClick={() => onToggleClip?.(clip.id)}
                  className={`absolute inset-0 z-30 rounded-clip ring-inset transition-shadow duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
                    isSelected
                      ? "ring-2 ring-ink"
                      : "ring-0 hover:ring-1 hover:ring-rule"
                  }`}
                >
                  <span
                    className={`absolute right-3 top-3 flex size-6 items-center justify-center rounded-pill border ${
                      isSelected
                        ? "border-ink bg-ink text-paper"
                        : "border-rule bg-card text-transparent"
                    }`}
                  >
                    <Check className="size-4" strokeWidth={2} aria-hidden />
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
