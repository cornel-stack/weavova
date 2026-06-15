"use client";

import { useMemo, useState } from "react";
import type { ProofView } from "@/lib/proof";
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

export function InboxClient({ proofs }: { proofs: ProofView[] }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

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

    // sort: "newest" → capturedAt descending (ISO strings compare chronologically).
    // "warmest" is disabled and never a value here, so it is never applied.
    return [...filtered].sort((a, b) =>
      sort === "newest" ? b.capturedAt.localeCompare(a.capturedAt) : 0,
    );
  }, [proofs, status, type, search, sort]);

  function clearFilters() {
    setStatus("all");
    setType("all");
    setSearch("");
  }

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <InboxToolbar
        status={status}
        type={type}
        search={search}
        sort={sort}
        counts={{ shown: visible.length, total: proofs.length }}
        onStatusChange={setStatus}
        onTypeChange={setType}
        onSearchChange={setSearch}
        onSortChange={setSort}
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
        <InboxWall proofs={visible} />
      )}
    </div>
  );
}
