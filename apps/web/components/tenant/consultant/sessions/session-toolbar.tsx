"use client";

import type { ToolbarProps, View } from "react-big-calendar";
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { SessionEvent } from "@/components/tenant/consultant/sessions/session-data";

const viewOptions: { value: View; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

export function SessionToolbar({
  label,
  view,
  onNavigate,
  onView,
  showActions = true,
}: ToolbarProps<SessionEvent, object> & { showActions?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onNavigate("TODAY")}>
          Today
        </Button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous"
            onClick={() => onNavigate("PREV")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next"
            onClick={() => onNavigate("NEXT")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <Select value={view} onValueChange={(value) => value && onView(value as View)}>
          <SelectTrigger size="sm" className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {viewOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
