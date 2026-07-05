"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const channels = [
  {
    id: "in-app",
    label: "In-App Notification",
    note: "Real-time banner & bell icon",
    defaultChecked: true,
  },
  {
    id: "email",
    label: "Email Service",
    note: "Primary system relay",
    defaultChecked: false,
  },
  {
    id: "sms",
    label: "SMS / WhatsApp",
    note: "External gateway routing",
    defaultChecked: false,
  },
];

export function ChannelsPanel() {
  const [checked, setChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(channels.map((c) => [c.id, c.defaultChecked]))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Channels
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {channels.map((channel) => (
          <button
            key={channel.id}
            type="button"
            onClick={() =>
              setChecked((prev) => ({ ...prev, [channel.id]: !prev[channel.id] }))
            }
            className="flex items-start gap-3 text-left"
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input",
                checked[channel.id] && "border-primary bg-primary text-primary-foreground"
              )}
            >
              {checked[channel.id] && <Check className="h-3 w-3" />}
            </span>
            <span>
              <p className="text-sm font-medium text-foreground">
                {channel.label}
              </p>
              <p className="text-xs text-muted-foreground">{channel.note}</p>
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
