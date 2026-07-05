import Link from "next/link";
import { ChevronRight, Filter, Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export function SessionLogHeader({
  tenantId,
  tenantName,
  totalRecords,
}: {
  tenantId: string;
  tenantName: string;
  totalRecords: number;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/tenants" className="hover:text-foreground">
            Tenants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/tenants/${tenantId}`} className="hover:text-foreground">
            {tenantName}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Sessions</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">
          Global Session Logs
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reviewing {totalRecords.toLocaleString()} historical interaction
          records for {tenantName} infrastructure.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" className="gap-1.5">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
        <Button className="gap-1.5">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
