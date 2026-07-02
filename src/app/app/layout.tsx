import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppChrome } from "@/components/app/app-chrome";
import { getCurrentWorkspace, getSession } from "@/lib/session";

// The shell reads the current workspace from the DB, so the whole /app subtree
// is dynamic. With the lazy db client, `next build` / CI stay green without a
// DATABASE_URL (the route is server-rendered on demand).
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const [session, workspace] = await Promise.all([
    getSession(),
    getCurrentWorkspace(),
  ]);

  // T6.2 — the onboarding FORWARD gate (Layer 2, the DB-reading chokepoint; middleware
  // stays DB-free). A workspace that hasn't finished onboarding (onboarded_at IS NULL — the
  // T6.1 seam, already carried on the Workspace) is routed into the wizard before any app
  // surface renders. Onboarded workspaces (incl. the seeded Lumen owner) fall straight
  // through — byte-stable. getCurrentWorkspace() already selects onboarded_at, so this is a
  // free read (session.ts untouched).
  if (workspace.onboardedAt == null) {
    redirect("/onboard/role");
  }

  // Pass only name/slug — never the workspace id — into the chrome.
  return (
    <AppChrome
      user={session.user}
      workspace={{ name: workspace.name, slug: workspace.slug }}
    >
      {children}
    </AppChrome>
  );
}
