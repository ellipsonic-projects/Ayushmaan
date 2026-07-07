"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Eye,
  Plus,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type InvoiceStatus = "Unpaid" | "Paid";
type NoteStatus = "None" | "In Progress" | "Signed";

type BilledAppointment = {
  id: string;
  date: string;
  time: string;
  apptStatus: "Confirmed" | "Completed";
  client: string;
  billingMethod: string;
  billed: number;
  unpaid: number;
  paid: number;
  billingItem: string;
  provider: string;
  noteStatus: NoteStatus;
  invoice?: {
    number: string;
    status: InvoiceStatus;
  };
};

const appointments: BilledAppointment[] = [
  {
    id: "APT-1041",
    date: "Oct 24, 2023",
    time: "10:00 — 10:45 AM",
    apptStatus: "Completed",
    client: "Rahul Hegde",
    billingMethod: "Self-pay",
    billed: 1500,
    unpaid: 0,
    paid: 1500,
    billingItem: "Standard Appointment",
    provider: "Dr. Amit Shah",
    noteStatus: "Signed",
    invoice: { number: "000005", status: "Paid" },
  },
  {
    id: "APT-1040",
    date: "Oct 23, 2023",
    time: "11:30 AM — 12:30 PM",
    apptStatus: "Confirmed",
    client: "Sarah Lawson",
    billingMethod: "Self-pay",
    billed: 2200,
    unpaid: 2200,
    paid: 0,
    billingItem: "Initial Assessment",
    provider: "Dr. Meera Iyer",
    noteStatus: "In Progress",
    invoice: { number: "000004", status: "Unpaid" },
  },
  {
    id: "APT-1038",
    date: "Oct 22, 2023",
    time: "01:15 — 02:00 PM",
    apptStatus: "Confirmed",
    client: "David Kim",
    billingMethod: "Self-pay",
    billed: 1800,
    unpaid: 1800,
    paid: 0,
    billingItem: "Follow-up Consultation",
    provider: "Dr. Karan Walia",
    noteStatus: "None",
    invoice: { number: "000003", status: "Unpaid" },
  },
  {
    id: "APT-1036",
    date: "Oct 21, 2023",
    time: "02:30 — 03:15 PM",
    apptStatus: "Completed",
    client: "Mira Sethi",
    billingMethod: "Self-pay",
    billed: 1500,
    unpaid: 0,
    paid: 1500,
    billingItem: "Final Appointment",
    provider: "Dr. Amit Shah",
    noteStatus: "Signed",
    invoice: { number: "000002", status: "Paid" },
  },
  {
    id: "APT-1033",
    date: "Oct 20, 2023",
    time: "09:00 — 09:45 AM",
    apptStatus: "Completed",
    client: "Arjun Verma",
    billingMethod: "Self-pay",
    billed: 1200,
    unpaid: 1200,
    paid: 0,
    billingItem: "Standard Appointment",
    provider: "Dr. Priya Nair",
    noteStatus: "None",
  },
];

const noteStatusClass: Record<NoteStatus, string> = {
  None: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  "In Progress":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Signed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
};

const invoiceStatusClass: Record<InvoiceStatus, string> = {
  Unpaid:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  Paid: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
};

const filterChips = [
  "Clients",
  "Team",
  "Attendance",
  "Billing method",
  "Note status",
  "Invoice status",
  "Billable status",
];

