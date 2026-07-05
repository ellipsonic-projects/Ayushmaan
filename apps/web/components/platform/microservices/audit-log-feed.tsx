import { Building2, UserCog, RefreshCw, KeyRound, Filter, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Event = {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  detail: string;
  meta: string;
  time: string;
};

const events: Event[] = [
  {
    icon: Building2,
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-500",
    label: "New Tenant Created:",
    detail: "Apollo Clinic (ID: AP-901)",
    meta: "By System Automator • Primary Domain: apollo.ayushman.com",
    time: "2 mins ago",
  },
  {
    icon: UserCog,
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-500",
    label: "Super Admin Escalated Access:",
    detail: "Dr. Sharma Case #202",
    meta: "By Admin_Ayush • Elevated for Grievance Resolution",
    time: "14 mins ago",
  },
  {
    icon: RefreshCw,
    iconClass: "bg-violet-500/10 text-violet-600 dark:text-violet-500",
    label: "Microservice Redeploy:",
    detail: "Transcription Engine v2.4.1",
    meta: "By CI/CD Pipeline • Rolling update completed successfully",
    time: "1 hour ago",
  },
  {
    icon: KeyRound,
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500",
    label: "New API Key Issued:",
    detail: "Legal-Pro Tenant Hub",
    meta: "By System • Scoped to read-only reporting",
    time: "2 hours ago",
  },
];

export function AuditLogFeed() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>System Events &amp; Audit Log</CardTitle>
        <CardAction className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Filter className="h-3.5 w-3.5" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {events.map((event) => (
          <div
            key={event.detail}
            className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${event.iconClass}`}
              >
                <event.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{event.label}</span>{" "}
                  {event.detail}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.meta}
                </p>
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {event.time}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
