"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MoreVertical } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Transaction = {
  id: string;
  tenant: string;
  amount: string;
  status: "Succeeded" | "Processing" | "Failed";
  timestamp: string;
};

const transactions: Transaction[] = [
  {
    id: "TXN-849281-B",
    tenant: "Apollo Health Hub",
    amount: "$12,450.00",
    status: "Succeeded",
    timestamp: "Oct 12, 14:23:01",
  },
  {
    id: "TXN-912234-A",
    tenant: "City Care Diagnostics",
    amount: "$2,100.00",
    status: "Processing",
    timestamp: "Oct 12, 14:18:45",
  },
  {
    id: "TXN-773431-C",
    tenant: "Wellness Global",
    amount: "$890.00",
    status: "Failed",
    timestamp: "Oct 12, 13:55:12",
  },
  {
    id: "TXN-442198-D",
    tenant: "Metro Heart Center",
    amount: "$45,000.00",
    status: "Succeeded",
    timestamp: "Oct 12, 13:42:00",
  },
];

const statusDot: Record<Transaction["status"], string> = {
  Succeeded: "bg-emerald-500",
  Processing: "bg-blue-500",
  Failed: "bg-red-500",
};

const statusClass: Record<Transaction["status"], string> = {
  Succeeded:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
  Processing: "bg-blue-500/10 text-blue-600 dark:text-blue-500",
  Failed: "bg-destructive/10 text-destructive",
};

export function TransactionLedger() {
  const [page] = useState(1);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Global Transaction Ledger</CardTitle>
        <CardAction className="flex items-center gap-2">
          <Select defaultValue="all-statuses">
            <SelectTrigger size="sm" className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-statuses">All Statuses</SelectItem>
              <SelectItem value="succeeded">Succeeded</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all-tenants">
            <SelectTrigger size="sm" className="h-9 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-tenants">All Tenants</SelectItem>
              <SelectItem value="apollo-health-hub">Apollo Health Hub</SelectItem>
              <SelectItem value="city-care-diagnostics">City Care Diagnostics</SelectItem>
              <SelectItem value="wellness-global">Wellness Global</SelectItem>
              <SelectItem value="metro-heart-center">Metro Heart Center</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Transaction ID</th>
                <th className="py-2 pr-4 font-medium">Tenant Name</th>
                <th className="py-2 pr-4 font-medium">Amount</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Timestamp</th>
                <th className="py-2 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn) => (
                <tr key={txn.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {txn.id}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {txn.tenant}
                  </td>
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {txn.amount}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[txn.status]}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[txn.status]}`} />
                      {txn.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {txn.timestamp}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end">
                      <Button variant="ghost" size="icon-sm">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {transactions.length} of 2,840 transactions</span>
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
