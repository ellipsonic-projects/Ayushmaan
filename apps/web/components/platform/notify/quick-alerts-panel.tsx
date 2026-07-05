import Link from "next/link";
import { Zap, Mail } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const presets = [
  { label: "Service Interruption", note: "Critical alert for regional downtime." },
  { label: "Maintenance", note: "Scheduled system updates notice." },
  { label: "Security Alert", note: "Mandatory password/policy resets." },
  { label: "Billing Issue", note: "Payment failure & renewal notices." },
];

export function QuickAlertsPanel() {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Quick Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <p className="text-sm font-medium text-foreground">
                {preset.label}
              </p>
              <p className="text-xs text-muted-foreground">{preset.note}</p>
            </button>
          ))}
          <Link
            href="/notify"
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            Manage Presets
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Channel Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-foreground">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email Service
            </span>
            <span className="font-medium text-emerald-600 dark:text-emerald-500">
              99%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
