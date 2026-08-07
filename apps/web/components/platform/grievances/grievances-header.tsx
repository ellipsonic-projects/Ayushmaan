import Link from "next/link";
import { ChevronRight, Download, Megaphone, Building2, UserRound, Stethoscope } from "lucide-react";

import { Button } from "@/components/ui/button";

const notifyActions = [
  { label: "Notify Everyone", targetRole: "ALL", icon: Megaphone },
  { label: "Notify Tenants", targetRole: "TENANT_ADMIN", icon: Building2 },
  { label: "Notify Clients", targetRole: "CLIENT", icon: UserRound },
  { label: "Notify Consultants", targetRole: "CONSULTANT", icon: Stethoscope },
] as const;

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
        <h2 className="mt-1 text-2xl font-bold text-foreground">Grievance Command Center</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Global oversight of platform-wide concerns and service quality disputes across all tenants
          and regional hubs.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {notifyActions.map(({ label, targetRole, icon: Icon }) => (
          <Button key={targetRole} variant="outline" className="gap-1.5" asChild>
            <Link href={`/superadmin/notify/create?targetRole=${targetRole}`}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          </Button>
        ))}
        <Button variant="outline" className="gap-1.5">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>
    </div>
  );
}
