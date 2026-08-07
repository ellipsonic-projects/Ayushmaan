import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";

export function AuditLogHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/superadmin/dashboard" className="hover:text-foreground">
            Governance
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Audit Log</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">
          Platform Audit Log
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every tenant, access, and system-level event across the platform —
          searchable and exportable for compliance review.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  );
}
