"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Stethoscope,
  ClipboardList,
  Receipt,
  ScrollText,
  Megaphone,
  Settings,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/consultants", label: "Consultants", icon: Stethoscope },
  { href: "/onboarding", label: "Onboarding", icon: ClipboardList },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/grievance", label: "Escalate to Platform", icon: Megaphone },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TenantAdminNav() {
  const pathname = usePathname();
  const base = "/slug";

  return (
    <nav className="mt-8 flex flex-1 flex-col gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const fullHref = `${base}${href}`;
        const isActive =
          pathname === fullHref || pathname.startsWith(`${fullHref}/`);
        return (
          <Link
            key={href}
            href={fullHref}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
