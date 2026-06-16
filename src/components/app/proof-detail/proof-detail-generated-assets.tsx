import { Film } from "lucide-react";
import type { ClipFormat, ClipView } from "@/lib/clip";

// The proof detail's "Generated assets" section (Server, T2.4a — the screen-03
// data finally arriving; T2.3 deferred it here). Lists the proof's clips from real
// data. Renders NOTHING when the list is empty (honest-empty/absent — no fabricated
// "· N"). Owned data only; the clip is an honest sample stand-in (no view metric,
// no claim of a real per-proof render until T8).

const FORMAT_LABEL: Record<ClipFormat, string> = {
  "9x16": "9:16",
  "1x1": "1:1",
  "4x5": "4:5",
  "16x9": "16:9",
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function ProofDetailGeneratedAssets({ clips }: { clips: ClipView[] }) {
  if (clips.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="font-ui text-label uppercase tracking-wide text-ink-3">
        Generated assets
      </h2>
      <ul className="mt-3 space-y-3">
        {clips.map((clip) => (
          <li
            key={clip.id}
            className="flex items-center gap-3 rounded-clip border border-hairline bg-card p-4 shadow-clip"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-sunken text-ink-2">
              <Film className="size-5" strokeWidth={1.5} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-ui text-body-sm font-medium text-ink">
                Clip · {FORMAT_LABEL[clip.format]}
              </p>
              <p className="font-mono text-mono-sm text-ink-3">
                Sample · {formatDate(clip.createdAt)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
