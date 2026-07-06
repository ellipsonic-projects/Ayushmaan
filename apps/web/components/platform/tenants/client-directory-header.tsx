import Link from "next/link";
import { ChevronRight, Download, Users } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ClientDirectoryHeader({
  tenantId,
  tenantName,
}: {
  tenantId: string;
  tenantName: string;
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
          <span className="text-foreground">Clients</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </span>
          <h2 className="text-2xl font-bold text-foreground">
            Client Database
          </h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Managing active portfolios and session history for {tenantName}.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Data
        </Button>
      </div>
    </div>
  );
}
