"use client";

import { useState } from "react";
import {
  Bell,
  CalendarCheck,
  CircleCheck,
  FileText,
  Grid3x3,
  Menu,
  Mic,
  Plus,
  ReceiptText,
  Search,
  StickyNote,
  UserRoundPlus,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ConsultantSidebarContent } from "@/components/tenant/consultant/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AiScribeOverlay } from "@/components/tenant/consultant/ai-scribe/ai-scribe-overlay";
import { LogoutButton } from "@/components/auth/logout-button";

const quickCreateItems: { label: string; icon: LucideIcon }[] = [
  { label: "New Log", icon: Mic },
  { label: "Case", icon: Mic },
  { label: "Video call", icon: Video },
  { label: "Task", icon: CircleCheck },
  { label: "Template", icon: FileText },
  { label: "Workflow", icon: FileText },
];

export function ConsultantHeader({ tenantName = "Acme Industries" }: { tenantName?: string }) {
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [scribeOpen, setScribeOpen] = useState(false);

  function handleQuickCreateSelect(label: string) {
    setQuickCreateOpen(false);
    if (label === "New Log") {
      setScribeOpen(true);
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Sheet>
          <SheetTrigger
            aria-label="Open menu"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:hidden"
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
        <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
          {tenantName}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden w-40 sm:block md:w-56 lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search cases, files..." className="h-9 pl-9" />
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>
        <button
          type="button"
          aria-label="Apps"
          className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:flex"
        >
          <Grid3x3 className="h-4 w-4" />
        </button>
        <ThemeToggle />
        <LogoutButton />
        <Popover open={quickCreateOpen} onOpenChange={setQuickCreateOpen}>
          <PopoverTrigger
            render={
              <Button size="sm" className="gap-1.5">
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
        </Popover>
      </div>

      <AiScribeOverlay open={scribeOpen} onClose={() => setScribeOpen(false)} />
    </header>
  );
}
