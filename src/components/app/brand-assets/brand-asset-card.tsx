import { Clapperboard } from "lucide-react";
import type { BrandAssetView } from "@/lib/brand-asset";
import { BRAND_ASSET_KIND_LABEL } from "@/lib/brand-asset";

// One brand-asset card in the footage store (Server, T4-B2). A DERIVED surface —
// no /design-reference screen exists for a footage store (T3.2 precedent). HONEST
// RENDERING (A-11): this is a METADATA card — a kind chip, the owner's label, the
// stored state, the date. It is NOT a video player and NOT a thumbnail: seeded
// fixtures are placeholder URLs and thumbnail/preview generation is media processing
// we don't have until T8, so emitting a <video>/<img> would be a broken/fake element.
// A brand asset is the brand's OWN footage — shown as owned, NEVER the verified-
// customer mark, NEVER a proof framing, NEVER counted as proof (FR-019 / P-II).

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function BrandAssetCard({ asset }: { asset: BrandAssetView }) {
  return (
    <div className="flex items-start gap-4 rounded-clip border border-hairline bg-card p-5 shadow-clip">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-control bg-sunken text-ink-2">
        <Clapperboard className="size-5" strokeWidth={1.5} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-pill bg-sunken px-2.5 py-0.5 font-ui text-label uppercase tracking-wide text-ink-2">
            {BRAND_ASSET_KIND_LABEL[asset.kind]}
          </span>
          <span className="ml-auto font-mono text-mono-sm text-ink-3">
            {formatDate(asset.createdAt)}
          </span>
        </div>
        <p className="mt-2 font-ui text-body font-medium text-ink">
          {asset.label}
        </p>
        {/* Honest owned framing — your footage, stored; not playable here (T8). */}
        <p className="mt-1 font-mono text-mono-sm text-ink-3">
          Your footage · stored
        </p>
      </div>
    </div>
  );
}
