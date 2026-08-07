"use client";

import { AlertCircle, TriangleAlert, Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { BroadcastUrgency } from "@/lib/hooks";

const tiers: {
  id: BroadcastUrgency;
  label: string;
  note: string;
  icon: LucideIcon;
  activeClass: string;
  iconClass: string;
}[] = [
  {
    id: "CRITICAL",
    label: "Critical",
    note: "Immediate Action",
    icon: AlertCircle,
    activeClass: "border-red-500 ring-1 ring-red-500",
    iconClass: "bg-red-500 text-white",
  },
  {
    id: "WARNING",
    label: "Warning",
    note: "Priority Notice",
    icon: TriangleAlert,
    activeClass: "border-amber-500 ring-1 ring-amber-500",
    iconClass: "bg-amber-500 text-white",
  },
  {
    id: "INFO",
    label: "Info",
    note: "Standard Update",
    icon: Info,
    activeClass: "border-primary ring-1 ring-primary",
    iconClass: "bg-primary text-primary-foreground",
  },
];

export function UrgencyTierSelector({
  value,
  onChange,
}: {
  value: BroadcastUrgency;
  onChange: (value: BroadcastUrgency) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          1. Urgency Tier Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {tiers.map(({ id, label, note, icon: Icon, activeClass, iconClass }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border border-border p-4 text-center transition-colors hover:bg-muted/60",
                value === id && activeClass
              )}
            >
              <span
                className={cn("flex h-9 w-9 items-center justify-center rounded-full", iconClass)}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-foreground">{label.toUpperCase()}</span>
              <span className="text-xs text-muted-foreground">{note}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
