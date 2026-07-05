"use client";

import { Database, Ban, ShieldCheck, Radio, Filter, Search, MoreVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

type Urgency = "Warning" | "Critical" | "Info";
type Type = "Global" | "Targeted";

type Broadcast = {
  id: string;
  title: string;
  timestamp: string;
  type: Type;
  urgency: Urgency;
  reach: string;
  icon: LucideIcon;
  iconClass: string;
};

const broadcasts: Broadcast[] = [
  {
    id: "BC-1",
    title: "Scheduled Database Maintenance",
    timestamp: "Oct 26, 2023 · 02:00 AM UTC",
    type: "Global",
    urgency: "Warning",
    reach: "92%",
    icon: Database,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
  },
  {
    id: "BC-2",
    title: "Tenant Suspension: Apollo Clinic",
    timestamp: "Oct 25, 2023 · 04:15 PM UTC",
    type: "Targeted",
    urgency: "Critical",
    reach: "100%",
    icon: Ban,
    iconClass: "bg-red-500/10 text-red-600 dark:text-red-500",
  },
  {
    id: "BC-3",
    title: "New Security Policy Update",
    timestamp: "Oct 24, 2023 · 11:00 AM UTC",
    type: "Global",
    urgency: "Info",
    reach: "88%",
    icon: ShieldCheck,
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-500",
  },
  {
    id: "BC-4",
    title: "Service Outage: SMS Gateway",
    timestamp: "Oct 24, 2023 · 09:30 AM UTC",
    type: "Global",
    urgency: "Critical",
    reach: "97%",
    icon: Radio,
    iconClass: "bg-red-500/10 text-red-600 dark:text-red-500",
  },
];

const urgencyClass: Record<Urgency, string> = {
  Warning:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  Info: "border-border bg-muted text-foreground",
};

export function BroadcastsTable() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Recent Broadcasts
          <Badge variant="outline" className="text-[10px]">
            {broadcasts.length * 10 + 2} TOTAL
          </Badge>
        </CardTitle>
        <CardAction className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search history..." className="h-9 w-48 pl-9" />
          </div>
          <Button variant="outline" size="sm" className="h-9 gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Broadcast Details</th>
                <th className="py-2 pr-4 font-medium">Type</th>
                <th className="py-2 pr-4 font-medium">Urgency</th>
                <th className="py-2 pr-4 font-medium">Reach</th>
                <th className="py-2 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${b.iconClass}`}
                      >
                        <b.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {b.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {b.timestamp}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {b.type}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={urgencyClass[b.urgency]}>
                      {b.urgency.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background">
                        {b.type === "Global" ? "A" : "T"}
                      </span>
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500">
                        {b.reach}
                      </span>
                    </div>
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
      </CardContent>
    </Card>
  );
}
