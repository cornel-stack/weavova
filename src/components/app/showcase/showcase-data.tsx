import { getShowcase } from "@/db/queries";
import { ShowcaseEmpty } from "./showcase-empty";
import { ShowcaseWall } from "./showcase-wall";

// The Showcase data integrator (async Server, T-Showcase). One workspace-scoped read
// (getShowcase is withDbRetry-hardened; a transient cold start is retried transparently
// behind the skeleton, a genuine failure throws to error.tsx). The read is already
// consent-withdrawal-filtered (P-VII), so an empty result means "nothing visible" —
// zero eligible OR all withheld, handled IDENTICALLY by the honest empty state (no
// oracle that withheld items exist).

export async function ShowcaseData({ workspaceId }: { workspaceId: string }) {
  const items = await getShowcase(workspaceId);

  if (items.length === 0) {
    return <ShowcaseEmpty />;
  }

  return <ShowcaseWall items={items} />;
}
