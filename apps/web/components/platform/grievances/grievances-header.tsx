import Link from "next/link";
import { ChevronRight, Download, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function GrievancesHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/dashboard" className="hover:text-foreground">
            Governance
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Grievances</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">
          Grievance Command Center
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Global oversight of platform-wide concerns and service quality
          disputes across all tenants and regional hubs.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" />
          Log Internal Concern
        </Button>
      </div>
    </div>
  );
}
