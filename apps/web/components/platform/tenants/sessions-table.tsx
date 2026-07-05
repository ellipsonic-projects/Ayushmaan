"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Cog } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Session = {
  id: string;
  consultant: string;
  isAutomated?: boolean;
  client: string;
  duration: string;
  status: "Completed" | "Pending" | "Disputed";
  reschedules: string;
  rescheduled?: boolean;
};

const sessions: Session[] = [
  {
    id: "1",
    consultant: "Dr. Jonathan Davis",
    client: "Vanguard Tech Solutions",
    duration: "51m 12s",
    status: "Completed",
    reschedules: "0/3",
  },
  {
    id: "2",
    consultant: "Sarah Mitchell",
    client: "Global Logistics Corp",
    duration: "24m 50s",
    status: "Pending",
    reschedules: "1/3",
    rescheduled: true,
  },
  {
    id: "3",
    consultant: "Robert Blackstone",
    client: "Pioneer Legal Partners",
    duration: "1h 05m",
    status: "Completed",
    reschedules: "0/3",
  },
  {
    id: "4",
    consultant: "Elena Koziov",
    client: "MedCore Systems",
    duration: "15m 22s",
    status: "Completed",
    reschedules: "1/3",
    rescheduled: true,
  },
  {
    id: "5",
    consultant: "System Process (Auto)",
    isAutomated: true,
    client: "Automated Health Check",
    duration: "02m 90s",
    status: "Disputed",
    reschedules: "0/3",
  },
];

const statusClass: Record<Session["status"], string> = {
  Completed:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  Pending:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Disputed:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
};

export function SessionsTable({ totalRecords }: { totalRecords: number }) {
  const [page] = useState(1);

  return (
    <Card>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Consultant</th>
                <th className="py-2 pr-4 font-medium">Client Name</th>
                <th className="py-2 pr-4 font-medium">Duration</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Reschedules</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                          session.isAutomated
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {session.isAutomated ? (
                          <Cog className="h-4 w-4" />
                        ) : (
                          session.consultant
                            .split(" ")
                            .filter((p) => p !== "Dr.")
                            .slice(0, 2)
                            .map((p) => p.charAt(0))
                            .join("")
                        )}
                      </span>
                      <p className="font-medium text-foreground">
                        {session.consultant}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {session.client}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {session.duration}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge
                      variant="outline"
                      className={statusClass[session.status]}
                    >
                      {session.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={
                        session.rescheduled
                          ? "text-amber-600 dark:text-amber-500"
                          : "text-muted-foreground"
                      }
                    >
                      {session.reschedules}
                      {session.rescheduled && (
                        <span className="ml-1 text-xs">Rescheduled</span>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing 1 to {sessions.length} of {totalRecords.toLocaleString()}
          </span>
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
              125
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
