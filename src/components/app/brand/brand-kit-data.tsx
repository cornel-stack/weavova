import { getBrandKit } from "@/db/queries";
import { DEFAULT_BRAND_COLOR, DEFAULT_FONTS } from "@/lib/brand-kit";
import { BrandKitEditor } from "./brand-kit-editor";

// The brand-kit data integrator (async Server, T5-BrandKit). One workspace-scoped read
// (getBrandKit is withDbRetry-wrapped; a transient cold start is retried transparently
// behind the skeleton, a genuine failure throws to error.tsx). When no kit exists yet,
// the editor opens with honest defaults (the Pressroom persimmon + the default fonts +
// NO logo) — a fresh kit to fill, never a fabricated one.

export async function BrandKitData({ workspaceId }: { workspaceId: string }) {
  const kit = await getBrandKit(workspaceId);

  const initial = kit ?? {
    name: null,
    logoAssetUrl: null,
    brandColor: DEFAULT_BRAND_COLOR,
    fonts: DEFAULT_FONTS,
  };

  return <BrandKitEditor initial={initial} />;
}
