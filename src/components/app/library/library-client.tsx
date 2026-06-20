"use client";

import { useMemo, useState } from "react";
import { CheckSquare } from "lucide-react";
import type { LibraryClipView } from "@/lib/clip";
import { LibraryGrid } from "./library-grid";
import { LibrarySelectionBar } from "./library-selection-bar";

// The Library selection island (T4-B4) — the B1 InboxClient pattern applied to the
// Library. Receives the full consent-visible LibraryClipView[] from the Server (one
// read, byte-unchanged) and owns the bulk-export SELECTION state: `selecting`, the
// selected clip-id set, toggle/selectAll/exit. The selection overlay + the export
// action bar live in LibraryGrid / LibrarySelectionBar (the LibraryClipCard shape is
// byte-unchanged). Export re-checks consent at action time inside exportClips (P-VII).
//
// The "Select" entry is an additive header affordance (the Library has no toolbar
// today — a derived control, on-token, ink secondary). Nothing here changes the
// existing non-selecting render of the grid.

export function LibraryClient({ clips }: { clips: LibraryClipView[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => clips.map((c) => c.id), [clips]);

  function toggleSelecting() {
    setSelecting((s) => {
      if (s) setSelected(new Set()); // exiting selection clears the set
      return !s;
    });
  }

  function toggleClip(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allIds));
  }

  function exitSelection() {
    setSelected(new Set());
    setSelecting(false);
  }

  const selectToggle = (
    <button
      type="button"
      onClick={toggleSelecting}
      aria-pressed={selecting}
      className="inline-flex items-center gap-1.5 rounded-control border border-rule bg-card px-3 py-1.5 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <CheckSquare className="size-4" strokeWidth={1.5} aria-hidden />
      {selecting ? "Done" : "Select"}
    </button>
  );

  return (
    <>
      <LibraryGrid
        clips={clips}
        selecting={selecting}
        selected={selected}
        onToggleClip={toggleClip}
        headerAction={selectToggle}
      />

      {selecting && (
        <div className="mx-auto max-w-content px-6">
          <LibrarySelectionBar
            selectedIds={[...selected]}
            totalCount={clips.length}
            onSelectAll={selectAll}
            onExit={exitSelection}
          />
        </div>
      )}
    </>
  );
}
