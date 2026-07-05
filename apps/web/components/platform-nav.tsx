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

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tenants", label: "Tenants", icon: Building2 },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/grievances", label: "Grievances", icon: ShieldAlert },
  { href: "/notify", label: "Notify All", icon: Bell},
  { href: "/microservices", label: "Microservices", icon: SnowflakeIcon},
];

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="mt-8 flex flex-1 flex-col gap-1">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
              isActive && "bg-accent text-accent-foreground"
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
