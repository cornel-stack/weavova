"use client";

import { ChevronsUpDown, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import type { ChromeUser, ChromeWorkspace } from "./app-chrome";

// The top bar, ported from the Global chrome. Quiet. The workspace block opens
// the switcher (T013) and the avatar opens the user menu (T014); the search
// trigger opens the command palette.
export function AppTopBar({
  workspace,
  user,
  paletteOpen,
  onOpenPalette,
  workspaceTrigger,
  userTrigger,
}: {
  workspace: ChromeWorkspace;
  user: ChromeUser;
  paletteOpen: boolean;
  onOpenPalette: () => void;
  workspaceTrigger?: React.ReactNode;
  userTrigger?: React.ReactNode;
}) {
  const wsInitial = workspace.name.charAt(0).toUpperCase();

  return (
    <header className="flex h-14 items-center gap-3 border-b border-hairline bg-card px-4">
      {/* workspace block → switcher (T013 supplies the interactive trigger) */}
      {workspaceTrigger ?? (
        <span className="flex items-center gap-2 rounded-control px-2 py-1.5">
          <span className="flex size-6 items-center justify-center rounded-control bg-sunken font-display text-mono-sm text-ink">
            {wsInitial}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-ui text-body-sm font-medium text-ink">
              {workspace.name}
            </span>
            <span className="font-ui text-label uppercase tracking-wide text-ink-3">
              Pro workspace
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 text-ink-3" strokeWidth={1.5} aria-hidden />
        </span>
      )}

      {/* command-palette / search trigger */}
      <button
        type="button"
        aria-expanded={paletteOpen}
        onClick={onOpenPalette}
        className="ml-auto inline-flex items-center gap-2 rounded-control border border-rule px-3 py-1.5 font-ui text-body-sm text-ink-3 transition-colors duration-200 ease-pressroom hover:bg-sunken hover:text-ink-2"
      >
        <Search className="size-3.5" strokeWidth={1.5} aria-hidden />
        <span className="hidden sm:inline">Search or jump…</span>
        <kbd className="font-mono text-mono-sm">⌘K</kbd>
      </button>

      <ThemeToggle />

      {/* user menu (T014 supplies the interactive trigger) */}
      {userTrigger ?? (
        <span
          className="flex size-8 items-center justify-center rounded-pill bg-sunken font-ui text-body-sm font-medium text-ink"
          title={user.name}
        >
          {user.initials}
        </span>
      )}
    </header>
  );
}
