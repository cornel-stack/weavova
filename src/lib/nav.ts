import {
  Inbox,
  LayoutDashboard,
  Library,
  Megaphone,
  Palette,
  Send,
  ShieldCheck,
  Star,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

// The eight rail/palette destinations, in the /design-reference chrome order.
// Shared by the rail (active state) and the command palette ("Go to" group).
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/app", icon: LayoutDashboard },
  { label: "Proof", href: "/app/proof", icon: Inbox },
  { label: "Campaigns", href: "/app/campaigns", icon: Megaphone },
  { label: "Showcase", href: "/app/showcase", icon: Star },
  { label: "Library", href: "/app/library", icon: Library },
  { label: "Requests", href: "/app/requests", icon: Send },
  { label: "Brand kits", href: "/app/brand", icon: Palette },
  { label: "Consent", href: "/app/consent", icon: ShieldCheck },
];
