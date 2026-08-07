"use client";

import { Compass } from "lucide-react";

import { CollapsibleLabel } from "@/components/sidebar/collapsible-label";
import { useTourContext } from "./tour-provider";
import { useTourStore } from "./tour-store";

export function TourTrigger({ collapsible = false }: { collapsible?: boolean }) {
  const { role } = useTourContext();
  const completedRoles = useTourStore((s) => s.completedRoles);
  const start = useTourStore((s) => s.start);
  const resetRole = useTourStore((s) => s.resetRole);
  const completed = completedRoles.includes(role);

  return (
    <button
      type="button"
      onClick={() => {
        if (completed) resetRole(role);
        start(role);
      }}
      className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-sidebar-foreground/62 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-primary">
        <Compass className="h-4 w-4 shrink-0" />
      </span>
      <CollapsibleLabel collapsible={collapsible}>
        {completed ? "Retake Tour" : "Take a Tour"}
      </CollapsibleLabel>
    </button>
  );
}
