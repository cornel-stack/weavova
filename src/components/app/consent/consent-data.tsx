import { getConsentLedger } from "@/db/queries";
import { ConsentEmpty } from "./consent-empty";
import { ConsentLedger } from "./consent-ledger";

// The consent data integrator (async Server, T5-Consent). One workspace-scoped read
// (getConsentLedger is withDbRetry-wrapped; a transient cold start is retried
// transparently behind the skeleton, a genuine failure throws to error.tsx). The
// ledger lists EVERY proof in every consent state (the surface shows all states; the
// status chips filter client-side) — so an empty result means the workspace has no
// proof at all, handled by the honest empty state.

export async function ConsentData({ workspaceId }: { workspaceId: string }) {
  const entries = await getConsentLedger(workspaceId);

  if (entries.length === 0) {
    return <ConsentEmpty />;
  }

  return <ConsentLedger entries={entries} />;
}
