"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2, CalendarClock, CalendarDays, ClipboardList, Clock,
  LayoutDashboard, ReceiptText, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";

const ICONS: Record<string, LucideIcon> = {
  Building2, CalendarClock, CalendarDays, ClipboardList, Clock,
  LayoutDashboard, ReceiptText, Users, Wallet,
};

export function Sidebar({ items, horizontal = false }: { items: NavItem[]; horizontal?: boolean }) {
  const pathname = usePathname();
  const root = items[0]?.href;

  return (
    <nav
      aria-label="Main"
      className={cn(horizontal ? "flex gap-1 overflow-x-auto px-3 py-2" : "flex flex-col gap-1 px-3")}
    >
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? LayoutDashboard;
        const active = item.href === root ? pathname === root : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon size={18} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
