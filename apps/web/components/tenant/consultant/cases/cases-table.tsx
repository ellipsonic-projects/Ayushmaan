"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  MessageSquareText,
  ShieldAlert,
  ListTodo,
  FolderOpen,
  ChevronRight,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenantSlug } from "@/lib/tenant/slug-context";
import type { CaseStatus, TenantCase } from "@/lib/api/cases.server";

const statusLabel: Record<CaseStatus, string> = {
  PENDING_ASSIGNMENT: "Unclaimed",
  ACTIVE: "Open",
  ON_HOLD: "On Hold",
  CLOSED: "Closed",
};

const statusBadgeClass: Record<CaseStatus, string> = {
  PENDING_ASSIGNMENT:
    "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-400",
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  ON_HOLD:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  CLOSED: "border-border text-muted-foreground",
};

const avatarClasses = [
  "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
  "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  "bg-secondary text-secondary-foreground",
];

function avatarClassFor(id: string) {
  const hash = id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return avatarClasses[hash % avatarClasses.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function caseCode(item: TenantCase) {
  return item.matterKey ?? `#${item.id.slice(0, 8)}`;
}

const statusTabs: ("All" | CaseStatus)[] = ["All", "ACTIVE", "ON_HOLD", "CLOSED"];

export function CasesTable({ cases }: { cases: TenantCase[] }) {
  const slug = useTenantSlug();
  const [statusFilter, setStatusFilter] = useState<"All" | CaseStatus>("All");
  const [query, setQuery] = useState("");

  const filtered = cases.filter((item) => {
    if (statusFilter !== "All" && item.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.client.fullName.toLowerCase().includes(q) ||
      caseCode(item).toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as "All" | CaseStatus)}
          >
            <TabsList variant="line">
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {tab === "All" ? "All" : statusLabel[tab]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="relative sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search cases..."
              className="h-9 pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 px-4">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No cases match your search.
            </p>
          ) : (
            filtered.map((item) => (
              <Link
                key={item.id}
                href={`/${slug}/tenant/consultant/cases/${item.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${avatarClassFor(item.id)}`}
                  >
                    {initials(item.client.fullName)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{item.client.fullName}</p>
                      <Badge variant="outline" className={statusBadgeClass[item.status]}>
                        {statusLabel[item.status]}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {caseCode(item)} &middot; {item.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden items-center gap-3 sm:flex">
                    <StatChip
                      icon={MessageSquareText}
                      value={item._count.interactions}
                      label="Interactions"
                    />
                    <StatChip
                      icon={ShieldAlert}
                      value={item._count.commitments}
                      label="Commitments"
                    />
                    <StatChip icon={ListTodo} value={item._count.tasks} label="Tasks" />
                    <StatChip icon={FolderOpen} value={item._count.documents} label="Documents" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {item.status === "CLOSED" ? "Closed" : "Last activity"}
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Open case for ${item.client.fullName}`}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </Link>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatChip({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof MessageSquareText;
  value: number;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title={label}>
      <Icon className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}
