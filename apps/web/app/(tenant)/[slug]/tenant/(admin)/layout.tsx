import type { ReactNode } from "react";

import { TenantAdminSidebar } from "@/components/tenant/admin/sidebar";
import { TenantAdminHeader } from "@/components/tenant/admin/header";
import { TenantAdminFooter } from "@/components/tenant/admin/footer";

export default function TenantAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <TenantAdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TenantAdminHeader />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
        <TenantAdminFooter />
      </div>
    </div>
  );
}
