import {
  allConsultantEvents,
  consultantMembers,
} from "@/components/tenant/admin/calendar/calendar-data";
import { SessionCalendar } from "@/components/tenant/consultant/sessions/session-calendar";

export default function TenantAdminCalendarPage() {
  return (
    <div className="h-[calc(100vh-3.5rem-2.5rem)]">
      <SessionCalendar
        events={allConsultantEvents}
        members={consultantMembers}
        membersLabel="Consultants"
        initialChecked={{ all: true }}
      />
    </div>
  );
}
