"use client";

import { useCallback, useMemo, useState } from "react";
import { getInboxClipStatus } from "@/app/app/proof/warmth-actions";
import type { ClipFormat } from "@/lib/clip";
import type { ProofView } from "@/lib/proof";
import { DEFAULT_FORMAT } from "@/lib/studio";
import { sortByWarmth } from "@/lib/warmth";
import { InboxSelectionBar } from "./inbox-selection-bar";
import {
  InboxToolbar,
  type SortKey,
  type StatusFilter,
  type TypeFilter,
} from "./inbox-toolbar";
import { InboxWall } from "./inbox-wall";

// The Client island (T2.2). Receives the full workspace ProofView[] from the
// Server (one read) and owns the toolbar state, deriving the visible list +
// counts IN MEMORY (research D2) — instant interactions, no round-trips. The
// derivation is the pure transform documented in
// contracts/inbox-derivation.md: status → type → search (AND-combined), then
// sort. Counts are computed, never fabricated (FR-008/011/019).
//
// T4-B1: also owns BATCH SELECTION state — `selecting`, the selected proof-id set,
// and the one batch format. "Select all ready" selects only granted (visible)
// proofs; the selection overlay + action bar live in InboxWall / InboxSelectionBar
// (ProofCard byte-unchanged). Generate is the generateBatch Server Action (P-VII
// re-checked per proof there).

export function InboxClient({ proofs }: { proofs: ProofView[] }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  // warmth (T4-B3) — the un-tapped signal's clip-status is fetched OPT-IN-LAZILY:
  // tappedIds starts null and the action fires only on the first toggle to Warmest,
  // so the default Newest path never reads it. Cached after the first fetch.
  const [tappedIds, setTappedIds] = useState<Set<string> | null>(null);
  const [warmthLoading, setWarmthLoading] = useState(false);

  // batch selection
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [format, setFormat] = useState<ClipFormat>(DEFAULT_FORMAT);

  // Switch sort; on the FIRST switch to Warmest, lazily load the clip-status signal.
  // While in flight (tappedIds still null) the visible memo falls back to the Newest
  // order — never a partial warmth computed without the un-tapped fact. On failure,
  // leave tappedIds null → honest recency fallback (no crash). Cached: a later toggle
  // re-sorts without re-fetching.
  const handleSortChange = useCallback(
    (value: SortKey) => {
      setSort(value);
      if (value === "warmest" && tappedIds === null && !warmthLoading) {
        setWarmthLoading(true);
        getInboxClipStatus()
          .then((ids) => setTappedIds(new Set(ids)))
          .catch(() => {
            // honest recency fallback — warmth stays Newest-ordered, control re-enabled
          })
          .finally(() => setWarmthLoading(false));
      }
    },
    [tappedIds, warmthLoading],
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = proofs.filter((proof) => {
      // status (single-select): all → keep
      if (status === "new" && proof.reviewed) return false;
      if (status === "reviewed" && !proof.reviewed) return false;
      if (status === "awaiting" && proof.consentState !== "awaiting") return false;

      // type (single-select): all → keep
      if (type !== "all" && proof.proofType !== type) return false;

      // search: customer name + the proof's words + source, case-insensitive
      if (term) {
        const haystack =
          `${proof.customerName} ${proof.quote ?? proof.transcript ?? ""} ${proof.source}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });

    // Filter first (above), then order — so the visible COUNT is identical to the
    // Newest view of the same filters (warmth orders, never filters — FR-005/006).
    // Warmest applies ONLY once the un-tapped signal has loaded; while it is null
    // (in flight or failed) we fall back to the byte-identical Newest order — never a
    // fabricated warmth without the clip-status fact.
    if (sort === "warmest" && tappedIds !== null) {
      return sortByWarmth(filtered, tappedIds);
    }
    return [...filtered].sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  }, [proofs, status, type, search, sort, tappedIds]);

  // "ready" = visible proofs whose effective consent is granted (selectable).
  const readyIds = useMemo(
    () => visible.filter((p) => p.consentState === "granted").map((p) => p.id),
    [visible],
  );

  function clearFilters() {
    setStatus("all");
    setType("all");
    setSearch("");
  }

  function toggleSelecting() {
    setSelecting((s) => {
      if (s) setSelected(new Set()); // exiting selection clears the set
      return !s;
    });
  }

  function toggleProof(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllReady() {
    setSelected(new Set(readyIds));
  }

  function exitSelection() {
    setSelected(new Set());
    setSelecting(false);
  }

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <InboxToolbar
        status={status}
        type={type}
        search={search}
        sort={sort}
        warmthLoading={warmthLoading}
        counts={{ shown: visible.length, total: proofs.length }}
        selecting={selecting}
        onStatusChange={setStatus}
        onTypeChange={setType}
        onSearchChange={setSearch}
        onSortChange={handleSortChange}
        onToggleSelecting={toggleSelecting}
      />

      {/* Filtered-empty (distinct from the server no-proof-at-all state): the
          workspace has proof, but nothing matches the active filters/search. */}
      {visible.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-16 text-center shadow-clip">
          <h2 className="font-display text-display-sm text-ink">
            No proof matches those filters.
          </h2>
          <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
            Try a different status, type, or search term.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <InboxWall
          proofs={visible}
          selecting={selecting}
          selected={selected}
          onToggleProof={toggleProof}
        />
      )}

      {selecting && (
        <InboxSelectionBar
          selectedIds={[...selected]}
          readyCount={readyIds.length}
          format={format}
          onFormatChange={setFormat}
          onSelectAllReady={selectAllReady}
          onExit={exitSelection}
        />
      )}
    </div>
  );
}
