"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Settings,
  Plus,
  type LucideIcon,
  Calendar,
  Inbox,
  Receipt,
  UsersRound,
  Contact,
  FileText,
  Workflow,
  FileQuestionMark,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CollapsibleLabel } from "@/components/sidebar/collapsible-label";

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/cases", label: "My Cases", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/team", label: "Your Team", icon: UsersRound },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/workflows", label: "Workflows", icon: Workflow },
  { href: "/help", label: "Help", icon: FileQuestionMark },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function ConsultantSidebarContent({ collapsible = false }: { collapsible?: boolean }) {
  const pathname = usePathname();
  const base = "/tenant/consultant";

  return (
    <>
      <Link href={`${base}/dashboard`} className="flex items-center gap-2.5 px-2">
        <Image
          src="/logo.jpeg"
          alt="Ayushman"
          width={32}
          height={32}
          className="shrink-0 rounded-lg"
        />
        <CollapsibleLabel collapsible={collapsible} className="leading-tight">
          <p className="text-base font-semibold text-sidebar-foreground">Ayushman</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
            Consultant
          </p>
        </CollapsibleLabel>
      </Link>

      <nav className="mt-6 flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const fullHref = `${base}${href}`;
          const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
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
              <Icon className="h-4 w-4 shrink-0" />
              <CollapsibleLabel collapsible={collapsible}>{label}</CollapsibleLabel>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-4">
        <Button className="w-full justify-center gap-2">
          <Plus className="h-4 w-4 shrink-0" />
          <CollapsibleLabel collapsible={collapsible}>New Case</CollapsibleLabel>
        </Button>

        <div className="flex items-center gap-3 border-t border-sidebar-border pt-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            AT
          </span>
          <CollapsibleLabel collapsible={collapsible} className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-foreground">Dr. Aris Thorne</p>
            <p className="truncate text-xs text-sidebar-foreground/60">Senior Level</p>
          </CollapsibleLabel>
        </div>
      </div>
    </>
  );
}

export function ConsultantSidebar() {
  return (
    <aside className="group hidden h-screen w-16 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar px-3 py-5 transition-all duration-200 hover:w-56 lg:flex">
      <ConsultantSidebarContent collapsible />
    </aside>
  );
}
