import type { ReactNode } from "react";
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
