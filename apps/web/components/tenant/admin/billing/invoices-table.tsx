"use client";

import { useMemo, useState } from "react";
import { Download, Search, Send } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type InvoiceStatus = "Unpaid" | "Paid" | "Overdue" | "Void";

type Invoice = {
  number: string;
  client: string;
  provider: string;
  issued: string;
  due: string;
  amount: number;
  status: InvoiceStatus;
};

const initialInvoices: Invoice[] = [
  {
    number: "000005",
    client: "Rahul Hegde",
    provider: "Dr. Amit Shah",
    issued: "Oct 24, 2023",
    due: "Nov 7, 2023",
    amount: 1500,
    status: "Paid",
  },
  {
    number: "000004",
    client: "Sarah Lawson",
    provider: "Dr. Meera Iyer",
    issued: "Oct 23, 2023",
    due: "Nov 6, 2023",
    amount: 2200,
    status: "Unpaid",
  },
  {
    number: "000003",
    client: "David Kim",
    provider: "Dr. Karan Walia",
    issued: "Oct 22, 2023",
    due: "Oct 29, 2023",
    amount: 1800,
    status: "Overdue",
  },
  {
    number: "000002",
    client: "Mira Sethi",
    provider: "Dr. Amit Shah",
    issued: "Oct 21, 2023",
    due: "Nov 4, 2023",
    amount: 1500,
    status: "Paid",
  },
  {
    number: "000001",
    client: "Arjun Verma",
    provider: "Dr. Priya Nair",
    issued: "Oct 20, 2023",
    due: "Nov 3, 2023",
    amount: 1200,
    status: "Void",
  },
];

const statusOptions: InvoiceStatus[] = ["Unpaid", "Paid", "Overdue", "Void"];

const statusClass: Record<InvoiceStatus, string> = {
  Unpaid:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  Overdue:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  Void: "border-border bg-muted text-foreground",
};

export function InvoicesTable() {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  function updateStatus(number: string, status: InvoiceStatus) {
    setInvoices((prev) =>
      prev.map((inv) => (inv.number === number ? { ...inv, status } : inv))
    );
  }

  const filtered = useMemo(() => {
    return invoices
      .filter(
        (inv) =>
          statusFilter === "all" || inv.status.toLowerCase() === statusFilter
      )
      .filter((inv) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return (
          inv.number.includes(query) ||
          inv.client.toLowerCase().includes(query) ||
          inv.provider.toLowerCase().includes(query)
        );
      });
  }, [invoices, statusFilter, search]);

  const outstanding = invoices
    .filter((inv) => inv.status === "Unpaid" || inv.status === "Overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <Card>
      <CardHeader className="flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Invoices</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Outstanding balance:{" "}
            <span className="font-semibold text-amber-600 dark:text-amber-500">
              ₹{outstanding.toLocaleString("en-IN")}
            </span>
          </p>
        </div>
        <CardAction className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoice, client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-9 sm:w-48"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value ?? "all")}
          >
            <SelectTrigger size="sm" className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status.toLowerCase()}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Invoice #</th>
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 font-medium">Provider</th>
                <th className="py-2 pr-4 font-medium">Issued</th>
                <th className="py-2 pr-4 font-medium">Due</th>
                <th className="py-2 pr-4 text-right font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.number} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-semibold text-primary">
                    {inv.number}
                  </td>
                  <td className="py-3 pr-4 text-foreground">{inv.client}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {inv.provider}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{inv.issued}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{inv.due}</td>
                  <td className="py-3 pr-4 text-right font-mono font-semibold tabular-nums text-foreground">
                    ₹{inv.amount.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 pr-4">
                    <Select
                      value={inv.status}
                      onValueChange={(value) =>
                        value && updateStatus(inv.number, value as InvoiceStatus)
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn(
                          "h-7 w-28 border-none text-xs font-medium",
                          statusClass[inv.status]
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        disabled={inv.status === "Paid" || inv.status === "Void"}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Remind
                      </Button>
                      <Button variant="ghost" size="icon-sm">
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-sm text-muted-foreground"
                  >
                    No invoices match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
