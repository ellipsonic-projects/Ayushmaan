import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function TenantDetailHeader({
  tenantId,
  name,
  status,
}: {
  tenantId: string;
  name: string;
  status: "Active" | "Suspended";
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/tenants" className="hover:text-foreground">
            Tenants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{tenantId}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <h2 className="text-2xl font-bold text-foreground">{name}</h2>
          <Badge
            variant={status === "Active" ? "default" : "destructive"}
            className="uppercase"
          >
            {status}
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Audit Log
        </Button>
        <Button variant="destructive">Suspend Tenant</Button>
        <Button>Save Changes</Button>
      </div>
    </div>
  );
}
