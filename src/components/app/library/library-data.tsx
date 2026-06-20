import { getLibraryClips } from "@/db/queries";
import { LibraryClient } from "./library-client";
import { LibraryEmpty } from "./library-empty";

// The Library data integrator (async Server, T3.1 + T4-B4). One workspace-scoped read
// (getLibraryClips is withDbRetry-wrapped; a transient cold start is retried
// transparently behind the skeleton, a genuine failure throws to error.tsx). The
// read is already consent-withdrawal-filtered (P-VII), so an empty result means
// "no visible clips" — zero generated OR all withheld, handled IDENTICALLY by the
// honest empty state (no oracle that withheld clips exist).
//
// T4-B4: the non-empty branch now renders LibraryClient (the bulk-export selection
// island) instead of LibraryGrid directly — LibraryClient owns selection state and
// renders the same grid. The read + the empty-state path are byte-unchanged.

export async function LibraryData({ workspaceId }: { workspaceId: string }) {
  const clips = await getLibraryClips(workspaceId);

  if (clips.length === 0) {
    return <LibraryEmpty />;
  }

  return <LibraryClient clips={clips} />;
}
