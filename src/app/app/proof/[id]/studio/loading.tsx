import { StudioSkeleton } from "@/components/app/clip-studio/studio-skeleton";

// Route-segment loading fallback (T2.4b): covers client navigations into
// /app/proof/[id]/studio and the page's own await, complementing the in-page
// Suspense. Same skeleton, so the loading surface is seamless.

export default function Loading() {
  return <StudioSkeleton />;
}
