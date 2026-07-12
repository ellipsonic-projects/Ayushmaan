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

type PaymentStatus = "Paid" | "Pending" | "Refunded" | "Failed";

// appointment_status enum — schema_ayushman_v3.md §3.12
type OperationsStatus =
  "REQUESTED" | "APPROVED" | "RESCHEDULE_PROPOSED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

type Booking = {
  id: string;
  client: string;
  consultant: string;
  scheduledAt: string;
  scheduledAtSort: number;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  operationsStatus: OperationsStatus;
};

const initialBookings: Booking[] = [
  {
    id: "BKG-4821",
    client: "Rahul Hegde",
    consultant: "Amit Shah",
    scheduledAt: "Oct 24, 2023 · 10:00 AM",
    scheduledAtSort: 20231024_1000,
    amount: 1500,
    currency: "INR",
    paymentStatus: "Paid",
    operationsStatus: "COMPLETED",
  },
  {
    id: "BKG-4819",
    client: "Sarah Lawson",
    consultant: "Meera Iyer",
    scheduledAt: "Oct 23, 2023 · 11:30 AM",
    scheduledAtSort: 20231023_1130,
    amount: 2200,
    currency: "INR",
    paymentStatus: "Pending",
    operationsStatus: "APPROVED",
  },
  {
    id: "BKG-4802",
    client: "David Kim",
    consultant: "Karan Walia",
    scheduledAt: "Oct 22, 2023 · 01:15 PM",
    scheduledAtSort: 20231022_1315,
    amount: 1800,
    currency: "INR",
    paymentStatus: "Refunded",
    operationsStatus: "CANCELLED",
  },
  {
    id: "BKG-4795",
    client: "Mira Sethi",
    consultant: "Amit Shah",
    scheduledAt: "Oct 21, 2023 · 02:30 PM",
    scheduledAtSort: 20231021_1430,
    amount: 1500,
    currency: "INR",
    paymentStatus: "Paid",
    operationsStatus: "COMPLETED",
  },
  {
    id: "BKG-4788",
    client: "Arjun Verma",
    consultant: "Priya Nair",
    scheduledAt: "Oct 20, 2023 · 09:00 AM",
    scheduledAtSort: 20231020_0900,
    amount: 1200,
    currency: "INR",
    paymentStatus: "Failed",
    operationsStatus: "NO_SHOW",
  },
];

const consultants = Array.from(new Set(initialBookings.map((b) => b.consultant)));

const paymentStatusClass: Record<PaymentStatus, string> = {
  Paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  Pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Refunded: "border-border bg-muted text-foreground",
  Failed:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

const operationsStatusOptions: { value: OperationsStatus; label: string }[] = [
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "RESCHEDULE_PROPOSED", label: "Reschedule Proposed" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No Show" },
];

const operationsStatusClass: Record<OperationsStatus, string> = {
  REQUESTED:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  APPROVED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  RESCHEDULE_PROPOSED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  COMPLETED: "border-border bg-muted text-foreground",
  CANCELLED:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  NO_SHOW:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

type SortKey = "scheduledAtSort" | "amount" | "client" | "consultant";
type SortDirection = "asc" | "desc";

const columns: { key: SortKey; label: string }[] = [
  { key: "client", label: "Client" },
  { key: "consultant", label: "Consultant" },
  { key: "scheduledAtSort", label: "Date & Time" },
  { key: "amount", label: "Amount" },
];

export function BookingsPaymentsLedger() {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [statusFilter, setStatusFilter] = useState("all");
  const [consultantFilter, setConsultantFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("scheduledAtSort");
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

  function updateOperationsStatus(id: string, operationsStatus: OperationsStatus) {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, operationsStatus } : b)));
  }

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => statusFilter === "all" || b.paymentStatus.toLowerCase() === statusFilter)
      .filter((b) => consultantFilter === "all" || b.consultant === consultantFilter)
      .filter((b) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          b.id.toLowerCase().includes(query) ||
          b.client.toLowerCase().includes(query) ||
          b.consultant.toLowerCase().includes(query)
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
  }, [bookings, statusFilter, consultantFilter, search, sortKey, sortDirection]);

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 border-b-2 border-double border-border sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Ledger — Bookings &amp; Payments
        </CardTitle>
        <CardAction className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search booking, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-9 sm:w-48"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger size="sm" className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
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
                <th className="py-2 pr-4 font-medium">Booking ID</th>
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
                <th className="py-2 pr-4 font-medium">Payment Status</th>
                <th className="py-2 pr-4 font-medium">Operations Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((booking) => (
                <tr key={booking.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground">{booking.id}</td>
                  <td className="py-3 pr-4 text-foreground">{booking.client}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{booking.consultant}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{booking.scheduledAt}</td>
                  <td className="py-3 pr-4 font-mono font-medium tabular-nums text-foreground">
                    {booking.currency} {booking.amount.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={paymentStatusClass[booking.paymentStatus]}>
                      {booking.paymentStatus.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <Select
                      value={booking.operationsStatus}
                      onValueChange={(value) =>
                        value && updateOperationsStatus(booking.id, value as OperationsStatus)
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          "h-7 w-44 border-none text-xs font-medium",
                          operationsStatusClass[booking.operationsStatus]
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operationsStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-sm text-muted-foreground">
                    No bookings match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {filtered.length} of {bookings.length} bookings
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
