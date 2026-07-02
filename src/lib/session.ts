import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getDb } from "@/db/client";
import { withDbRetry } from "@/db/with-retry";
import { membership, users, workspace } from "@/db/schema";
import type { Workspace } from "@/db/queries";

// ============================================================================
// The auth / workspace seam. T6 swapped this module from a hardcoded stub to real
// Auth.js + workspace membership. Its SIGNATURES AND RETURN SHAPES ARE UNCHANGED,
// so every consumer (the FR-021 list) stays byte-stable — the swap is invisible to
// callers (Principle V). No component imports the db or hardcodes a workspace id;
// everything still scopes through getCurrentWorkspace().
// ============================================================================

export type Session = {
  user: {
    name: string;
    initials: string;
    email?: string;
  };
};

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "");
  return letters.join("") || name.slice(0, 2).toUpperCase();
}

// The signed-in user, mapped to the SAME shape the stub returned ({ name, initials,
// email }) so the chrome (layout → UserMenu, dashboard greeting) is byte-stable.
// Within /app the middleware guarantees a session; the redirect is a defensive
// fallback (never a half-rendered chrome).
export async function getSession(): Promise<Session> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const name = session.user.name ?? session.user.email ?? "Account";
  return {
    user: {
      name,
      initials: initialsFrom(name),
      email: session.user.email ?? undefined,
    },
  };
}

// The workspace the signed-in user belongs to (their single workspace in v1),
// resolved via membership by verified email. Returns the SAME `Workspace` type as
// before, so every caller is byte-stable. No session → redirect to sign-in (the
// new auth path). Session but no workspace → throw (a genuine data anomaly, caught
// by the existing root error boundary — the same behaviour the stub had when no
// workspace existed; provisioning in src/auth.ts makes this effectively unreachable).
export async function getCurrentWorkspace(): Promise<Workspace> {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const email = session.user.email;

  const ws = await withDbRetry(async () => {
    const rows = await getDb()
      .select({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        // T7.1 — carry the workspace display defaults so the returned Workspace matches
        // the (widened) full-row type. Inert today; the capture form (T7.2) reads them.
        defaultNameDisplay: workspace.defaultNameDisplay,
        defaultShowFace: workspace.defaultShowFace,
        // T6.1 — carry onboarded_at so the returned Workspace matches the (widened) full-row
        // type (Workspace = workspace.$inferSelect). Inert today; the onboarding wizard (a
        // later slice) reads it. No behavioural change — no current consumer reads this field.
        onboardedAt: workspace.onboardedAt,
        // T6.2 — carry business_type / first_format so the returned Workspace matches the
        // (widened) full-row type, and so the onboarding steps can PRE-FILL the merchant's
        // prior selections on resume. Inert for existing consumers (none read these). Same
        // Option-A pattern as onboarded_at above (add the column to the explicit select).
        businessType: workspace.businessType,
        firstFormat: workspace.firstFormat,
        createdAt: workspace.createdAt,
      })
      .from(membership)
      .innerJoin(users, eq(membership.userId, users.id))
      .innerJoin(workspace, eq(membership.workspaceId, workspace.id))
      .where(eq(users.email, email))
      .orderBy(asc(membership.createdAt))
      .limit(1);
    return rows[0] ?? null;
  });

  if (!ws) {
    throw new Error(
      "No workspace found for the signed-in user. New users are provisioned a workspace on sign-in (src/auth.ts events.signIn → bootstrapWorkspaceIfNeeded); the demo owner is seeded (npm run db:seed).",
    );
  }
  return ws;
}

// Layer-2 entry helper (FR-017): the single documented way a loader / Server Action
// resolves the workspace so it cannot read the db without a workspace scope. Today it
// delegates to getCurrentWorkspace(); kept distinct as the named multi-tenant-safety
// invariant entry. (Query functions already take an explicit workspaceId and filter
// on it — middleware protects ROUTES, this protects READS; both are required.)
export async function requireWorkspace(): Promise<Workspace> {
  return getCurrentWorkspace();
}
