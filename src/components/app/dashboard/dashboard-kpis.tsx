import type { DashboardSummary, LatestClipDescriptor } from "@/db/queries";

// The KPI strip (T2.1), ported from screen 01's 4-up masthead row. Every value
// comes from the computed DashboardSummary contract — never hardcoded. The
// "clips made" cell reads clipsThisMonth (honest 0 until T2.4) and the fourth
// slot shows the latest OWNED clip with NO view/engagement figure (Weavova owns
// no platform analytics in v1 — FR-019 / A-09).

function KpiCell({
  value,
  label,
  sub,
}: {
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <span className="font-display text-display-lg text-ink">{value}</span>
      <span className="font-ui text-heading-sm text-ink">{label}</span>
      <span className="font-mono text-mono-sm uppercase tracking-wide text-ink-3">
        {sub}
      </span>
    </div>
  );
}

function LatestClipCell({ clip }: { clip: LatestClipDescriptor | null }) {
  // No views/engagement field — owned descriptors only.
  return (
    <div className="flex flex-col gap-1 px-5 py-4">
      <span className="font-display text-display-lg text-ink">
        {clip ? clip.customerName : "No clips yet"}
      </span>
      <span className="font-ui text-heading-sm text-ink">latest clip</span>
      <span className="font-mono text-mono-sm uppercase tracking-wide text-ink-3">
        {clip ? "made in your studio" : "make one from a proof"}
      </span>
    </div>
  );
}

export function DashboardKpis({ summary }: { summary: DashboardSummary }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-clip border border-hairline bg-card shadow-clip md:grid-cols-4 [&>*]:border-hairline [&>*:not(:nth-child(1)):not(:nth-child(2))]:border-t md:[&>*]:border-t-0 [&>*:nth-child(2n)]:border-l md:[&>*:not(:first-child)]:border-l">
      <KpiCell value={String(summary.proofThisWeek)} label="proof collected" sub="this week" />
      <KpiCell value={String(summary.clipsThisMonth)} label="clips made" sub="this month" />
      <KpiCell value={String(summary.needsReview)} label="awaiting you" sub="needs review" />
      <LatestClipCell clip={summary.latestClip} />
    </dl>
  );
}
