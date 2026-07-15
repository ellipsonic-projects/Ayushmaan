import Image from "next/image";
import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";

import { TenantAdminNav } from "@/components/tenant/admin/nav";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import { CollapsibleLabel } from "@/components/sidebar/collapsible-label";

export function TenantAdminSidebarContent({ collapsible = false }: { collapsible?: boolean } = {}) {
  return (
    <>
      <Link href="/tenant/admin/dashboard" className="flex items-center gap-2.5 px-2">
        <Image
          src="/logo.jpeg"
          alt="Ayushman"
          width={32}
          height={32}
          className="shrink-0 rounded-lg"
        />
        <CollapsibleLabel collapsible={collapsible} className="leading-tight">
          <p className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/60">
            Tenant Admin
          </p>
        </CollapsibleLabel>
      </Link>

      <TenantAdminNav collapsible={collapsible} />

      <div className="mt-auto space-y-3 pt-4">
        <Link href="/slug/onboarding">
          <Button className="w-full justify-center gap-2">
            <Plus className="h-4 w-4 shrink-0" />
            <CollapsibleLabel collapsible={collapsible}>Invite Consultant</CollapsibleLabel>
          </Button>
        </Link>

        <div className="flex flex-col gap-1 border-t border-sidebar-border pt-3">
          <Link
            href="/support"
            className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LifeBuoy className="h-4 w-4 shrink-0" />
            <CollapsibleLabel collapsible={collapsible}>Support</CollapsibleLabel>
          </Link>
          <LogoutButton variant="row" collapsible={collapsible} />
        </div>
      </div>
    </>
  );
}

export function TenantAdminSidebar() {
  return (
    <aside className="group hidden h-screen w-16 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar px-3 py-5 transition-all duration-200 hover:w-56 lg:flex">
      <TenantAdminSidebarContent collapsible />
    </aside>
  );
}
