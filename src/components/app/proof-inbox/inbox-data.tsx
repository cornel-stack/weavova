import { getProofs } from "@/db/queries";
import { InboxClient } from "./inbox-client";
import { InboxEmpty } from "./inbox-empty";

// The data integrator (async Server, T2.2). Performs the single workspace-scoped
// read inside the page's Suspense boundary (getProofs is wrapped in withDbRetry,
// so a transient Neon cold start is retried transparently behind the skeleton;
// a genuine failure throws to the page error boundary). Branches: a workspace
// with zero proof renders the honest no-proof empty state; otherwise the full
// ProofView[] is handed to the Client island, which owns the toolbar state and
// computes filtering / sorting / searching / counts in memory.

export async function InboxData({ workspaceId }: { workspaceId: string }) {
  const proofs = await getProofs(workspaceId);

  if (proofs.length === 0) {
    return <InboxEmpty />;
  }

  return <InboxClient proofs={proofs} />;
}
