import { BrandKitSkeleton } from "@/components/app/brand/brand-kit-skeleton";

// Route-segment loading fallback (T5-BrandKit): covers client navigations into
// /app/brand and the page's own await, complementing the in-page Suspense.

export default function Loading() {
  return <BrandKitSkeleton />;
}
