import { LibrarySkeleton } from "@/components/app/library/library-skeleton";

// Route-segment loading fallback (T3.1): covers client navigations into
// /app/library and the page's own await, complementing the in-page Suspense. Same
// skeleton, so the loading surface is seamless.

export default function Loading() {
  return <LibrarySkeleton />;
}
