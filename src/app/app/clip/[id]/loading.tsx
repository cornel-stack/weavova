import { ClipDetailSkeleton } from "@/components/app/clip-detail/clip-detail-skeleton";

// Route-segment loading fallback (T3.2): covers client navigations into
// /app/clip/[id] and the page's own await, complementing the in-page Suspense. Same
// skeleton, so the loading surface is seamless.

export default function Loading() {
  return <ClipDetailSkeleton />;
}
