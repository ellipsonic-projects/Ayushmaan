"use client";

import { useState } from "react";
import {
  BadgeCheck,
  BellRing,
  CalendarClock,
  CalendarOff,
  Link2,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const sections: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "public-profile", label: "Public Profile", icon: UserRound },
  { id: "credentials", label: "Credentials", icon: BadgeCheck },
  { id: "availability-defaults", label: "Availability", icon: CalendarClock },
  { id: "out-of-office", label: "Out of Office", icon: CalendarOff },
  { id: "calendar-sync", label: "Calendar Sync", icon: Link2 },
  { id: "preferences", label: "Preferences", icon: BellRing },
];

export function ConsultantSettingsSectionNav() {
  const [active, setActive] = useState(sections[0].id);

  function handleClick(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-6 lg:flex-col lg:overflow-visible">
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleClick(id)}
          className={cn(
            "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            active === id && "bg-muted text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  );
}
