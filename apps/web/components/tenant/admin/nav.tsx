"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
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
  FileStack,
  UserCheck,
  ClipboardClock,
  Bell,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CollapsibleLabel } from "@/components/sidebar/collapsible-label";

type NavItem = { href: string; label: string; icon: LucideIcon; tour?: string };

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/audit-log", label: "Audit Log", icon: ScrollText, tour: "admin-nav-audit-log" },
  {
    href: "/appointments",
    label: "Appointments",
    icon: ClipboardClock,
    tour: "admin-nav-appointments",
  },
  { href: "/billing", label: "Billing", icon: Receipt, tour: "admin-nav-billing" },
  { href: "/calendar", label: "Calendar", icon: Calendar, tour: "admin-nav-calendar" },
  { href: "/consultants", label: "Consultants", icon: UserCog, tour: "admin-nav-consultants" },
  {
    href: "/consultant-applications",
    label: "Applications",
    icon: UserCheck,
    tour: "admin-nav-applications",
  },
  { href: "/clients", label: "Clients", icon: Users, tour: "admin-nav-clients" },
  { href: "/contacts", label: "Contacts", icon: Contact, tour: "admin-nav-contacts" },
  {
    href: "/grievance",
    label: "Escalate to Platform",
    icon: Megaphone,
    tour: "admin-nav-grievance",
  },
  { href: "/inbox", label: "Inbox", icon: Inbox, tour: "admin-nav-inbox" },
  { href: "/scheduler", label: "Scheduler", icon: Clock, tour: "admin-nav-scheduler" },
  { href: "/templates", label: "Templates", icon: FileText, tour: "admin-nav-templates" },
  { href: "/workflows", label: "Workflows", icon: Workflow, tour: "admin-nav-workflows" },
  { href: "/notifications", label: "Notifications", icon: Bell, tour: "admin-nav-notifications" },
  { href: "/settings", label: "Settings", icon: Settings, tour: "admin-nav-settings" },
];

export function TenantAdminNav({
  basePath = "/tenant/admin",
  items = navItems,
  className,
  collapsible = false,
}: {
  basePath?: string;
  items?: NavItem[];
  className?: string;
  collapsible?: boolean;
} = {}) {
  const pathname = usePathname();

  return (
    <nav className={cn("mt-6 flex flex-1 flex-col gap-1.5 overflow-y-auto", className)}>
      {items.map(({ href, label, icon: Icon, tour }) => {
        const fullHref = `${basePath}${href}`;
        const isActive =
          pathname === fullHref || (href !== "" && pathname.startsWith(`${fullHref}/`));
        return (
          <Link
            key={href}
            href={fullHref}
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

// Same tenant-admin features, mounted tenant-wise inside the Super Admin
// workspace at /superadmin/tenants/:id.
const superAdminTenantNavItems: NavItem[] = [
  { href: "", label: "Overview", icon: Building2 },
  { href: "/consultants", label: "Consultants", icon: UserCog },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/cases", label: "Cases", icon: FileStack },
  { href: "/workflows", label: "Workflows", icon: Workflow },
];

export function SuperAdminTenantNav({
  tenantId,
  collapsible = false,
}: {
  tenantId: string;
  collapsible?: boolean;
}) {
  return (
    <TenantAdminNav
      basePath={`/superadmin/tenants/${tenantId}`}
      items={superAdminTenantNavItems}
      className="mt-2"
      collapsible={collapsible}
    />
  );
}
