"use client";

import { Plus, Search } from "lucide-react";

// The screen-02 control surface (T2.2): the sub-header (title + inert actions),
// the status + type filter chips, the "Search proof" field, the sort control,
// and the count. All interactive state is owned by InboxClient and passed in via
// props/setters — this component is the presentation of that state.
//
// Port-completeness (A-11): "Newest" works / "Warmest" is a disabled "coming
// soon" option in the working sort; "Request proof" + "Add proof" are inert
// standalone entry-points. The Wall/List toggle, "Make clips", and "Select all
// ready" are NOT rendered (deferred whole to T4 — they are dead/undesigned or
// coupled to a selection model the byte-unchanged ProofCard does not carry).

export type StatusFilter = "all" | "new" | "reviewed" | "awaiting";
export type TypeFilter = "all" | "video" | "text" | "photo" | "audio";
// "warmest" is shown in the UI but DISABLED — it can never be a value here (the
// real warmth ranking is T4/B3, gated on a signal the schema does not carry).
export type SortKey = "newest";

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "awaiting", label: "Awaiting consent" },
];

const TYPE_CHIPS: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All types" },
  { value: "video", label: "Video" },
  { value: "text", label: "Text" },
  { value: "photo", label: "Photo" },
  { value: "audio", label: "Audio" },
];

function Chip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-pill px-3 py-1 font-ui text-body-sm transition-colors duration-200 ease-pressroom focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
        active
          ? "bg-ink text-paper"
          : "border border-hairline text-ink-2 hover:border-rule hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

export function InboxToolbar({
  status,
  type,
  search,
  sort,
  counts,
  onStatusChange,
  onTypeChange,
  onSearchChange,
  onSortChange,
}: {
  status: StatusFilter;
  type: TypeFilter;
  search: string;
  sort: SortKey;
  counts: { shown: number; total: number };
  onStatusChange: (value: StatusFilter) => void;
  onTypeChange: (value: TypeFilter) => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: SortKey) => void;
}) {
  return (
    <div>
      {/* sub-header: title + inert actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="font-display text-display-lg text-ink">Proof</h1>

        <div className="flex shrink-0 items-center gap-2 self-start">
          {/* Add proof — inert quiet secondary (ink outline). Standalone upload
              entry-point with a committed home (T4/B2); no-op, never errors. */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-control border border-rule bg-card px-4 py-2 font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <Plus className="size-4" strokeWidth={1.5} aria-hidden />
            Add proof
          </button>

          {/* Request proof — inert persimmon primary (the one accent action). */}
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-control bg-persimmon px-4 py-2 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Request proof
          </button>
        </div>
      </div>

      {/* chips + sort */}
      <div className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-3">
        <div
          role="group"
          aria-label="Filter by status"
          className="flex flex-wrap items-center gap-2"
        >
          {STATUS_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              active={status === chip.value}
              label={chip.label}
              onClick={() => onStatusChange(chip.value)}
            />
          ))}
        </div>

        <span className="mx-1 hidden h-5 w-px bg-hairline sm:block" aria-hidden />

        <div
          role="group"
          aria-label="Filter by type"
          className="flex flex-wrap items-center gap-2"
        >
          {TYPE_CHIPS.map((chip) => (
            <Chip
              key={chip.value}
              active={type === chip.value}
              label={chip.label}
              onClick={() => onTypeChange(chip.value)}
            />
          ))}
        </div>

        {/* sort — Newest working, Warmest disabled "coming soon" (A-11/FR-010) */}
        <label className="ml-auto inline-flex items-center gap-2 rounded-control border border-hairline bg-card px-3 py-1.5 font-ui text-body-sm text-ink-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
          <span className="text-ink-3">Sort ·</span>
          <select
            value={sort}
            onChange={(event) => {
              // "warmest" is disabled and unreachable; guard so sort is only ever
              // the working "newest" (no fabricated/proxy ordering — FR-019).
              if (event.target.value === "newest") onSortChange("newest");
            }}
            className="bg-card font-ui text-body-sm font-medium text-ink focus:outline-none"
          >
            <option value="newest">Newest</option>
            <option value="warmest" disabled>
              Warmest — coming soon
            </option>
          </select>
        </label>
      </div>

      {/* search */}
      <div className="mt-4">
        <div className="relative w-full max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3"
            strokeWidth={1.5}
            aria-hidden
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search proof"
            aria-label="Search proof"
            className="w-full rounded-control border border-hairline bg-card py-2 pl-9 pr-3 font-ui text-body-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          />
        </div>
      </div>

      {/* count — computed from data, never fabricated (FR-011) */}
      <p className="mt-4 font-ui text-body-sm text-ink-3">
        {counts.shown} of {counts.total} pieces of proof
      </p>
    </div>
  );
}
