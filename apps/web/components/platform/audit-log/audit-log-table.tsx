"use client";

import { useMemo, useState } from "react";
import { Building2, Download, Search, ShieldAlert } from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
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
import { useAuditLog } from "@/lib/hooks";

function actionLabel(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function AuditLogTable() {
  const { entries, isLoading, error } = useAuditLog();
  const [actionFilter, setActionFilter] = useState("all");
  const [tenantFilter, setTenantFilter] = useState("all");
  const [search, setSearch] = useState("");

  const actions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.action))).sort(),
    [entries]
  );
  const tenants = useMemo(
    () =>
      Array.from(
        new Set(entries.map((e) => e.tenant?.displayName).filter((t): t is string => !!t))
      ).sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (tenantFilter !== "all" && e.tenant?.displayName !== tenantFilter) return false;
      if (!query) return true;
      return (
        e.id.toLowerCase().includes(query) ||
        e.entityType.toLowerCase().includes(query) ||
        (e.entityId ?? "").toLowerCase().includes(query) ||
        (e.tenant?.displayName ?? "").toLowerCase().includes(query) ||
        (e.actor?.email ?? "").toLowerCase().includes(query) ||
        e.action.toLowerCase().includes(query)
      );
    });
  }, [entries, actionFilter, tenantFilter, search]);

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
          <Select value={actionFilter} onValueChange={(value) => setActionFilter(value ?? "all")}>
            <SelectTrigger size="sm" className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {actions.map((action) => (
                <SelectItem key={action} value={action}>
                  {actionLabel(action)}
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
        {isLoading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading audit log…</p>
        ) : error ? (
          <p className="py-6 text-center text-sm text-destructive">Failed to load audit log.</p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No audit events match these filters.
          </p>
        ) : (
          <ol className="relative flex flex-col gap-6 border-l border-border pl-6">
            {filtered.map((entry) => {
              const Icon = entry.isCrossTenantAccess ? ShieldAlert : Building2;
              return (
                <li key={entry.id} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card",
                      entry.isCrossTenantAccess ? "bg-amber-500" : "bg-blue-500"
                    )}
                  />
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1",
                            entry.isCrossTenantAccess
                              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                              : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400"
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {actionLabel(entry.action)}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {entry.tenant?.displayName ?? "Platform"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {entry.entityType}
                        {entry.entityId ? ` · ${entry.entityId}` : ""}
                        {entry.reason ? ` — ${entry.reason}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actor?.email ?? entry.actorUserId} ({entry.actorRole})
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                      {formatTimestamp(entry.createdAt)}
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
