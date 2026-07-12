"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, MoreVertical, Phone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tag = { label: string; className: string };

type Client = {
  name: string;
  clientType: string;
  caseId: string;
  avatarClass: string;
  tags: Tag[];
  lastInteractionDate: string;
  lastInteractionNote: string;
  nextAppointmentDate: string;
  nextAppointmentTime: string;
  nextAppointmentType: string;
  appointmentDotClass: string;
  consultantName?: string;
  consultantId?: string;
};

const tagClass: Record<string, string> = {
  VIP: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400",
  "Long-Term":
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  Onboarding:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  Urgent:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400",
  "Hindi Pref.": "border-border bg-muted text-muted-foreground",
};

const clients: Client[] = [
  {
    name: "Ramesh Chandra",
    clientType: "Enterprise Client",
    caseId: "#ENG-88219",
    avatarClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    tags: [
      { label: "VIP", className: tagClass.VIP },
      { label: "Long-Term", className: tagClass["Long-Term"] },
    ],
    lastInteractionDate: "Oct 24, 2023",
    lastInteractionNote: "Follow-up on Q3 tax filing...",
    nextAppointmentDate: "Oct 30",
    nextAppointmentTime: "10:30 AM",
    nextAppointmentType: "In-Person Meeting",
    appointmentDotClass: "bg-emerald-500",
    consultantName: "Anil Kapoor",
    consultantId: "#CON-1042",
  },
  {
    name: "Priya Sharma",
    clientType: "Individual Client",
    caseId: "#ENG-91844",
    avatarClass: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    tags: [
      { label: "Onboarding", className: tagClass.Onboarding },
      { label: "Urgent", className: tagClass.Urgent },
    ],
    lastInteractionDate: "Today, 08:15 AM",
    lastInteractionNote: "Urgent escalation call...",
    nextAppointmentDate: "Oct 26",
    nextAppointmentTime: "02:00 PM",
    nextAppointmentType: "Video Consultation",
    appointmentDotClass: "bg-amber-500",
  },
  {
    name: "Ananya Verma",
    clientType: "Individual Client",
    caseId: "#ENG-77301",
    avatarClass: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
    tags: [{ label: "Hindi Pref.", className: tagClass["Hindi Pref."] }],
    lastInteractionDate: "Oct 20, 2023",
    lastInteractionNote: "Reports sent...",
    nextAppointmentDate: "Nov 05",
    nextAppointmentTime: "09:00 AM",
    nextAppointmentType: "Follow-up Review",
    appointmentDotClass: "bg-muted-foreground/40",
  },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");
}

export function ClientsTable() {
  const [page] = useState(1);

  return (
    <Card size="sm">
      <CardContent className="px-0">
        <div className="overflow-x-auto px-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Client Name</th>
                <th className="py-2 pr-4 font-medium">Engagement ID</th>
                <th className="py-2 pr-4 font-medium">Contact</th>
                <th className="py-2 pr-4 font-medium">CRM Tags</th>
                <th className="py-2 pr-4 font-medium">Last Interaction</th>
                <th className="py-2 pr-4 font-medium">Next Appointment</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.caseId}
                  className="border-b border-border transition-colors last:border-0 hover:bg-muted/40"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${client.avatarClass}`}
                      >
                        {initials(client.name)}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{client.name}</p>
                        <p className="text-xs text-muted-foreground">{client.clientType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs tabular-nums text-muted-foreground">
                    {client.caseId}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Call ${client.name}`}>
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Message ${client.name}`}>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map((tag) => (
                        <Badge key={tag.label} variant="outline" className={tag.className}>
                          {tag.label}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-foreground">{client.lastInteractionDate}</p>
                    <p className="text-xs text-muted-foreground">{client.lastInteractionNote}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-foreground">
                      {client.nextAppointmentDate} &middot; {client.nextAppointmentTime}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                        className={cn(
                          "h-1.5 w-1.5 shrink-0 rounded-full",
                          client.appointmentDotClass
                        )}
                      />
                      {client.nextAppointmentType}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`More actions for ${client.name}`}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between px-4 text-xs text-muted-foreground">
          <span>Showing 1-{clients.length} of 124 clients</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" disabled={page === 1}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            {[1, 2, 3].map((n) => (
              <Button key={n} variant={page === n ? "default" : "outline"} size="icon-sm">
                {n}
              </Button>
            ))}
            <span className="px-1">...</span>
            <Button variant="outline" size="icon-sm">
              13
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
