"use client";

import { useMemo, useState } from "react";
import {
  Calendar as BigCalendar,
  dateFnsLocalizer,
  type EventProps,
  type View,
} from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import ellipsize from "ellipsize";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "@/components/tenant/consultant/sessions/calendar-overrides.css";

import type {
  CalendarMember,
  SessionEvent,
} from "@/components/tenant/consultant/sessions/session-data";
import { SessionToolbar } from "@/components/tenant/consultant/sessions/session-toolbar";
import { SessionSidebar } from "@/components/tenant/consultant/sessions/session-sidebar";
import { SessionDetailSheet } from "@/components/tenant/consultant/sessions/session-detail-sheet";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { "en-US": enUS },
});

// Event titles can overflow narrow day/week columns — ellipsize at a word
// boundary instead of letting the calendar cell clip mid-word.
const EVENT_TITLE_MAX_LENGTH = 28;

function SessionEventContent({ title }: EventProps<SessionEvent>) {
  return <span>{ellipsize(title, EVENT_TITLE_MAX_LENGTH)}</span>;
}

export function SessionCalendar({
  events: allEvents,
  members,
  membersLabel,
  initialChecked = { you: true },
  showActions = true,
}: {
  events: SessionEvent[];
  members?: CalendarMember[];
  membersLabel?: string;
  initialChecked?: Record<string, boolean>;
  showActions?: boolean;
}) {
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<View>("week");
  const [selectedEvent, setSelectedEvent] = useState<SessionEvent | null>(null);
  const [checkedMembers, setCheckedMembers] = useState<Record<string, boolean>>(initialChecked);

  // Events without a memberId are always visible; the rest follow the
  // sidebar checkboxes, with "all" acting as an override.
  const events = useMemo(
    () =>
      allEvents.filter(
        (event) => !event.memberId || checkedMembers.all || checkedMembers[event.memberId]
      ),
    [allEvents, checkedMembers]
  );

  function toggleMember(id: string) {
    setCheckedMembers((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className="flex h-full overflow-hidden rounded-lg border border-border">
      <SessionSidebar
        selectedDate={date}
        onSelectDate={setDate}
        checkedMembers={checkedMembers}
        onToggleMember={toggleMember}
        members={members}
        membersLabel={membersLabel}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <BigCalendar
          className="session-calendar flex-1"
          localizer={localizer}
          events={events}
          date={date}
          view={view}
          onNavigate={setDate}
          onView={(v) => setView(v)}
          views={["day", "week", "month"]}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={(event) => setSelectedEvent(event as SessionEvent)}
          eventPropGetter={(event) => ({
            className: (event as SessionEvent).colorClass,
            style: { color: "white" },
          })}
          components={{
            toolbar: (props) => <SessionToolbar {...props} showActions={showActions} />,
            event: SessionEventContent,
          }}
        />
      </div>

      <SessionDetailSheet
        event={selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
      />
    </div>
  );
}
