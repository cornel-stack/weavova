import { ShowcaseSkeleton } from "@/components/app/showcase/showcase-skeleton";

// Route-segment loading fallback (T-Showcase): covers client navigations into
// /app/showcase and the page's own await, complementing the in-page Suspense. Same
// skeleton, so the loading surface is seamless.

export default function Loading() {
  return <ShowcaseSkeleton />;
}
