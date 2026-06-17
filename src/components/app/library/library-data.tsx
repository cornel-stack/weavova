import { getLibraryClips } from "@/db/queries";
import { LibraryEmpty } from "./library-empty";
import { LibraryGrid } from "./library-grid";

// The Library data integrator (async Server, T3.1). One workspace-scoped read
// (getLibraryClips is withDbRetry-wrapped; a transient cold start is retried
// transparently behind the skeleton, a genuine failure throws to error.tsx). The
// read is already consent-withdrawal-filtered (P-VII), so an empty result means
// "no visible clips" — zero generated OR all withheld, handled IDENTICALLY by the
// honest empty state (no oracle that withheld clips exist).

export async function LibraryData({ workspaceId }: { workspaceId: string }) {
  const clips = await getLibraryClips(workspaceId);

  if (clips.length === 0) {
    return <LibraryEmpty />;
  }

  return <LibraryGrid clips={clips} />;
}
