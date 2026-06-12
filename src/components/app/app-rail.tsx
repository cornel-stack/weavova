"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

// The left navigation rail, ported from the chrome around screens 05–13.
// Quiet: token active state (sunken), never persimmon. Optional onNavigate is
// used by the mobile drawer (T010) to close itself on selection.
export function AppRail({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 px-3 py-5">
      <Link
        href="/app"
        onClick={onNavigate}
        className="mb-4 px-2 font-display text-display-sm text-ink"
      >
        Weavova
      </Link>
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-control px-3 py-2 font-ui text-body-sm transition-colors duration-200 ease-pressroom ${
              active
                ? "bg-sunken text-ink"
                : "text-ink-2 hover:bg-sunken hover:text-ink"
            }`}
          >
            <Icon className="size-4" strokeWidth={1.5} aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
