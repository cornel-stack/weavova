import { InboxSkeleton } from "@/components/app/proof-inbox/inbox-skeleton";

// Route-segment loading fallback (T2.2): covers client navigations into
// /app/proof and the page's own await, complementing the in-page Suspense. Same
// skeleton, so the loading surface is seamless.

export default function Loading() {
  return <InboxSkeleton />;
}
