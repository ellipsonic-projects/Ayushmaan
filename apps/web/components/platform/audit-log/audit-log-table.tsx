"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Download,
  KeyRound,
  RefreshCw,
  Search,
  ShieldAlert,
  UserCog,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type EventType =
  | "TENANT_CREATED"
  | "ESCALATED_ACCESS"
  | "MICROSERVICE_REDEPLOY"
  | "API_KEY_ISSUED";

type AuditEntry = {
  id: string;
  type: EventType;
  tenant: string;
  detail: string;
  actor: string;
  occurredAt: string;
  occurredAtSort: number;
};

const initialEntries: AuditEntry[] = [
  {
    id: "PAUD-3312",
    type: "TENANT_CREATED",
    tenant: "Apollo Clinic",
    detail: "New tenant created (ID: AP-901), domain apollo.ayushman.com",
    actor: "System Automator",
    occurredAt: "Jul 7, 2026 · 9:48 AM",
    occurredAtSort: 20260707_0948,
  },
  {
    id: "PAUD-3309",
    type: "ESCALATED_ACCESS",
    tenant: "Homeopathy Hub",
    detail: "Escalated access to Dr. Sharma Case #202 for grievance resolution",
    actor: "Admin_Ayush",
    occurredAt: "Jul 7, 2026 · 9:34 AM",
    occurredAtSort: 20260707_0934,
  },
  {
    id: "PAUD-3298",
    type: "MICROSERVICE_REDEPLOY",
    tenant: "Platform",
    detail: "Transcription Engine v2.4.1 — rolling update completed successfully",
    actor: "CI/CD Pipeline",
    occurredAt: "Jul 7, 2026 · 8:41 AM",
    occurredAtSort: 20260707_0841,
  },
  {
    id: "PAUD-3287",
    type: "API_KEY_ISSUED",
    tenant: "Legal-Pro Tenant Hub",
    detail: "New API key issued, scoped to read-only reporting",
    actor: "System",
    occurredAt: "Jul 6, 2026 · 6:55 PM",
    occurredAtSort: 20260706_1855,
  },
  {
    id: "PAUD-3271",
    type: "ESCALATED_ACCESS",
    tenant: "Wellbeing Clinic",
    detail: "Viewed private clinical notes — billing dispute verification",
    actor: "Admin_Priya",
    occurredAt: "Jul 5, 2026 · 3:22 PM",
    occurredAtSort: 20260705_1522,
  },
];

const typeLabel: Record<EventType, string> = {
  TENANT_CREATED: "Tenant Created",
  ESCALATED_ACCESS: "Escalated Access",
  MICROSERVICE_REDEPLOY: "Microservice Redeploy",
  API_KEY_ISSUED: "API Key Issued",
};

const typeIcon: Record<EventType, LucideIcon> = {
  TENANT_CREATED: Building2,
  ESCALATED_ACCESS: ShieldAlert,
  MICROSERVICE_REDEPLOY: RefreshCw,
  API_KEY_ISSUED: KeyRound,
};

const typeBadgeClass: Record<EventType, string> = {
  TENANT_CREATED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  ESCALATED_ACCESS:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  MICROSERVICE_REDEPLOY:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400",
  API_KEY_ISSUED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
};

const typeDotClass: Record<EventType, string> = {
  TENANT_CREATED: "bg-blue-500",
  ESCALATED_ACCESS: "bg-amber-500",
  MICROSERVICE_REDEPLOY: "bg-violet-500",
  API_KEY_ISSUED: "bg-emerald-500",
};

const tenants = Array.from(new Set(initialEntries.map((e) => e.tenant)));

export function AuditLogTable() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return initialEntries
      .filter((e) => typeFilter === "all" || e.type === typeFilter)
      .filter((e) => tenantFilter === "all" || e.tenant === tenantFilter)
      .filter((e) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          e.id.toLowerCase().includes(query) ||
          e.tenant.toLowerCase().includes(query) ||
          e.actor.toLowerCase().includes(query) ||
          e.detail.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => b.occurredAtSort - a.occurredAtSort);
  }, [typeFilter, tenantFilter, search]);

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          System Events &amp; Audit Log
        </CardTitle>
        <CardAction className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tenant, actor, event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-9 sm:w-56"
            />
          </div>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value ?? "all")}>
            <SelectTrigger size="sm" className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {(Object.keys(typeLabel) as EventType[]).map((type) => (
                <SelectItem key={type} value={type}>
                  {typeLabel[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tenantFilter} onValueChange={(value) => setTenantFilter(value ?? "all")}>
            <SelectTrigger size="sm" className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tenants</SelectItem>
              {tenants.map((tenant) => (
                <SelectItem key={tenant} value={tenant}>
                  {tenant}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No audit events match these filters.
          </p>
        ) : (
          <ol className="relative flex flex-col gap-6 border-l border-border pl-6">
            {filtered.map((entry) => {
              const Icon = typeIcon[entry.type];
              return (
                <li key={entry.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card",
                      typeDotClass[entry.type]
                    )}
                  />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("gap-1", typeBadgeClass[entry.type])}>
                          <Icon className="h-3 w-3" />
                          {typeLabel[entry.type]}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {entry.tenant}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.id}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.detail}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <UserCog className="h-3 w-3" />
                        {entry.actor}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {entry.occurredAt}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
