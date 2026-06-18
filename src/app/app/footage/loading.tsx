import { FootageSkeleton } from "@/components/app/brand-assets/footage-skeleton";

// Route-segment loading fallback (T4-B2): covers client navigations into
// /app/footage and the page's own await, complementing the in-page Suspense. Same
// skeleton, so the loading surface is seamless.

export default function Loading() {
  return <FootageSkeleton />;
}
