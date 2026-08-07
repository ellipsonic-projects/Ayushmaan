"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Settings,
  Plus,
  type LucideIcon,
  Calendar,
  CalendarCheck,
  CalendarClock,
  Inbox,
  Receipt,
  UsersRound,
  Contact,
  FileText,
  Files,
  Share2,
  Workflow,
  FileQuestionMark,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CollapsibleLabel } from "@/components/sidebar/collapsible-label";
import { useTenantSlug } from "@/lib/tenant/slug-context";
import { useMe } from "@/lib/hooks/useMe";
import { TourTrigger } from "@/components/tour/tour-trigger";

const navItems: { href: string; label: string; icon: LucideIcon; tour?: string }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "My Cases", icon: LayoutDashboard, tour: "consultant-nav-cases" },
  { href: "/referrals", label: "Referrals", icon: Share2, tour: "consultant-nav-referrals" },
  { href: "/calendar", label: "Calendar", icon: Calendar, tour: "consultant-nav-calendar" },
  {
    href: "/appointments",
    label: "Appointments",
    icon: CalendarCheck,
    tour: "consultant-nav-appointments",
  },
  {
    href: "/availability",
    label: "Availability",
    icon: CalendarClock,
    tour: "consultant-nav-availability",
  },
  { href: "/inbox", label: "Inbox", icon: Inbox, tour: "consultant-nav-inbox" },
  { href: "/clients", label: "Clients", icon: Users, tour: "consultant-nav-clients" },
  { href: "/team", label: "Your Team", icon: UsersRound, tour: "consultant-nav-team" },
  { href: "/billing", label: "Billing", icon: Receipt, tour: "consultant-nav-billing" },
  { href: "/templates", label: "Templates", icon: FileText, tour: "consultant-nav-templates" },
  {
    href: "/documentation",
    label: "Documentation",
    icon: Files,
    tour: "consultant-nav-documentation",
  },
  { href: "/workflows", label: "Workflows", icon: Workflow, tour: "consultant-nav-workflows" },
  { href: "/help", label: "Help", icon: FileQuestionMark, tour: "consultant-nav-help" },
  {
    href: "/notifications",
    label: "Notifications",
    icon: Bell,
    tour: "consultant-nav-notifications",
  },
  { href: "/settings", label: "Settings", icon: Settings, tour: "consultant-nav-settings" },
];

export function ConsultantSidebarContent({
  collapsible = false,
  collapsed = false,
  onToggle,
}: {
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const slug = useTenantSlug();
  const base = `/${slug}/tenant/consultant`;
  const { me } = useMe();

  const displayName = me?.fullName ?? me?.email ?? "";
  const initials = displayName
    ? displayName
        .split(/[\s@]/)
        .filter(Boolean)
        .slice(0, 2)
        .map((s) => s[0]?.toUpperCase() ?? "")
        .join("")
    : "?";

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-1">
        <Link href={`${base}/dashboard`} className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-sidebar-border bg-white">
            <Image
              src="/logo.jpeg"
              alt="Ayushman"
              width={34}
              height={34}
              className="shrink-0 rounded-xl object-contain"
            />
          </span>
          <CollapsibleLabel collapsible={collapsible} className="leading-tight">
            <p className="text-base font-extrabold tracking-[-0.03em] text-sidebar-foreground">
              Ayushman
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/52">
              Consultant
            </p>
          </CollapsibleLabel>
        </Link>

        {onToggle ? (
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={onToggle}
            className="hidden size-9 shrink-0 items-center justify-center rounded-xl border border-sidebar-border bg-white text-sidebar-foreground/62 transition-colors hover:border-sidebar-primary/35 hover:bg-sidebar-accent hover:text-sidebar-primary lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        ) : null}
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, tour }) => {
          const fullHref = `${base}${href}`;
          const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
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

      <div className="mt-auto space-y-3 pt-4">
        <Button
          data-tour="consultant-new-case-cta"
          className="h-10 w-full justify-center gap-2 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
        >
          <Plus className="h-4 w-4 shrink-0" />
          <CollapsibleLabel collapsible={collapsible}>New Case</CollapsibleLabel>
        </Button>

        <TourTrigger collapsible={collapsible} />

        <div className="flex items-center gap-3 border-t border-sidebar-border pt-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {initials}
          </span>
          <CollapsibleLabel collapsible={collapsible} className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {displayName || "—"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">Consultant</p>
          </CollapsibleLabel>
        </div>
      </div>
    </>
  );
}

export function ConsultantSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      data-collapsed={collapsed}
      data-tour="consultant-sidebar"
      className={cn(
        "group hidden h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar px-3 py-5 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.75rem]" : "w-64"
      )}
    >
      <ConsultantSidebarContent
        collapsible
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
    </aside>
  );
}
