import { ProofDetailSkeleton } from "@/components/app/proof-detail/proof-detail-skeleton";

// Route-segment loading fallback (T2.3): covers client navigations into
// /app/proof/[id] and the page's own await, complementing the in-page Suspense.
// Same skeleton, so the loading surface is seamless.

export default function Loading() {
  return <ProofDetailSkeleton />;
}
