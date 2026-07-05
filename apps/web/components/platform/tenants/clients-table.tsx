"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2 } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Client = {
  name: string;
  clientId: string;
  email: string;
  phone: string;
  consultant: string;
  totalSessions: number;
  lastSessionDate: string;
  status: "Active" | "On Hold" | "Inactive";
  avatarClass: string;
};

const clients: Client[] = [
  {
    name: "Jonathan Sterling",
    clientId: "98234-AX",
    email: "j.sterling@example.com",
    phone: "+1 (555) 012-3456",
    consultant: "Sarah Drummand",
    totalSessions: 128,
    lastSessionDate: "Oct 24, 2023",
    status: "Active",
    avatarClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  },
  {
    name: "Elena Lopez",
    clientId: "77211-BQ",
    email: "elena.l@solutions.net",
    phone: "+1 (555) 987-6543",
    consultant: "Marcus Vance",
    totalSessions: 45,
    lastSessionDate: "Oct 21, 2023",
    status: "On Hold",
    avatarClass:
      "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400",
  },
  {
    name: "Thomas Wright",
    clientId: "44302-MK",
    email: "t.wright@enterprise.com",
    phone: "+1 (555) 234-5678",
    consultant: "Dr. Linda Chen",
    totalSessions: 210,
    lastSessionDate: "Oct 25, 2023",
    status: "Active",
    avatarClass:
      "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
  },
  {
    name: "Beatrice Walsh",
    clientId: "11094-ZZ",
    email: "b.walsh@domain.org",
    phone: "+1 (555) 444-3322",
    consultant: "Kevin Patel",
    totalSessions: 12,
    lastSessionDate: "Oct 12, 2023",
    status: "Inactive",
    avatarClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400",
  },
  {
    name: "Arthur Miller",
    clientId: "66531-HY",
    email: "a.miller@corp.com",
    phone: "+1 (555) 001-2233",
    consultant: "Sarah Drummand",
    totalSessions: 89,
    lastSessionDate: "Oct 25, 2023",
    status: "Active",
    avatarClass:
      "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
];

const statusClass: Record<Client["status"], string> = {
  Active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  "On Hold":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Inactive:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");
}

export function ClientsTable() {
  const [page] = useState(1);

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Client Name</th>
                <th className="py-2 pr-4 font-medium">Contact Details</th>
                <th className="py-2 pr-4 font-medium">Assigned Consultant</th>
                <th className="py-2 pr-4 font-medium">Total Sessions</th>
                <th className="py-2 pr-4 font-medium">Last Session Date</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.clientId}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${client.avatarClass}`}
                      >
                        {initials(client.name)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {client.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: {client.clientId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-foreground">{client.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.phone}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                        {initials(client.consultant)}
                      </span>
                      <span className="text-foreground">
                        {client.consultant}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-foreground">
                    {client.totalSessions}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {client.lastSessionDate}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant="outline"
                      className={statusClass[client.status]}
                    >
                      {client.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
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
          <span>Showing 1 to {clients.length} of 142 clients</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {[1, 2, 3].map((n) => (
              <Button
                key={n}
                variant={page === n ? "default" : "outline"}
                size="icon-sm"
              >
                {n}
              </Button>
            ))}
            <span className="px-1">...</span>
            <Button variant="outline" size="icon-sm">
              15
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
