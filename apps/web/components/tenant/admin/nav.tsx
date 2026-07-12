"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Receipt,
  ScrollText,
  Megaphone,
  Settings,
  type LucideIcon,
  Clock,
  UserCog,
  Inbox,
  BarChart3,
  Contact,
  FileText,
  Workflow,
  HelpCircle,
  Building2,
  Users,
  Calendar,
  CalendarClock,
} from "lucide-react";

import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/scheduler", label: "Scheduler", icon: Clock },
  { href: "/onboarding", label: "Onboarding", icon: ClipboardList },
  { href: "/consultants", label: "Consultants", icon: UserCog },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/grievance", label: "Escalate to Platform", icon: Megaphone },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TenantAdminNav({
  basePath = "/slug/tenant/admin",
  items = navItems,
  className,
}: {
  basePath?: string;
  items?: NavItem[];
  className?: string;
} = {}) {
  const pathname = usePathname();

  return (
    <nav className={cn("mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto", className)}>
      {items.map(({ href, label, icon: Icon }) => {
        const fullHref = `${basePath}${href}`;
        const isActive =
          pathname === fullHref || (href !== "" && pathname.startsWith(`${fullHref}/`));
        return (
          <Link
            key={href}
            href={fullHref}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              isActive &&
                "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
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

// Same tenant-admin features, mounted tenant-wise inside the Super Admin
// workspace at /superadmin/tenants/:id.
const superAdminTenantNavItems: NavItem[] = [
  { href: "", label: "Overview", icon: Building2 },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/scheduler", label: "Scheduler", icon: Clock },
  { href: "/onboarding", label: "Onboarding", icon: ClipboardList },
  { href: "/consultants", label: "Consultants", icon: UserCog },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/sessions", label: "Sessions", icon: CalendarClock },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText },
  { href: "/grievance", label: "Grievances", icon: Megaphone },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function SuperAdminTenantNav() {
  return (
    <TenantAdminNav
      basePath="/superadmin/tenants/id"
      items={superAdminTenantNavItems}
      className="mt-2"
    />
  );
}
