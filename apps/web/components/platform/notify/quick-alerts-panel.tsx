import Link from "next/link";
import { Zap } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const presets = [
  { label: "Service Interruption", note: "Critical alert for regional downtime." },
  { label: "Maintenance", note: "Scheduled system updates notice." },
  { label: "Security Alert", note: "Mandatory password/policy resets." },
  { label: "Billing Issue", note: "Payment failure & renewal notices." },
];

export function QuickAlertsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          Quick Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {presets.map((preset) => (
          <Link
            key={preset.label}
            href="/superadmin/notify/create"
            className="rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-muted"
          >
            <p className="text-sm font-medium text-foreground">{preset.label}</p>
            <p className="text-xs text-muted-foreground">{preset.note}</p>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
