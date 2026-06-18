"use client";

import { useState } from "react";
import { Scissors } from "lucide-react";
import type { ClipFormat } from "@/lib/clip";
import { FORMAT_OPTIONS, type BatchResult } from "@/lib/studio";
import { generateBatch } from "@/app/app/proof/actions";

// The batch selection-action bar (T4-B1, Client). Appears in selection mode: the
// selected count, "Select all ready", the ONE batch format picker (Q1), and "Make
// clips" — disabled while pending (no double-submit). On generate it calls the
// generateBatch Server Action (which re-checks consent per proof — P-VII) and shows
// the HONEST per-proof result (made / skipped+reason / failed) — no all-or-nothing,
// no fabricated success (FR-019). Owned counts only.

export function InboxSelectionBar({
  selectedIds,
  readyCount,
  format,
  onFormatChange,
  onSelectAllReady,
  onExit,
}: {
  selectedIds: string[];
  readyCount: number;
  format: ClipFormat;
  onFormatChange: (value: ClipFormat) => void;
  onSelectAllReady: () => void;
  onExit: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);

  const count = selectedIds.length;

  async function onMakeClips() {
    if (pending || count === 0) return;
    setPending(true);
    setResult(null);
    try {
      const res = await generateBatch({ proofIds: selectedIds, format });
      setResult(res);
    } catch {
      setResult({
        made: 0,
        skipped: 0,
        failed: count,
        items: selectedIds.map((proofId) => ({ proofId, status: "error" })),
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="sticky bottom-4 z-40 mt-8">
      <div className="mx-auto flex max-w-content flex-col gap-3 rounded-clip border border-rule bg-card p-4 shadow-modal">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-ui text-body-sm font-medium text-ink">
            {count} selected
          </span>

          <button
            type="button"
            onClick={onSelectAllReady}
            className="font-ui text-body-sm text-ink-2 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Select all ready ({readyCount})
          </button>

          <label className="ml-auto inline-flex items-center gap-2 rounded-control border border-hairline bg-card px-3 py-1.5 font-ui text-body-sm text-ink-2 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
            <span className="text-ink-3">Format ·</span>
            <select
              value={format}
              onChange={(e) => onFormatChange(e.target.value as ClipFormat)}
              className="bg-card font-ui text-body-sm font-medium text-ink focus:outline-none"
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={onMakeClips}
            disabled={pending || count === 0}
            aria-busy={pending}
            className="inline-flex items-center gap-2 rounded-control bg-persimmon px-4 py-2 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Scissors className="size-4" strokeWidth={1.5} aria-hidden />
            {pending ? "Making…" : `Make ${count} clip${count === 1 ? "" : "s"}`}
          </button>

          <button
            type="button"
            onClick={onExit}
            className="font-ui text-body-sm text-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Cancel
          </button>
        </div>

        {/* honest per-proof result — no all-or-nothing, no fabricated success */}
        {result && (
          <p className="font-ui text-body-sm text-ink-2" role="status" aria-live="polite">
            <span className="font-medium text-ink">
              {result.made} clip{result.made === 1 ? "" : "s"} made
            </span>
            {result.skipped > 0 && <> · {result.skipped} skipped · needs consent</>}
            {result.failed > 0 && (
              <> · {result.failed} couldn&rsquo;t be made — try again</>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
