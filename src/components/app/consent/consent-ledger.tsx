"use client";

import { useMemo, useState } from "react";
import type { ConsentLedgerEntry } from "@/lib/consent";
import type { ConsentState } from "@/lib/proof";
import { ConsentDetailPanel } from "./consent-detail-panel";

// The consent ledger (Client, T5-Consent), ported from /design-reference screen 13:
// a table of every proof's consent — Customer · purpose + version · captured ·
// current effective status — with status filter chips. The status enum value
// 'revoked' is labelled "Withdrawn" (honest copy — the customer withdrew). Opening a
// row reveals the derived detail panel (history timeline + made-under provenance +,
// for a granted proof, the Record-withdrawal action). No fabricated values; the count
// is the real number of rows shown.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

// UI labels + dots — 'revoked' reads "Withdrawn" (the customer withdrew).
const STATE_LABEL: Record<ConsentState, string> = {
  granted: "Granted",
  awaiting: "Awaiting",
  revoked: "Withdrawn",
};

const STATE_DOT: Record<ConsentState, string> = {
  granted: "bg-success",
  awaiting: "bg-warning",
  revoked: "bg-danger",
};

type Filter = "all" | ConsentState;

const FILTER_CHIPS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "granted", label: "Granted" },
  { value: "awaiting", label: "Awaiting" },
  { value: "revoked", label: "Withdrawn" },
];

export function ConsentLedger({ entries }: { entries: ConsentLedgerEntry[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openProofId, setOpenProofId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      filter === "all" ? entries : entries.filter((e) => e.state === filter),
    [entries, filter],
  );

  const openEntry = openProofId
    ? entries.find((e) => e.proofId === openProofId) ?? null
    : null;

  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <h1 className="font-display text-display-lg text-ink">
          Consent &amp; rights
        </h1>
        <span className="font-mono text-mono-sm text-ink-3">
          {visible.length} of {entries.length}
        </span>
      </header>

      {/* status filter chips (ported screen-13 cluster) */}
      <div
        role="group"
        aria-label="Filter by consent state"
        className="mt-6 flex flex-wrap items-center gap-2"
      >
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={() => setFilter(chip.value)}
            aria-pressed={filter === chip.value}
            className={`rounded-pill px-3 py-1 font-ui text-body-sm transition-colors duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              filter === chip.value
                ? "bg-ink text-paper"
                : "border border-hairline text-ink-2 hover:border-rule hover:text-ink"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* the ledger table */}
      <div className="mt-6 overflow-hidden rounded-clip border border-hairline bg-card shadow-clip">
        <div className="hidden grid-cols-[1fr_auto_auto] gap-4 border-b border-hairline px-5 py-3 font-ui text-label uppercase tracking-wide text-ink-3 sm:grid">
          <span>Customer</span>
          <span>Captured</span>
          <span className="text-right">Status</span>
        </div>

        {visible.map((entry) => {
          const isOpen = entry.proofId === openProofId;
          return (
            <div key={entry.proofId} className="border-b border-hairline last:border-b-0">
              <button
                type="button"
                onClick={() =>
                  setOpenProofId(isOpen ? null : entry.proofId)
                }
                aria-expanded={isOpen}
                className={`grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink sm:grid-cols-[1fr_auto_auto] ${
                  isOpen ? "bg-sunken" : ""
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-sunken font-ui text-body-sm font-medium text-ink-2">
                    {initials(entry.customerName)}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-ui text-body-sm font-medium text-ink">
                      {entry.customerName}
                    </span>
                    <span className="truncate font-mono text-mono-sm text-ink-3">
                      {entry.purpose}
                      {entry.currentVersion != null && ` · v${entry.currentVersion}`}
                    </span>
                  </span>
                </span>

                <span className="hidden font-mono text-mono-sm text-ink-3 sm:block">
                  {formatDate(entry.effectiveAt)}
                </span>

                <span className="flex items-center justify-end gap-2 font-ui text-body-sm text-ink">
                  <span
                    className={`size-2 rounded-pill ${STATE_DOT[entry.state]}`}
                    aria-hidden
                  />
                  {STATE_LABEL[entry.state]}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-hairline bg-paper px-5 py-5">
                  <ConsentDetailPanel
                    proofId={entry.proofId}
                    customerName={entry.customerName}
                    state={entry.state}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {openEntry === null && visible.length === 0 && (
        <p className="mt-6 font-ui text-body-sm text-ink-3">
          No consent records match this filter.
        </p>
      )}
    </div>
  );
}
