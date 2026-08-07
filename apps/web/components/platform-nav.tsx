"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Landmark,
  ScrollText,
  ShieldQuestion,
  type LucideIcon,
  Radio,
  ServerCog,
  FileCheck2,
  Workflow,
  FileText,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CollapsibleLabel } from "@/components/sidebar/collapsible-label";

const navItems: { href: string; label: string; icon: LucideIcon; tour?: string }[] = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    href: "/superadmin/tenants",
    label: "Tenants",
    icon: Building2,
    tour: "superadmin-nav-tenants",
  },
  { href: "/superadmin/payments", label: "Payments", icon: Landmark },
  { href: "/superadmin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/superadmin/grievances", label: "Grievances", icon: ShieldQuestion },
  {
    href: "/superadmin/workflows",
    label: "Workflows",
    icon: Workflow,
    tour: "superadmin-nav-workflows",
  },
  {
    href: "/superadmin/templates",
    label: "Templates",
    icon: FileText,
    tour: "superadmin-nav-templates",
  },
  {
    href: "/superadmin/community-templates",
    label: "Community Templates",
    icon: FileCheck2,
    tour: "superadmin-nav-community-templates",
  },
  { href: "/superadmin/notify", label: "Notify All", icon: Radio },
  { href: "/superadmin/microservices", label: "Microservices", icon: ServerCog },
];

export function PlatformNav({ collapsible = false }: { collapsible?: boolean } = {}) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-1 flex-col gap-1.5">
      {navItems.map(({ href, label, icon: Icon, tour }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            data-tour={tour}
            className={cn(
              "group/nav flex min-h-10 items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-sm font-semibold text-sidebar-foreground/66 transition-all hover:border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive &&
                "border-sidebar-primary/20 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-foreground/74 transition-colors group-hover/nav:bg-white group-hover/nav:text-sidebar-primary",
                isActive && "bg-white text-sidebar-primary"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
            </span>
            <CollapsibleLabel collapsible={collapsible}>{label}</CollapsibleLabel>
          </Link>
        );
      })}
    </nav>
  );
}
