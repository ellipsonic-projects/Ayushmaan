"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  ScrollText,
  ShieldAlert,
  type LucideIcon,
  Bell,
  SnowflakeIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CollapsibleLabel } from "@/components/sidebar/collapsible-label";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/superadmin/tenants", label: "Tenants", icon: Building2 },
  { href: "/superadmin/payments", label: "Payments", icon: CreditCard },
  { href: "/superadmin/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/superadmin/grievances", label: "Grievances", icon: ShieldAlert },
  { href: "/superadmin/notify", label: "Notify All", icon: Bell },
  { href: "/superadmin/microservices", label: "Microservices", icon: SnowflakeIcon },
];

export function PlatformNav({ collapsible = false }: { collapsible?: boolean } = {}) {
  const pathname = usePathname();

  return (
    <nav className="mt-6 flex flex-1 flex-col gap-0.5">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive &&
                "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <CollapsibleLabel collapsible={collapsible}>{label}</CollapsibleLabel>
          </Link>
        );
      })}
    </nav>
  );
}
