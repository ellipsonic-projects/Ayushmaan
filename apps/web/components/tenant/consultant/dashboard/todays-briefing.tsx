import { Clock3 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getOwnConsultantProfile } from "@/lib/api/consultants.server";
import { getTenantAppointments } from "@/lib/api/appointments.server";

const ACCENT_CLASSES = ["border-l-secondary", "border-l-chart-3", "border-l-primary"];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function TodaysBriefing() {
  const consultant = await getOwnConsultantProfile();
  const appointments = consultant
    ? await getTenantAppointments({
        from: startOfToday().toISOString(),
        to: endOfToday().toISOString(),
      })
    : [];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          Today&apos;s Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {appointments.length === 0 && (
          <p className="text-sm text-muted-foreground">No appointments scheduled today.</p>
        )}
        {appointments.map((item, index) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border-l-4 bg-muted/40 p-3",
              ACCENT_CLASSES[index % ACCENT_CLASSES.length]
            )}
          >
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono tabular-nums">
                {new Date(item.scheduledStart).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Badge>
              <p className="text-sm font-semibold text-foreground">{item.case.client.fullName}</p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  item.status === "APPROVED" ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              {item.meetingLink ? "Video Consultation" : "In-Person"}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
