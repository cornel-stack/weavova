"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AppRail } from "./app-rail";
import { AppTopBar } from "./app-top-bar";
import { CommandPalette } from "./command-palette";
import { WorkspaceSwitcher } from "./workspace-switcher";

export type ChromeUser = { name: string; initials: string; email?: string };
export type ChromeWorkspace = { name: string; slug: string };

type Props = {
  user: ChromeUser;
  workspace: ChromeWorkspace;
  children: ReactNode;
};

// The single client chrome island. Owns the command-palette open state + the
// ⌘K listener; renders the rail, top bar, palette, and the page content. The
// rail/top-bar/palette are wired in by their own tasks (T007/T008/T011).
export function AppChrome({ user, workspace, children }: Props) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (e.key === "Escape") {
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* left rail (desktop) */}
      <aside className="hidden w-60 shrink-0 border-r border-hairline bg-card md:block">
        <AppRail />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar
          workspace={workspace}
          user={user}
          paletteOpen={paletteOpen}
          onOpenPalette={() => setPaletteOpen(true)}
          onOpenDrawer={() => setDrawerOpen(true)}
          workspaceTrigger={<WorkspaceSwitcher workspace={workspace} />}
        />

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* mobile rail drawer (a derivation — the reference is desktop) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-ink/30"
          />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-hairline bg-card shadow-lift">
            <AppRail onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}
    </div>
  );
}
