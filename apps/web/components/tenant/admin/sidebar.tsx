"use client";

import Image from "next/image";
import Link from "next/link";
import { LifeBuoy, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { useState } from "react";

import { TenantAdminNav } from "@/components/tenant/admin/nav";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { CollapsibleLabel } from "@/components/sidebar/collapsible-label";
import { useTenantSlug } from "@/lib/tenant/slug-context";
import { useMe } from "@/lib/hooks/useMe";
import { cn } from "@/lib/utils";
import { TourTrigger } from "@/components/tour/tour-trigger";

export function TenantAdminSidebarContent({
  collapsible = false,
  collapsed = false,
  onToggle,
}: {
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
} = {}) {
  const slug = useTenantSlug();
  const { me } = useMe();

  const displayName = me?.email ?? "";
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
        <Link
          href={`/${slug}/tenant/admin/dashboard`}
          className="flex min-w-0 items-center gap-2.5"
        >
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
              Tenant Admin
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

      <TenantAdminNav basePath={`/${slug}/tenant/admin`} collapsible={collapsible} />

      <div className="mt-auto space-y-3 pt-4">
        <Link href={`/${slug}/tenant/admin/consultant-applications`}>
          <Button className="h-10 w-full justify-center gap-2 rounded-xl bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90">
            <Plus className="h-4 w-4 shrink-0" />
            <CollapsibleLabel collapsible={collapsible}>Invite Consultant</CollapsibleLabel>
          </Button>
        </Link>

        <TourTrigger collapsible={collapsible} />

        <div className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
          <Link
            href={`/${slug}/tenant/admin/help`}
            className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-sidebar-foreground/62 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-primary">
              <LifeBuoy className="h-4 w-4 shrink-0" />
            </span>
            <CollapsibleLabel collapsible={collapsible}>Support</CollapsibleLabel>
          </Link>
          <LogoutButton variant="row" collapsible={collapsible} />
        </div>
        <div className="flex items-center gap-3 border-t border-sidebar-border pt-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
            {initials}
          </span>
          <CollapsibleLabel collapsible={collapsible} className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {displayName || "—"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">Tenant Admin</p>
          </CollapsibleLabel>
        </div>
      </div>
    </>
  );
}

export function TenantAdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      data-collapsed={collapsed}
      data-tour="admin-sidebar"
      className={cn(
        "group hidden h-screen shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar px-3 py-5 transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.75rem]" : "w-64"
      )}
    >
      <TenantAdminSidebarContent
        collapsible
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
    </aside>
  );
}
