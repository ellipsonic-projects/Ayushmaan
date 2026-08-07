"use client";

import Image from "next/image";
import { Menu } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TenantAdminSidebarContent } from "@/components/tenant/admin/sidebar";
import { HeaderSearch } from "@/components/tenant/shared/header-search";
import { NotificationBell } from "@/components/tenant/shared/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
import { useMe } from "@/lib/hooks/useMe";
import { useTenantNotifications } from "@/lib/hooks/useTenantNotifications";

export function TenantAdminHeader({ title }: { title?: string }) {
  const { me } = useMe();
  const heading = title ?? me?.tenant?.displayName ?? "Practice Overview";
  const basePath = me?.tenant ? `/${me.tenant.slug}/tenant/admin` : null;
  const { notifications, unreadCount, isLoading, markAsRead } = useTenantNotifications(
    me?.tenantId,
    me?.tenant?.slug
  );
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Sheet>
          <SheetTrigger
            aria-label="Open menu"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-primary lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex-col border-r border-sidebar-border bg-sidebar px-4 py-6"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <TenantAdminSidebarContent />
          </SheetContent>
        </Sheet>
        <Image
          src="/logo.jpeg"
          alt="Ayushman"
          width={30}
          height={30}
          className="hidden shrink-0 rounded-lg object-contain sm:block"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
            Practice console
          </p>
          <h1 className="truncate text-base font-extrabold tracking-[-0.03em] text-foreground sm:text-lg">
            {heading}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-4">
        <HeaderSearch
          placeholder="Search clients, consultants..."
          basePath={basePath}
          canLinkToCases={false}
        />
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
        />
        <ThemeToggle />
        <LogoutButton />
      </div>
    </header>
  );
}
