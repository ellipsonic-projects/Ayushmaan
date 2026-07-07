import Image from "next/image";
import Link from "next/link";
import { LifeBuoy, Plus, Settings } from "lucide-react";

import { PlatformNav } from "@/components/platform-nav";
import { Button } from "@/components/ui/button";

export function PlatformSidebarContent() {
  return (
    <>
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
        <Image
          src="/icon.svg"
          alt="Ayushman"
          width={32}
          height={32}
          className="rounded-lg"
        />
        <div className="leading-tight">
          <p className="text-base font-semibold text-sidebar-foreground">
            Ayushman
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
            Super Admin
          </p>
        </div>
      </Link>

      <PlatformNav />

      <div className="mt-auto space-y-3 pt-4">
        <a href="/tenants/add">
        <Button className="w-full justify-center gap-2">
          <Plus className="h-4 w-4" />
          New Tenant
        </Button>
        </a>

        <div className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <Link
            href="/support"
            className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LifeBuoy className="h-4 w-4" />
            Support
          </Link>
        </div>
      </div>
    </>
  );
}

export function PlatformSidebar() {
  return (
    <aside className="hidden h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
      <PlatformSidebarContent />
    </aside>
  );
}
