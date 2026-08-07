"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

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
import type { TenantAuditLogEntry } from "@/lib/api/audit-log.server";

function actionLabel(action: string) {
  return action
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

function actorLabel(entry: TenantAuditLogEntry) {
  return entry.actor?.consultantProfile?.fullName ?? entry.actor?.email ?? "Unknown";
}

function caseRef(entry: TenantAuditLogEntry) {
  return entry.case?.matterKey ?? entry.entityId ?? "—";
}

export function AuditLogTable({ entries }: { entries: TenantAuditLogEntry[] }) {
  const [actionFilter, setActionFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [search, setSearch] = useState("");

  const actions = useMemo(() => Array.from(new Set(entries.map((e) => e.action))), [entries]);
  const actors = useMemo(() => Array.from(new Set(entries.map((e) => actorLabel(e)))), [entries]);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => actionFilter === "all" || e.action === actionFilter)
      .filter((e) => actorFilter === "all" || actorLabel(e) === actorFilter)
      .filter((e) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          caseRef(e).toLowerCase().includes(query) ||
          actorLabel(e).toLowerCase().includes(query) ||
          (e.reason ?? "").toLowerCase().includes(query)
        );
      });
  }, [entries, actionFilter, actorFilter, search]);

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Escalated-Access History
        </CardTitle>
        <CardAction className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search case, consultant, reason..."
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
              <SelectItem value="all">All Actions</SelectItem>
              {actions.map((action) => (
                <SelectItem key={action} value={action}>
                  {actionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={actorFilter} onValueChange={(value) => setActorFilter(value ?? "all")}>
            <SelectTrigger size="sm" className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Consultants</SelectItem>
              {actors.map((actor) => (
                <SelectItem key={actor} value={actor}>
                  {actor}
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
            No escalated-access events match these filters.
          </p>
        ) : (
          <ol className="relative flex flex-col gap-6 border-l border-border pl-6">
            {filtered.map((entry) => (
              <li key={entry.id} className="relative">
                <span
                  className={`absolute -left-[29px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-card ${
                    entry.isCrossTenantAccess ? "bg-amber-500" : "bg-blue-500"
                  }`}
                />
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{actionLabel(entry.action)}</Badge>
                      <span className="text-sm font-medium text-foreground">
                        {actorLabel(entry)}
                      </span>
                      <span className="text-xs text-muted-foreground">{caseRef(entry)}</span>
                    </div>
                    {entry.reason && (
                      <p className="text-sm text-muted-foreground">{entry.reason}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
