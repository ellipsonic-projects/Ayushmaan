"use client";

import { CalendarCheck, FileText, Menu, MessageSquare, Plus, Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ClientSidebarContent } from "@/components/tenant/client/sidebar";
import { NotificationBell } from "@/components/tenant/shared/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/auth/logout-button";
import { useMe } from "@/lib/hooks/useMe";
import { useClientNotifications } from "@/lib/hooks/useClientNotifications";

const quickCreateItems: { label: string; icon: LucideIcon }[] = [
  { label: "Appointment", icon: CalendarCheck },
  { label: "Message", icon: MessageSquare },
  { label: "Document", icon: FileText },
];

export function ClientHeader({ tenantName }: { tenantName?: string }) {
  const { me } = useMe();
  const orgName = tenantName ?? me?.tenant?.displayName ?? "Organization console";
  const { notifications, unreadCount, isLoading, markAsRead } = useClientNotifications();
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
            <ClientSidebarContent />
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
            Client portal
          </p>
          <h1 className="truncate text-base font-extrabold tracking-[-0.03em] text-foreground sm:text-lg">
            {orgName}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden w-40 sm:block md:w-56 lg:w-72">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-primary" />
          <Input
            placeholder="Search appointments, files..."
            className="h-10 rounded-xl border-border bg-background pl-9 shadow-none focus-visible:border-primary/40"
          />
        </div>
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
