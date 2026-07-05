"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
} from "lucide-react";

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

// Escalated-access actions a Tenant Admin can generate — schema §1.2, §1.4
type AuditAction =
  | "VIEWED_PRIVATE_NOTES"
  | "OPENED_DISPUTE_CASE"
  | "OPENED_GRIEVANCE_LINKED_CASE";

type AuditEntry = {
  id: string;
  action: AuditAction;
  consultant: string;
  caseRef: string;
  reason: string;
  occurredAt: string;
  occurredAtSort: number;
};

const initialEntries: AuditEntry[] = [
  {
    id: "AUD-2041",
    action: "VIEWED_PRIVATE_NOTES",
    consultant: "Dr. Meera Iyer",
    caseRef: "CASE-1042",
    reason: "Client disputed session outcome — verifying session notes",
    occurredAt: "Jul 4, 2026 · 4:12 PM",
    occurredAtSort: 20260704_1612,
  },
  {
    id: "AUD-2038",
    action: "OPENED_DISPUTE_CASE",
    consultant: "Dr. Amit Shah",
    caseRef: "CASE-0997",
    reason: "No-show dispute mediation (FR36)",
    occurredAt: "Jul 2, 2026 · 11:05 AM",
    occurredAtSort: 20260702_1105,
  },
  {
    id: "AUD-2029",
    action: "OPENED_GRIEVANCE_LINKED_CASE",
    consultant: "Dr. Karan Walia",
    caseRef: "CASE-0954",
    reason: "Client grievance referenced this case for context",
    occurredAt: "Jun 29, 2026 · 9:41 AM",
    occurredAtSort: 20260629_0941,
  },
  {
    id: "AUD-2015",
    action: "VIEWED_PRIVATE_NOTES",
    consultant: "Dr. Priya Nair",
    caseRef: "CASE-0888",
    reason: "Billing dispute — confirming session was delivered",
    occurredAt: "Jun 25, 2026 · 3:22 PM",
    occurredAtSort: 20260625_1522,
  },
];

const actionLabel: Record<AuditAction, string> = {
  VIEWED_PRIVATE_NOTES: "Viewed Private Notes",
  OPENED_DISPUTE_CASE: "Opened Dispute Case",
  OPENED_GRIEVANCE_LINKED_CASE: "Opened Grievance-Linked Case",
};

const actionClass: Record<AuditAction, string> = {
  VIEWED_PRIVATE_NOTES:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  OPENED_DISPUTE_CASE:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  OPENED_GRIEVANCE_LINKED_CASE:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-400",
};

const consultants = Array.from(new Set(initialEntries.map((e) => e.consultant)));

type SortKey = "occurredAtSort" | "consultant" | "caseRef";
type SortDirection = "asc" | "desc";

const columns: { key: SortKey; label: string }[] = [
  { key: "occurredAtSort", label: "When" },
  { key: "consultant", label: "Consultant" },
  { key: "caseRef", label: "Case" },
];

export function AuditLogTable() {
  const [actionFilter, setActionFilter] = useState("all");
  const [consultantFilter, setConsultantFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("occurredAtSort");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [page] = useState(1);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  const filtered = useMemo(() => {
    return initialEntries
      .filter((e) => actionFilter === "all" || e.action === actionFilter)
      .filter((e) => consultantFilter === "all" || e.consultant === consultantFilter)
      .filter((e) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          e.id.toLowerCase().includes(query) ||
          e.caseRef.toLowerCase().includes(query) ||
          e.consultant.toLowerCase().includes(query) ||
          e.reason.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const dir = sortDirection === "asc" ? 1 : -1;
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return aVal.localeCompare(bVal) * dir;
        }
        return ((aVal as number) - (bVal as number)) * dir;
      });
  }, [actionFilter, consultantFilter, search, sortKey, sortDirection]);

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Escalated-Access History</CardTitle>
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
          <Select
            value={actionFilter}
            onValueChange={(value) => setActionFilter(value ?? "all")}
          >
            <SelectTrigger size="sm" className="h-9 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {(Object.keys(actionLabel) as AuditAction[]).map((action) => (
                <SelectItem key={action} value={action}>
                  {actionLabel[action]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={consultantFilter}
            onValueChange={(value) => setConsultantFilter(value ?? "all")}
          >
            <SelectTrigger size="sm" className="h-9 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Consultants</SelectItem>
              {consultants.map((consultant) => (
                <SelectItem key={consultant} value={consultant}>
                  {consultant}
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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Log ID</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                {columns.slice(1).map((col) => (
                  <th key={col.key} className="py-2 pr-4 font-medium">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="h-3 w-3" />
                        ) : (
                          <ArrowDown className="h-3 w-3" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-40" />
                      )}
                    </button>
                  </th>
                ))}
                <th className="py-2 pr-4 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("occurredAtSort")}
                    className="flex items-center gap-1 hover:text-foreground"
                  >
                    When
                    {sortKey === "occurredAtSort" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </th>
                <th className="py-2 pr-4 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {entry.id}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={actionClass[entry.action]}>
                      {actionLabel[entry.action]}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-foreground">{entry.consultant}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{entry.caseRef}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {entry.occurredAt}
                  </td>
                  <td className="py-3 pr-4 max-w-xs truncate text-muted-foreground">
                    {entry.reason}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    No escalated-access events match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filtered.length} of {initialEntries.length} events
          </span>
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
