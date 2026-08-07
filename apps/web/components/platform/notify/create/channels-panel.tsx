"use client";

import { Check } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BroadcastChannel } from "@/lib/hooks";

const channels: { id: BroadcastChannel; label: string; note: string }[] = [
  { id: "IN_APP", label: "In-App Notification", note: "Real-time banner & bell icon" },
  { id: "EMAIL", label: "Email Service", note: "Primary system relay" },
];

export function ChannelsPanel({
  channels: selected,
  onChange,
}: {
  channels: BroadcastChannel[];
  onChange: (channels: BroadcastChannel[]) => void;
}) {
  function toggle(id: BroadcastChannel) {
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id]);
  }

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
            onClick={() => toggle(channel.id)}
            className="flex items-start gap-3 text-left"
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-input",
                selected.includes(channel.id) && "border-primary bg-primary text-primary-foreground"
              )}
            >
              {selected.includes(channel.id) && <Check className="h-3 w-3" />}
            </span>
            <span>
              <p className="text-sm font-medium text-foreground">{channel.label}</p>
              <p className="text-xs text-muted-foreground">{channel.note}</p>
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
