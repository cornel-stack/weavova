"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { exportClips } from "@/app/app/library/actions";
import type { BulkExportResult } from "@/lib/export";

// The Library selection-action bar (T4-B4, Client) — the B1 InboxSelectionBar layout,
// simpler (export is read-only, so NO format picker). Appears in selection mode: the
// selected count, "Select all", and "Export selected" — disabled while pending (no
// double-submit). On export it calls the exportClips Server Action (which RE-READS
// consent at action time — P-VII) and DOWNLOADS the returned ONE JSON manifest via a
// native Blob + anchor (no dependency, no zip). It then shows the HONEST tally
// (exported / skipped+reason) — no all-or-nothing, no fabricated success (FR-019).

function downloadManifest(filename: string, manifest: string) {
  const blob = new Blob([manifest], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function LibrarySelectionBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onExit,
}: {
  selectedIds: string[];
  totalCount: number;
  onSelectAll: () => void;
  onExit: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<BulkExportResult | null>(null);
  const [errored, setErrored] = useState(false);

  const count = selectedIds.length;

  async function onExport() {
    if (pending || count === 0) return;
    setPending(true);
    setResult(null);
    setErrored(false);
    try {
      const res = await exportClips({ clipIds: selectedIds });
      // Only download when something was genuinely exported (honest — no empty file).
      if (res.made > 0) {
        downloadManifest(res.filename, res.manifest);
      }
      setResult(res);
    } catch {
      setErrored(true);
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
            onClick={onSelectAll}
            className="font-ui text-body-sm text-ink-2 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Select all ({totalCount})
          </button>

          <button
            type="button"
            onClick={onExport}
            disabled={pending || count === 0}
            aria-busy={pending}
            className="ml-auto inline-flex items-center gap-2 rounded-control bg-persimmon px-4 py-2 font-ui text-body-sm font-medium text-on-accent transition-colors duration-200 ease-pressroom hover:bg-persimmon-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="size-4" strokeWidth={1.5} aria-hidden />
            {pending
              ? "Exporting…"
              : `Export ${count} clip${count === 1 ? "" : "s"}`}
          </button>

          <button
            type="button"
            onClick={onExit}
            className="font-ui text-body-sm text-ink-3 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Cancel
          </button>
        </div>

        {/* honest result — no all-or-nothing, no fabricated success */}
        {(result || errored) && (
          <p
            className="font-ui text-body-sm text-ink-2"
            role="status"
            aria-live="polite"
          >
            {errored ? (
              <span className="text-ink">Couldn&rsquo;t export — try again</span>
            ) : (
              result && (
                <>
                  <span className="font-medium text-ink">
                    {result.made} exported
                  </span>
                  {result.skipped > 0 && (
                    <> · {result.skipped} skipped · needs consent</>
                  )}
                </>
              )
            )}
          </p>
        )}
      </div>
    </div>
  );
}
