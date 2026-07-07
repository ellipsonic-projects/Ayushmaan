import {
  Bell,
  CalendarCheck,
  FileText,
  Menu,
  MessageSquare,
  Plus,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ClientSidebarContent } from "@/components/tenant/client/sidebar";

const quickCreateItems: { label: string; icon: LucideIcon }[] = [
  { label: "Appointment", icon: CalendarCheck },
  { label: "Message", icon: MessageSquare },
  { label: "Document", icon: FileText },
];

export function ClientHeader({
  tenantName = "Acme Industries",
}: {
  tenantName?: string;
}) {
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
            <ClientSidebarContent />
          </SheetContent>
        </Sheet>
        <h1 className="truncate text-base font-semibold text-foreground sm:text-lg">
          {tenantName}
        </h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <div className="relative hidden w-40 sm:block md:w-56 lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search appointments, files..." className="h-9 pl-9" />
        </div>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>
        <Popover>
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
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                {label}
              </button>
            ))}
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
