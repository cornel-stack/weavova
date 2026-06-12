"use client";

import { Command } from "cmdk";
import { Inbox, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

const ACTIONS = [
  { label: "Request proof", href: "/app/requests", icon: Send },
  { label: "Make a clip", href: "/app/proof", icon: Inbox },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={onOpenChange}
      label="Command menu"
    >
      <Command.Input placeholder="Search or jump…" />
      <Command.List>
        <Command.Empty>No results.</Command.Empty>

        <Command.Group heading="Go to">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Command.Item
                key={item.href}
                value={`Go to ${item.label}`}
                onSelect={() => go(item.href)}
              >
                <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                {item.label}
              </Command.Item>
            );
          })}
        </Command.Group>

        <Command.Group heading="Actions">
          {ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Command.Item
                key={action.label}
                value={action.label}
                onSelect={() => go(action.href)}
              >
                <Icon className="size-4" strokeWidth={1.5} aria-hidden />
                {action.label}
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
