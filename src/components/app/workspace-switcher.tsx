"use client";

import { Check, ChevronsUpDown, Plus } from "lucide-react";
import type { ChromeWorkspace } from "./app-chrome";
import { Popover } from "./popover";

// Ported from /design-reference screen 24. Dependency-free token popover. Shows
// the current demo workspace; "New workspace" is present but inert this slice.
export function WorkspaceSwitcher({
  workspace,
}: {
  workspace: ChromeWorkspace;
}) {
  const initial = workspace.name.charAt(0).toUpperCase();

  return (
    <Popover
      align="start"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-control px-2 py-1.5 transition-colors duration-200 ease-pressroom hover:bg-sunken"
        >
          <span className="flex size-6 items-center justify-center rounded-control bg-sunken font-display text-mono-sm text-ink">
            {initial}
          </span>
          <span className="hidden flex-col items-start leading-tight sm:flex">
            <span className="font-ui text-body-sm font-medium text-ink">
              {workspace.name}
            </span>
            <span className="font-ui text-label uppercase tracking-wide text-ink-3">
              Pro workspace
            </span>
          </span>
          <ChevronsUpDown
            className="size-3.5 text-ink-3"
            strokeWidth={1.5}
            aria-hidden
          />
        </button>
      )}
    >
      {() => (
        <div className="w-64 rounded-modal border border-hairline bg-card p-2 shadow-modal">
          <div className="px-2 py-1 font-ui text-label uppercase tracking-wide text-ink-3">
            Switch workspace
          </div>
          <div className="flex items-center gap-2 rounded-control bg-sunken px-2 py-2">
            <span className="flex size-6 items-center justify-center rounded-control bg-card font-display text-mono-sm text-ink">
              {initial}
            </span>
            <span className="font-ui text-body-sm text-ink">
              {workspace.name}
            </span>
            <Check
              className="ml-auto size-4 text-ink-2"
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="mt-1 flex w-full items-center gap-2 rounded-control px-2 py-2 font-ui text-body-sm text-ink-3"
          >
            <Plus className="size-4" strokeWidth={1.5} aria-hidden />
            New workspace
          </button>
        </div>
      )}
    </Popover>
  );
}
