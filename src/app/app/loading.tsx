import { DashboardSkeleton } from "@/components/app/dashboard/dashboard-skeleton";

// Route-segment loading fallback (T2.1): covers client navigations into /app and
// the page's own await, complementing the in-page Suspense. Same skeleton, so
// the loading surface is seamless.

export default function Loading() {
  return <DashboardSkeleton />;
}
