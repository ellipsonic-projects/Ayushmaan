import Link from "next/link";
import { Phone, Mail, UserRound, CalendarClock, Tag, ChevronRight } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CaseDetail } from "@/components/tenant/consultant/case-detail/case-detail-data";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function CaseInfoSidebar({ caseDetail }: { caseDetail: CaseDetail }) {
  return (
    <aside className="sticky top-5 flex w-full shrink-0 flex-col gap-4 lg:w-72">
      <Card>
        <CardHeader>
          <CardTitle>Client</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Link
            href="../../clients/id"
            className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5 transition-colors hover:bg-muted/40"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${caseDetail.client.avatarClass}`}
              >
                {initials(caseDetail.client.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {caseDetail.client.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {caseDetail.client.clientCode}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          <InfoRow icon={Phone} label="Phone" value={caseDetail.client.phone} />
          <InfoRow icon={Mail} label="Email" value={caseDetail.client.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <InfoRow icon={Tag} label="Category" value={caseDetail.category} />
          <InfoRow icon={CalendarClock} label="Created" value={caseDetail.createdAt} />
          {caseDetail.status === "Closed" && caseDetail.closedAt ? (
            <InfoRow icon={CalendarClock} label="Closed" value={caseDetail.closedAt} />
          ) : (
            caseDetail.nextAppointment && (
              <InfoRow icon={CalendarClock} label="Next Appointment" value={caseDetail.nextAppointment} />
            )
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-4 w-4 text-muted-foreground" />
            Consultants
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {caseDetail.consultants.map((assignment) => (
            <div key={assignment.id} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground">{assignment.consultantName}</p>
                {assignment.current && (
                  <Badge
                    variant="outline"
                    className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                  >
                    Current
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {assignment.role} &middot; {assignment.from}
                {assignment.to ? ` – ${assignment.to}` : " – present"}
              </p>
              {assignment.reason && (
                <p className="text-xs text-muted-foreground italic">{assignment.reason}</p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" asChild>
        <Link href="../../clients/id">View full client profile</Link>
      </Button>
    </aside>
  );
}
