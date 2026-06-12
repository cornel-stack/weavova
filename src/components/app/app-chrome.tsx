"use client";

import { useEffect, useState, type ReactNode } from "react";

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* rail region — replaced by <AppRail /> in T007 */}
      <aside className="hidden w-60 shrink-0 border-r border-hairline bg-card md:block">
        <div className="px-5 py-5 font-display text-display-sm text-ink">
          Weavova
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top-bar region — replaced by <AppTopBar /> in T008 */}
        <header className="flex h-14 items-center gap-4 border-b border-hairline bg-card px-5">
          <span className="font-ui text-body-sm text-ink-2">
            {workspace.name}
          </span>
          <button
            type="button"
            aria-expanded={paletteOpen}
            onClick={() => setPaletteOpen(true)}
            className="ml-auto inline-flex items-center gap-2 rounded-control border border-rule px-3 py-1.5 font-ui text-body-sm text-ink-3 hover:bg-sunken"
          >
            Search or jump…
            <kbd className="font-mono text-mono-sm">⌘K</kbd>
          </button>
          <span className="font-ui text-body-sm text-ink-2">{user.name}</span>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
