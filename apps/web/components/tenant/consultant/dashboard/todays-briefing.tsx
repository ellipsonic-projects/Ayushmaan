import { Clock3 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Appointment = {
  time: string;
  client: string;
  type: string;
  accentClass: string;
  dotClass: string;
};

const appointments: Appointment[] = [
  {
    time: "09:00 AM",
    client: "Global Logistics Corp",
    type: "In-Person Clinic",
    accentClass: "border-l-secondary",
    dotClass: "bg-emerald-500",
  },
  {
    time: "11:30 AM",
    client: "MedTech Solutions",
    type: "Video Consultation",
    accentClass: "border-l-chart-3",
    dotClass: "bg-amber-500",
  },
  {
    time: "02:00 PM",
    client: "Financy LP Review",
    type: "In-Person Clinic",
    accentClass: "border-l-primary",
    dotClass: "bg-emerald-500",
  },
];

export function TodaysBriefing() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-muted-foreground" />
          Today&apos;s Schedule
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {appointments.map((item) => (
          <div
            key={item.time}
            className={cn(
              "flex items-center justify-between gap-3 rounded-md border-l-4 bg-muted/40 p-3",
              item.accentClass
            )}
          >
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono tabular-nums">
                {item.time}
              </Badge>
              <p className="text-sm font-semibold text-foreground">{item.client}</p>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", item.dotClass)} />
              {item.type}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