export function BillingOverviewTable() {
  const [range, setRange] = useState("14d");
  const [view, setView] = useState<"all" | "unbilled">("all");
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | InvoiceStatus>(
    "all"
  );

  const unpaidCount = appointments.filter(
    (a) => a.invoice?.status === "Unpaid"
  ).length;
  const paidCount = appointments.filter(
    (a) => a.invoice?.status === "Paid"
  ).length;

  const filtered = useMemo(() => {
    return appointments
      .filter((a) => (view === "unbilled" ? !a.invoice : true))
      .filter((a) =>
        invoiceFilter === "all" ? true : a.invoice?.status === invoiceFilter
      );
  }, [view, invoiceFilter]);

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-3">
          <Select value={range} onValueChange={(v) => v && setRange(v)}>
            <SelectTrigger size="sm" className="h-9 w-40 gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="14d">Last 14 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <div className="inline-flex items-center rounded-md border border-border p-0.5">
            <Button
              size="sm"
              variant={view === "all" ? "default" : "ghost"}
              className="h-7 rounded-sm px-3"
              onClick={() => setView("all")}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={view === "unbilled" ? "default" : "ghost"}
              className="h-7 rounded-sm px-3"
              onClick={() => setView("unbilled")}
            >
              Unbilled
            </Button>
          </div>

          <div className="flex items-center gap-2 border-l border-border pl-3 text-xs font-medium text-muted-foreground">
            <Eye className="h-3.5 w-3.5" />
            Invoices
            <button
              type="button"
              onClick={() =>
                setInvoiceFilter((prev) =>
                  prev === "Unpaid" ? "all" : "Unpaid"
                )
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5",
                invoiceFilter === "Unpaid" && "border-red-300 bg-red-50 dark:bg-red-950"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Unpaid
              <span className="font-semibold text-foreground">{unpaidCount}</span>
            </button>
            <button
              type="button"
              onClick={() =>
                setInvoiceFilter((prev) => (prev === "Paid" ? "all" : "Paid"))
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-0.5",
                invoiceFilter === "Paid" &&
                  "border-emerald-300 bg-emerald-50 dark:bg-emerald-950"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Paid
              <span className="font-semibold text-foreground">{paidCount}</span>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {filterChips.map((chip) => (
            <button
              key={chip}
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-solid hover:text-foreground"
            >
              <Plus className="h-3 w-3" />
              {chip}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" className="gap-1.5 text-primary">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Show
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Appt Date</th>
                  <th className="py-2 pr-4 font-medium">Client</th>
                  <th className="py-2 pr-4 text-right font-medium">Total Billed</th>
                  <th className="py-2 pr-4 text-right font-medium">Total Unpaid</th>
                  <th className="py-2 pr-4 text-right font-medium">Total Paid</th>
                  <th className="py-2 pr-4 font-medium">Billing Items</th>
                  <th className="py-2 pr-4 font-medium">Provider</th>
                  <th className="py-2 pr-4 font-medium">Note Status</th>
                  <th className="py-2 font-medium">Invoices</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((appt) => (
                  <tr key={appt.id} className="border-b border-border last:border-0">
                    <td className="py-3 pr-4 align-top">
                      <p className="font-semibold text-foreground">{appt.date}</p>
                      <p className="text-xs text-muted-foreground">{appt.time}</p>
                      <Badge
                        variant="outline"
                        className="mt-1 border-primary/30 bg-primary/5 text-[10px] text-primary"
                      >
                        {appt.apptStatus}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <p className="font-medium text-primary">{appt.client}</p>
                      <p className="text-xs text-muted-foreground">
                        {appt.billingMethod}
                      </p>
                    </td>
                    <td className="py-3 pr-4 text-right align-top font-mono font-semibold tabular-nums text-foreground">
                      ₹{appt.billed.toLocaleString("en-IN")}
                    </td>
                    <td
                      className={cn(
                        "py-3 pr-4 text-right align-top font-mono tabular-nums",
                        appt.unpaid > 0
                          ? "font-semibold text-amber-600 dark:text-amber-500"
                          : "text-muted-foreground"
                      )}
                    >
                      ₹{appt.unpaid.toLocaleString("en-IN")}
                    </td>
                    <td
                      className={cn(
                        "py-3 pr-4 text-right align-top font-mono tabular-nums",
                        appt.paid > 0
                          ? "font-semibold text-emerald-600 dark:text-emerald-500"
                          : "text-muted-foreground"
                      )}
                    >
                      ₹{appt.paid.toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 pr-4 align-top text-foreground">
                      {appt.billingItem}
                    </td>
                    <td className="py-3 pr-4 align-top text-muted-foreground">
                      {appt.provider}
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", noteStatusClass[appt.noteStatus])}
                      >
                        {appt.noteStatus}
                      </Badge>
                    </td>
                    <td className="py-3 align-top">
                      {appt.invoice ? (
                        <div className="inline-flex min-w-40 flex-col gap-0.5 rounded-lg border border-border px-3 py-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-primary">
                              {appt.invoice.number}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px]",
                                invoiceStatusClass[appt.invoice.status]
                              )}
                            >
                              {appt.invoice.status}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {appt.client}
                          </span>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="h-8 gap-1.5">
                          <Plus className="h-3.5 w-3.5" />
                          Create Invoice
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No appointments match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
