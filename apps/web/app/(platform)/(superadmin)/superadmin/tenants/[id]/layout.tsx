import type { ReactNode } from "react";

import { SuperAdminTenantNav } from "@/components/tenant/admin/nav";

export default async function SuperAdminTenantWorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 rounded-xl border border-sidebar-border bg-sidebar px-3 py-4 lg:sticky lg:top-5 lg:w-52">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
          Tenant Workspace
        </p>
        <SuperAdminTenantNav tenantId={id} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
