import type { BrandAssetView } from "@/lib/brand-asset";
import { BrandAssetCard } from "./brand-asset-card";
import { FootageUpload } from "./footage-upload";

// The footage store surface (Server, T4-B2). A DERIVED surface — ports the Library
// shell pattern (header + count + collection) onto the Pressroom tokens; there is
// no /design-reference screen for a footage store (T3.2 precedent). Reusable owned
// footage: the upload widget is always present (you can upload from empty), and the
// stored assets list below as honest METADATA cards (never video/thumbnails — A-11).
// These are the brand's OWN assets — never shown or counted as customer proof
// (FR-019); supporting context, never the headline (P-II).

function countLabel(n: number): string {
  return n === 1 ? "1 asset" : `${n} assets`;
}

export function FootageStore({ assets }: { assets: BrandAssetView[] }) {
  return (
    <div className="mx-auto max-w-content px-6 py-10">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-display text-display-lg text-ink">Brand footage</h1>
          <p className="mt-1 font-ui text-body-sm text-ink-2">
            Your own clips — product video and b-roll — reusable across your
            proof.
          </p>
        </div>
        <span className="shrink-0 font-mono text-mono-sm text-ink-3">
          {countLabel(assets.length)}
        </span>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <FootageUpload />
        </div>

        <div className="lg:col-span-2">
          {assets.length === 0 ? (
            <div className="flex flex-col items-center rounded-clip border border-hairline bg-card px-6 py-16 text-center shadow-clip">
              <h2 className="font-display text-display-sm text-ink">
                No footage yet.
              </h2>
              <p className="mt-2 max-w-reading font-ui text-body text-ink-2">
                Upload your own product video or b-roll and it lands here, ready
                to attach to a proof.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <BrandAssetCard asset={asset} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
