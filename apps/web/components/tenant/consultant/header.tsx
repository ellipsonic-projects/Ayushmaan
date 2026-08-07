"use client";

import { useState } from "react";
import {
  CalendarCheck,
  CircleCheck,
  FileText,
  Grid3x3,
  Menu,
  Mic,
  Plus,
  ReceiptText,
  StickyNote,
  UserRoundPlus,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ConsultantSidebarContent } from "@/components/tenant/consultant/sidebar";
import { HeaderSearch } from "@/components/tenant/shared/header-search";
import { NotificationBell } from "@/components/tenant/shared/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { AiScribeOverlay } from "@/components/tenant/consultant/ai-scribe/ai-scribe-overlay";
import { LogoutButton } from "@/components/auth/logout-button";
import { useMe } from "@/lib/hooks/useMe";
import { useTenantNotifications } from "@/lib/hooks/useTenantNotifications";

const quickCreateItems: { label: string; icon: LucideIcon }[] = [
  { label: "New Log", icon: Mic },
  { label: "Case", icon: Mic },
  { label: "Video call", icon: Video },
  { label: "Task", icon: CircleCheck },
  { label: "Template", icon: FileText },
  { label: "Workflow", icon: FileText },
];

export function ConsultantHeader({ tenantName }: { tenantName?: string }) {
  const { me } = useMe();
  const orgName = tenantName ?? me?.tenant?.displayName ?? "Acme Industries";
  const basePath = me?.tenant ? `/${me.tenant.slug}/tenant/consultant` : null;
  const { notifications, unreadCount, isLoading, markAsRead } = useTenantNotifications(
    me?.tenantId,
    me?.tenant?.slug
  );
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [scribeOpen, setScribeOpen] = useState(false);

  function handleQuickCreateSelect(label: string) {
    setQuickCreateOpen(false);
    if (label === "New Log") {
      setScribeOpen(true);
    }
  }

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
            <ConsultantSidebarContent />
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">
            Consultant workspace
          </p>
          <h1 className="truncate text-base font-extrabold tracking-[-0.03em] text-foreground sm:text-lg">
            {orgName}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <HeaderSearch
          placeholder="Search clients, cases, tasks..."
          basePath={basePath}
          canLinkToCases={true}
        />
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
        />
        <button
          type="button"
          aria-label="Apps"
          className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-primary sm:flex"
        >
          <Grid3x3 className="h-4 w-4" />
        </button>
        <ThemeToggle />
        <LogoutButton />
        {/* <Popover open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
          <PopoverTrigger
            render={
              <Button size="sm" className="h-10 gap-1.5 rounded-xl">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </Button>
            }
          />
          <PopoverContent align="end" className="w-44 p-1">
            {quickCreateItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => handleQuickCreateSelect(label)}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </button>
            ))}
          </PopoverContent>
        </Popover> */}
      </div>

      <AiScribeOverlay open={scribeOpen} onClose={() => setScribeOpen(false)} />
    </header>
  );
}
