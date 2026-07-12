"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  Eye,
  Pencil,
  Ban,
  RotateCcw,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardAction, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// consultant_category enum — schema §3.8
type Category = "MEDICAL" | "LEGAL" | "IT" | "PHYSIOTHERAPY" | "HOMEOPATHY" | "ASTROLOGY";

// users.account_status — schema §3.4 (BANNED/DELETED are platform-only actions,
// not exposed to a Tenant Admin here)
type AccountStatus = "ACTIVE" | "SUSPENDED";

type Consultant = {
  id: string;
  fullName: string;
  email: string;
  avatarClass: string;
  category: Category;
  subSpecialization: string;
  consultationFee: number;
  currency: string;
  ratingAvg: number;
  ratingCount: number;
  caseCount: number;
  isAcceptingNewClients: boolean;
  accountStatus: AccountStatus;
};

const initialConsultants: Consultant[] = [
  {
    id: "CON-1042",
    fullName: "Amit Shah",
    email: "amit.shah@ayushman.health",
    avatarClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    category: "MEDICAL",
    subSpecialization: "Cardiology",
    consultationFee: 1500,
    currency: "INR",
    ratingAvg: 4.9,
    ratingCount: 214,
    caseCount: 86,
    isAcceptingNewClients: true,
    accountStatus: "ACTIVE",
  },
  {
    id: "CON-0997",
    fullName: "Meera Iyer",
    email: "meera.iyer@ayushman.health",
    avatarClass: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    category: "PHYSIOTHERAPY",
    subSpecialization: "Sports Injury",
    consultationFee: 1200,
    currency: "INR",
    ratingAvg: 4.7,
    ratingCount: 132,
    caseCount: 54,
    isAcceptingNewClients: true,
    accountStatus: "ACTIVE",
  },
  {
    id: "CON-0954",
    fullName: "Karan Walia",
    email: "karan.walia@ayushman.health",
    avatarClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
    category: "LEGAL",
    subSpecialization: "Family Law",
    consultationFee: 2200,
    currency: "INR",
    ratingAvg: 4.5,
    ratingCount: 61,
    caseCount: 29,
    isAcceptingNewClients: false,
    accountStatus: "ACTIVE",
  },
  {
    id: "CON-0888",
    fullName: "Priya Nair",
    email: "priya.nair@ayushman.health",
    avatarClass: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    category: "HOMEOPATHY",
    subSpecialization: "Wellness Coaching",
    consultationFee: 900,
    currency: "INR",
    ratingAvg: 4.6,
    ratingCount: 98,
    caseCount: 41,
    isAcceptingNewClients: true,
    accountStatus: "SUSPENDED",
  },
];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "MEDICAL", label: "Medical" },
  { value: "LEGAL", label: "Legal" },
  { value: "IT", label: "IT" },
  { value: "PHYSIOTHERAPY", label: "Physiotherapy" },
  { value: "HOMEOPATHY", label: "Homeopathy" },
  { value: "ASTROLOGY", label: "Astrology" },
];

const categoryLabel: Record<Category, string> = {
  MEDICAL: "Medical",
  LEGAL: "Legal",
  IT: "IT",
  PHYSIOTHERAPY: "Physiotherapy",
  HOMEOPATHY: "Homeopathy",
  ASTROLOGY: "Astrology",
};

const statusBadgeClass: Record<AccountStatus, string> = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  SUSPENDED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");
}

type SortKey = "fullName" | "consultationFee" | "ratingAvg" | "caseCount";
type SortDirection = "asc" | "desc";

const columns: { key: SortKey; label: string }[] = [
  { key: "fullName", label: "Consultant" },
  { key: "consultationFee", label: "Fee" },
  { key: "ratingAvg", label: "Rating" },
  { key: "caseCount", label: "Cases" },
];

export function ConsultantsTable() {
  const [consultants, setConsultants] = useState<Consultant[]>(initialConsultants);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page] = useState(1);
  const [pendingSuspend, setPendingSuspend] = useState<Consultant | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  }

  function toggleAccepting(id: string) {
    setConsultants((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isAcceptingNewClients: !c.isAcceptingNewClients } : c))
    );
  }

  function confirmSuspendToggle() {
    if (!pendingSuspend) return;
    setConsultants((prev) =>
      prev.map((c) =>
        c.id === pendingSuspend.id
          ? {
              ...c,
              accountStatus: c.accountStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE",
            }
          : c
      )
    );
    setPendingSuspend(null);
  }

  const filtered = useMemo(() => {
    return consultants
      .filter((c) => categoryFilter === "all" || c.category === categoryFilter)
      .filter((c) => statusFilter === "all" || c.accountStatus === statusFilter)
      .filter((c) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          c.fullName.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.subSpecialization.toLowerCase().includes(query) ||
          c.id.toLowerCase().includes(query)
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
  }, [consultants, categoryFilter, statusFilter, search, sortKey, sortDirection]);

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>All Consultants</CardTitle>
        <CardAction className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, specialization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-9 sm:w-64"
            />
          </div>
          <Select
            value={categoryFilter}
            onValueChange={(value) => setCategoryFilter(value ?? "all")}
          >
            <SelectTrigger size="sm" className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger size="sm" className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                {columns.map((col) => (
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
                <th className="py-2 pr-4 font-medium">Accepting Clients</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${c.avatarClass}`}
                      >
                        {initials(c.fullName)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{c.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabel[c.category]} · {c.subSpecialization}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono tabular-nums text-foreground">
                    {c.currency} {c.consultationFee.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-1 text-foreground">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {c.ratingAvg.toFixed(1)}
                      <span className="text-xs text-muted-foreground">({c.ratingCount})</span>
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-foreground">{c.caseCount}</td>
                  <td className="py-3 pr-4">
                    <Switch
                      checked={c.isAcceptingNewClients}
                      onCheckedChange={() => toggleAccepting(c.id)}
                      aria-label={`Toggle accepting new clients for ${c.fullName}`}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={statusBadgeClass[c.accountStatus]}>
                      {c.accountStatus}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link href="/slug/consultants/consultant_id">
                        <Button variant="ghost" size="icon-sm" aria-label="View consultant">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Link href="/slug/consultants/consultant_id">
                        <Button variant="ghost" size="icon-sm" aria-label="Edit consultant">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          c.accountStatus === "ACTIVE"
                            ? "Suspend consultant"
                            : "Reactivate consultant"
                        }
                        onClick={() => setPendingSuspend(c)}
                        className={
                          c.accountStatus === "ACTIVE"
                            ? "text-destructive hover:text-destructive"
                            : undefined
                        }
                      >
                        {c.accountStatus === "ACTIVE" ? (
                          <Ban className="h-3.5 w-3.5" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No consultants match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filtered.length} of {consultants.length} consultants
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

      <Dialog
        open={pendingSuspend !== null}
        onOpenChange={(open) => !open && setPendingSuspend(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingSuspend?.accountStatus === "ACTIVE"
                ? "Suspend this consultant?"
                : "Reactivate this consultant?"}
            </DialogTitle>
            <DialogDescription>
              {pendingSuspend?.accountStatus === "ACTIVE"
                ? `${pendingSuspend?.fullName} will be removed from public booking and their existing clients will be notified. This can be reversed at any time.`
                : `${pendingSuspend?.fullName} will regain access to their account and become bookable again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant={pendingSuspend?.accountStatus === "ACTIVE" ? "destructive" : "default"}
              onClick={confirmSuspendToggle}
            >
              {pendingSuspend?.accountStatus === "ACTIVE" ? "Suspend" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
