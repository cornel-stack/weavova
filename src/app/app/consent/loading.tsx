import { ConsentSkeleton } from "@/components/app/consent/consent-skeleton";

// Route-segment loading fallback (T5-Consent): covers client navigations into
// /app/consent and the page's own await, complementing the in-page Suspense. Same
// skeleton, so the loading surface is seamless.

export default function Loading() {
  return <ConsentSkeleton />;
}
