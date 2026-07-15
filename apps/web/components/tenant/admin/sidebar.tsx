import Image from "next/image";
import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";

import { TenantAdminNav } from "@/components/tenant/admin/nav";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";

export function TenantAdminSidebarContent() {
  return (
    <>
      <Link href="/slug/tenant/dashboard" className="flex items-center gap-2.5 px-2">
        <Image src="/icon.svg" alt="Ayushman" width={32} height={32} className="rounded-lg" />
        <div className="leading-tight">
          <p className="text-base font-semibold text-sidebar-foreground">Ayushman</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
            Tenant Admin
          </p>
        </div>
      </Link>

      <TenantAdminNav />

      <div className="mt-auto space-y-3 pt-4">
        <Link href="/slug/onboarding">
          <Button className="w-full justify-center gap-2">
            <Plus className="h-4 w-4" />
            Invite Consultant
          </Button>
        </Link>

        <div className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
          <Link
            href="/support"
            className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LifeBuoy className="h-4 w-4" />
            Support
          </Link>
          <LogoutButton variant="row" />
        </div>
      </div>
    </>
  );
}

export function TenantAdminSidebar() {
  return (
    <aside className="hidden h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 lg:flex">
      <TenantAdminSidebarContent />
    </aside>
  );
}
