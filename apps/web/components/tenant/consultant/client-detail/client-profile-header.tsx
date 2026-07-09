import Link from "next/link";
import { ChevronLeft, Phone, CalendarPlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClientMessageWindow } from "@/components/tenant/consultant/client-detail/client-message-window";
import type { ClientProfile } from "@/components/tenant/consultant/client-detail/client-detail-data";

const statusBadgeClass: Record<ClientProfile["status"], string> = {
  Lead: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  Active:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  "Wait List":
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  Inactive: "border-border text-muted-foreground",
};

export function ClientProfileHeader({ client }: { client: ClientProfile }) {
  const initials = client.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="sm" asChild className="w-fit text-muted-foreground">
        <Link href="../">
          <ChevronLeft className="h-4 w-4" />
          Back to clients
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold ${client.avatarClass}`}
          >
            {initials}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-foreground">{client.name}</h1>
              <Badge variant="outline" className={statusBadgeClass[client.status]}>
                {client.status}
              </Badge>
              {client.tags.map((tag) => (
                <Badge key={tag.label} variant="outline" className={tag.className}>
                  {tag.label}
                </Badge>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              {client.clientCode} &middot; {client.age}, {client.gender} &middot; {client.category}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Phone className="h-4 w-4" />
            Call
          </Button>
          <ClientMessageWindow clientName={client.name} />
          <Button size="sm">
            <CalendarPlus className="h-4 w-4" />
            Schedule
          </Button>
        </div>
      </div>

      {client.riskNote && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
          {client.riskNote}
        </div>
      )}
    </div>
  );
}
