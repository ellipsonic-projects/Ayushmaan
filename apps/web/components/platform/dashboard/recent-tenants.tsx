"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Eye, Pencil } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const tenants = [
  { name: "MedSync Inc.", plan: "Enterprise", status: "Active", created: "Oct 12, 2023" },
  { name: "Wellness Labs", plan: "Pro", status: "Trial", created: "Nov 05, 2023" },
  { name: "Riverside Clinic", plan: "Enterprise", status: "Suspended", created: "Aug 29, 2023" },
  { name: "Nexus Health", plan: "Pro", status: "Active", created: "Dec 02, 2023" },
];

const statusStyles: Record<string, string> = {
  Active: "bg-emerald-500",
  Trial: "bg-amber-500",
  Suspended: "bg-red-500",
};

export function RecentTenants() {
  const [page] = useState(1);

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
              {tenants.map((tenant) => (
                <tr key={tenant.name} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground">{tenant.name}</td>
                  <td className="py-3 pr-4">
                    <Badge variant={tenant.plan === "Enterprise" ? "default" : "secondary"}>
                      {tenant.plan}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span className={`h-2 w-2 rounded-full ${statusStyles[tenant.status]}`} />
                      {tenant.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{tenant.created}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {tenants.length} of 124 tenants</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="icon-sm">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
