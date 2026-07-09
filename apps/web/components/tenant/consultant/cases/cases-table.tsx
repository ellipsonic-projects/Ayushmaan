"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, MessageSquareText, ShieldAlert, ListTodo, FolderOpen, ChevronRight } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cases, type CaseStatus } from "@/components/tenant/consultant/cases/cases-data";

const statusBadgeClass: Record<CaseStatus, string> = {
  Open: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  "On Hold":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Closed: "border-border text-muted-foreground",
};

const statusTabs: ("All" | CaseStatus)[] = ["All", "Open", "On Hold", "Closed"];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatChip({ icon: Icon, value, label }: { icon: typeof MessageSquareText; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground" title={label}>
      <Icon className="h-3.5 w-3.5" />
      {value}
    </span>
  );
}

export function CasesTable() {
  const [statusFilter, setStatusFilter] = useState<"All" | CaseStatus>("All");
  const [query, setQuery] = useState("");

  const filtered = cases.filter((item) => {
    if (statusFilter !== "All" && item.status !== statusFilter) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      item.clientName.toLowerCase().includes(q) ||
      item.caseCode.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as "All" | CaseStatus)}>
            <TabsList variant="line">
              {statusTabs.map((tab) => (
                <TabsTrigger key={tab} value={tab}>
                  {tab}
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
            <p className="py-8 text-center text-sm text-muted-foreground">No cases match your search.</p>
          ) : (
            filtered.map((item) => (
              <Link
                key={item.id}
                href="id"
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${item.avatarClass}`}
                  >
                    {initials(item.clientName)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{item.clientName}</p>
                      <Badge variant="outline" className={statusBadgeClass[item.status]}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.caseCode} &middot; {item.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden items-center gap-3 sm:flex">
                    <StatChip icon={MessageSquareText} value={item.interactionCount} label="Interactions" />
                    <StatChip icon={ShieldAlert} value={item.commitmentCount} label="Commitments" />
                    <StatChip icon={ListTodo} value={item.taskCount} label="Tasks" />
                    <StatChip icon={FolderOpen} value={item.documentCount} label="Documents" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {item.status === "Closed" ? "Closed" : "Last activity"}
                    </p>
                    <p className="text-xs font-medium text-foreground">
                      {item.status === "Closed" ? item.closedAt : item.lastActivity}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label={`Open case for ${item.clientName}`}>
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
