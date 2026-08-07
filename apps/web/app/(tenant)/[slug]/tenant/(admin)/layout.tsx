"use client";

import type { ReactNode } from "react";

import { TenantAdminSidebar } from "@/components/tenant/admin/sidebar";
import { TenantAdminHeader } from "@/components/tenant/admin/header";
import { TenantAdminFooter } from "@/components/tenant/admin/footer";
import { TourProvider } from "@/components/tour/tour-provider";
import { adminTourSteps } from "@/components/tour/steps/admin-tour";
import { useTenantSlug } from "@/lib/tenant/slug-context";

export default function TenantAdminLayout({ children }: { children: ReactNode }) {
  const slug = useTenantSlug();

  return (
    <TourProvider role="admin" basePath={`/${slug}/tenant/admin`} steps={adminTourSteps}>
      <div className="tenant-theme platform-shell">
        <TenantAdminSidebar />
        <div className="platform-shell-content">
          <TenantAdminHeader />
          <main className="platform-shell-main">{children}</main>
          <TenantAdminFooter />
        </div>
      </div>
    </TourProvider>
  );
}
