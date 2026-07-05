"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Tenant = {
  name: string;
  slug: string;
  plan: "Enterprise" | "Pro" | "Trial";
  status: "Active" | "Suspended";
  expiry: string;
  expiryTone?: "warning" | "danger" | "neutral";
  expiryNote?: string;
  grievances: { label: string; variant: "secondary" | "destructive" | "outline" } | null;
};

const tenants: Tenant[] = [
  {
    name: "Acme Corp",
    slug: "acme-global",
    plan: "Enterprise",
    status: "Active",
    expiry: "Oct 24, 2025",
    grievances: null,
  },
  {
    name: "Stark Industries",
    slug: "stark-tech",
    plan: "Trial",
    status: "Active",
    expiry: "In 3 Days",
    expiryTone: "warning",
    expiryNote: "Jan 28, 2024",
    grievances: { label: "3 Open", variant: "secondary" },
  },
  {
    name: "Weyland-Yutani",
    slug: "weyland-corp",
    plan: "Pro",
    status: "Suspended",
    expiry: "Overdue",
    expiryTone: "danger",
    grievances: { label: "0 Critical", variant: "destructive" },
  },
  {
    name: "Globex Corp",
    slug: "globex-int",
    plan: "Enterprise",
    status: "Active",
    expiry: "Renewal Pending",
    expiryTone: "warning",
    expiryNote: "Feb 02, 2024",
    grievances: { label: "1", variant: "outline" },
  },
  {
    name: "Initech",
    slug: "initech-sa",
    plan: "Pro",
    status: "Active",
    expiry: "Dec 12, 2025",
    grievances: null,
  },
];

const statusDot: Record<Tenant["status"], string> = {
  Active: "bg-emerald-500",
  Suspended: "bg-red-500",
};

const planVariant: Record<Tenant["plan"], "default" | "secondary" | "outline"> = {
  Enterprise: "default",
  Pro: "outline",
  Trial: "secondary",
};

export function TenantsTable() {
  const [page] = useState(1);

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Tenant</th>
                <th className="py-2 pr-4 font-medium">Plan Tier</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Plan Expiry</th>
                <th className="py-2 pr-4 font-medium">Grievances</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr
                  key={tenant.slug}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-semibold text-foreground">
                        {tenant.name.charAt(0)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {tenant.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {tenant.slug}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={planVariant[tenant.plan]}>
                      {tenant.plan}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className={`h-2 w-2 rounded-full ${statusDot[tenant.status]}`}
                      />
                      {tenant.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {tenant.expiryTone === "warning" ? (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-500">
                        {tenant.expiryNote ? (
                          <CalendarClock className="h-3.5 w-3.5" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )}
                        <div className="leading-tight">
                          <p className="text-sm font-medium">{tenant.expiry}</p>
                          {tenant.expiryNote && (
                            <p className="text-xs text-muted-foreground">
                              {tenant.expiryNote}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : tenant.expiryTone === "danger" ? (
                      <span className="text-sm font-medium text-destructive">
                        {tenant.expiry}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        {tenant.expiry}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {tenant.grievances ? (
                      <Badge variant={tenant.grievances.variant}>
                        {tenant.grievances.label}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm">
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing 1 to {tenants.length} of 1,248 tenants
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {[1, 2, 3].map((n) => (
              <Button
                key={n}
                variant={page === n ? "default" : "outline"}
                size="icon-sm"
              >
                {n}
              </Button>
            ))}
            <span className="px-1">...</span>
            <Button variant="outline" size="icon-sm">
              250
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
