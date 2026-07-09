import Link from "next/link";
import { ChevronRight, Download, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TenantsStatsRow } from "@/components/platform/tenants/stats-row";
import { TenantFilters } from "@/components/platform/tenants/tenant-filters";
import { TenantsTable } from "@/components/platform/tenants/tenants-table";

export default function TenantsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Tenants</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold text-foreground">Tenants</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <a href="/superadmin/tenants/add">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            Create Tenant
          </Button>
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6">
          <TenantsStatsRow />
          <TenantsTable />
        </div>
        <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-72">
          <TenantFilters />
        </aside>
      </div>
    </div>
  );
}
