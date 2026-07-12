"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Boxes,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Gauge,
  Hammer,
  Laptop,
  PackageCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";
import { useMe } from "@/hooks/useMe";

const navItems: Array<{
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}> = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "Organization", href: "/organization", icon: Building2, roles: ["ADMIN"] },
  { label: "Assets", href: "/assets", icon: Laptop },
  { label: "Allocations", href: "/allocations", icon: PackageCheck },
  { label: "Bookings", href: "/bookings", icon: CalendarDays },
  { label: "Maintenance", href: "/maintenance", icon: Hammer },
  { label: "Audits", href: "/audits", icon: ClipboardCheck },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Activity", href: "/activity", icon: Activity },
];

export function AppSidebar({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const { data: me } = useMe();

  const visibleItems = navItems.filter((item) => !item.roles || (me && item.roles.includes(me.role)));

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r bg-sidebar transition-[width] duration-200 lg:block",
        collapsed ? "w-20" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center gap-3 border-b px-3", collapsed ? "justify-center" : "justify-between")}>
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-5" />
          </div>
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="text-base font-semibold">AssetFlow</p>
            <p className="text-xs text-muted-foreground">Placement Impossible</p>
          </div>
        </div>
        {!collapsed ? (
          <Button
            aria-label="Collapse navigation"
            size="icon-sm"
            variant="ghost"
            onClick={() => onCollapsedChange(true)}
          >
            <PanelLeftClose className="size-4" />
          </Button>
        ) : null}
      </div>
      <nav className="space-y-1 p-3">
        {collapsed ? (
          <Button
            aria-label="Expand navigation"
            className="mb-2 w-full"
            size="icon"
            variant="ghost"
            onClick={() => onCollapsedChange(false)}
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        ) : null}
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center px-2",
                active && "bg-primary/10 text-primary",
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className={cn("truncate", collapsed && "sr-only")}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
