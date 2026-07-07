"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import type { CalendarMember } from "@/components/tenant/consultant/sessions/session-data";
import { cn } from "@/lib/utils";

const teamMembers: CalendarMember[] = [
  { id: "all", label: "All team members" },
  { id: "you", label: "You" },
  { id: "wendy", label: "Wendy Smith" },
  { id: "unassigned", label: "Unassigned" },
];

function CollapsibleSection({ title }: { title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-sm font-medium text-foreground"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <p className="mt-2 text-xs text-muted-foreground">No {title.toLowerCase()} yet.</p>
      )}
    </div>
  );
}

export function SessionSidebar({
  selectedDate,
  onSelectDate,
  checkedMembers,
  onToggleMember,
  members = teamMembers,
  membersLabel = "Team members",
}: {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  checkedMembers: Record<string, boolean>;
  onToggleMember: (id: string) => void;
  members?: CalendarMember[];
  membersLabel?: string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-4 border-r border-border bg-card p-3 lg:flex">
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && onSelectDate(date)}
        className="p-0"
      />

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <button
          type="button"
          className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        >
          {membersLabel}
          <ChevronUp className="h-4 w-4" />
        </button>
        <div className="flex flex-col gap-1.5">
          {members.map((member) => (
            <label
              key={member.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-1 text-sm text-foreground hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={checkedMembers[member.id] ?? false}
                onChange={() => onToggleMember(member.id)}
                className={cn(
                  "h-4 w-4 rounded border-border text-primary accent-primary"
                )}
              />
              {member.colorClass && (
                <span
                  className={cn("h-2.5 w-2.5 shrink-0 rounded-full", member.colorClass)}
                  aria-hidden
                />
              )}
              {member.label}
            </label>
          ))}
        </div>
      </div>

      <CollapsibleSection title="Services" />
      <CollapsibleSection title="Other events" />
      <CollapsibleSection title="Locations" />
    </aside>
  );
}
