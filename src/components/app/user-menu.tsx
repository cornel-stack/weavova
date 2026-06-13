"use client";

import { LogOut, Settings } from "lucide-react";
import type { ChromeUser } from "./app-chrome";
import { Popover } from "./popover";

// Dependency-free token popover for the stub user. Settings / Sign out are inert
// this slice (real identity is T6, settings T9).
export function UserMenu({ user }: { user: ChromeUser }) {
  return (
    <Popover
      align="end"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="menu"
          title={user.name}
          className="flex size-8 items-center justify-center rounded-pill bg-sunken font-ui text-body-sm font-medium text-ink transition-colors duration-200 ease-pressroom hover:bg-rule"
        >
          {user.initials}
        </button>
      )}
    >
      {() => (
        <div className="w-56 rounded-modal border border-hairline bg-card p-2 shadow-modal">
          <div className="px-2 py-2">
            <div className="font-ui text-body-sm font-medium text-ink">
              {user.name}
            </div>
            {user.email && (
              <div className="font-ui text-body-sm text-ink-3">
                {user.email}
              </div>
            )}
          </div>
          <div className="my-1 border-t border-hairline" />
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex w-full items-center gap-2 rounded-control px-2 py-2 font-ui text-body-sm text-ink-3"
          >
            <Settings className="size-4" strokeWidth={1.5} aria-hidden />
            Settings
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex w-full items-center gap-2 rounded-control px-2 py-2 font-ui text-body-sm text-ink-3"
          >
            <LogOut className="size-4" strokeWidth={1.5} aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </Popover>
  );
}
