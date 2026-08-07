"use client";

import { Download, Settings } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenants, type Tenant } from "@/lib/hooks";

const statusDot: Record<Tenant["status"], string> = {
  PENDING_APPROVAL: "bg-sky-500",
  ACTIVE: "bg-emerald-500",
  SUSPENDED: "bg-amber-500",
  REJECTED: "bg-red-500",
  ARCHIVED: "bg-red-500",
};

const planVariant: Record<Tenant["planTier"], "default" | "secondary" | "outline"> = {
  ENTERPRISE: "default",
  PRO: "outline",
  STANDARD: "secondary",
};

const RECENT_TENANTS_LIMIT = 5;

export function RecentTenants() {
  const { tenants: allTenants, isLoading, error } = useTenants();
  const tenants = allTenants.slice(0, RECENT_TENANTS_LIMIT);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Recent Tenants</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Tenant</th>
                <th className="py-2 pr-4 font-medium">Plan</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Created</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {error ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-destructive">
                    Failed to load tenants.
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    Loading tenants…
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No tenants found.
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 font-medium text-foreground">{tenant.displayName}</td>
                    <td className="py-3 pr-4">
                      <Badge variant={planVariant[tenant.planTier]}>{tenant.planTier}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span className={`h-2 w-2 rounded-full ${statusDot[tenant.status]}`} />
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <a href={`/superadmin/tenants/${tenant.id}`}>
                          <Button variant="ghost" size="icon-sm">
                            <Settings className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {tenants.length} of {allTenants.length} tenants
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
