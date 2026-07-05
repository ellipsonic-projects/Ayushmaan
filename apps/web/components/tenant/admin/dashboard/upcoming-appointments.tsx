"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Video, Building2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const appointments = [
  {
    time: "10:00 AM",
    client: "Rahul Hegde",
    consultant: "Dr. Amit Shah",
    mode: "Video" as const,
    status: "Confirmed" as const,
  },
  {
    time: "11:30 AM",
    client: "Sarah Lawson",
    consultant: "Dr. Meera Iyer",
    mode: "In-Clinic" as const,
    status: "Confirmed" as const,
  },
  {
    time: "1:15 PM",
    client: "David Kim",
    consultant: "Dr. Karan Walia",
    mode: "Video" as const,
    status: "Pending" as const,
  },
  {
    time: "2:30 PM",
    client: "Mira Sethi",
    consultant: "Dr. Amit Shah",
    mode: "In-Clinic" as const,
    status: "Confirmed" as const,
  },
];

const statusVariant: Record<string, "secondary" | "outline"> = {
  Confirmed: "secondary",
  Pending: "outline",
};

export function UpcomingAppointments() {
  const [page] = useState(1);

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Today&apos;s Appointments</CardTitle>
        <CardAction>
          <Button variant="outline" size="sm">
            View Schedule
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Client</th>
                <th className="py-2 pr-4 font-medium">Consultant</th>
                <th className="py-2 pr-4 font-medium">Mode</th>
                <th className="py-2 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr
                  key={`${appt.time}-${appt.client}`}
                  className="border-b border-border last:border-0"
                >
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {appt.time}
                  </td>
                  <td className="py-3 pr-4 text-foreground">{appt.client}</td>
                  <td className="py-3 pr-4 text-muted-foreground">
                    {appt.consultant}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      {appt.mode === "Video" ? (
                        <Video className="h-3.5 w-3.5" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5" />
                      )}
                      {appt.mode}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={statusVariant[appt.status]}>
                      {appt.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {appointments.length} of 18 appointments</span>
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
