import { getDefaultWorkspace, type Workspace } from "@/db/queries";

// ============================================================================
// The auth / workspace seam. This module is the ONLY place T6 swaps for real
// Auth.js + real workspace membership. No component hardcodes a workspace id or
// imports the db directly — everything scopes through getCurrentWorkspace().
// ============================================================================

export type StubSession = {
  user: {
    name: string;
    initials: string;
    email?: string;
  };
};

// Hardcoded stub signed-in user. There is no users table yet (that is T6).
export async function getSession(): Promise<StubSession> {
  return {
    user: {
      name: "Maya K.",
      initials: "MK",
      email: "maya@lumencandle.co",
    },
  };
}

// The current workspace = the seeded demo workspace (T0.3). At T6 this resolves
// from the authenticated user's membership instead.
export async function getCurrentWorkspace(): Promise<Workspace> {
  const ws = await getDefaultWorkspace();
  if (!ws) {
    throw new Error(
      "No workspace found. Run the T0.3 seed (npm run db:seed) to create the demo workspace.",
    );
  }
  return ws;
}
