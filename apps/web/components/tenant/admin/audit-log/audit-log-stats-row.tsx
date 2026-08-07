import { ShieldAlert, CalendarClock, Users, FileWarning } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { TenantAuditLogEntry } from "@/lib/api/audit-log.server";

function timeAgo(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
}

export function AuditLogStatsRow({ entries }: { entries: TenantAuditLogEntry[] }) {
  const now = Date.now();
  const last30d = entries.filter(
    (e) => now - new Date(e.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000
  );

  const lastEscalation = entries[0] ? timeAgo(new Date(entries[0].createdAt)) : "—";

  const consultantsInvolved = new Set(
    entries
      .filter((e) => e.actorRole === "CONSULTANT" || e.actorRole === "TENANT_ADMIN")
      .map((e) => e.actorUserId)
  ).size;

  const caseRelated = entries.filter((e) => e.entityType === "Case").length;

  const stats: {
    label: string;
    value: string;
    icon: LucideIcon;
    iconClass: string;
  }[] = [
    {
      label: "Escalated accesses (30d)",
      value: String(last30d.length),
      icon: ShieldAlert,
      iconClass: "text-amber-600 dark:text-amber-500",
    },
    {
      label: "Last escalation",
      value: lastEscalation,
      icon: CalendarClock,
      iconClass: "text-muted-foreground",
    },
    {
      label: "Consultants involved",
      value: String(consultantsInvolved),
      icon: Users,
      iconClass: "text-muted-foreground",
    },
    {
      label: "Case-related",
      value: String(caseRelated),
      icon: FileWarning,
      iconClass: "text-blue-600 dark:text-blue-500",
    },
  ];

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {stats.map(({ label, value, icon: Icon, iconClass }) => (
          <div key={label} className="flex items-center gap-2.5">
            <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {value}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
