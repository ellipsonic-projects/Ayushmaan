import { GreetingHeader } from "@/components/tenant/consultant/dashboard/greeting-header";
import { TodaysBriefing } from "@/components/tenant/consultant/dashboard/todays-briefing";
import { DailyTimeline } from "@/components/tenant/consultant/dashboard/daily-timeline";
import { CriticalCommitments } from "@/components/tenant/consultant/dashboard/critical-commitments";
import { PriorityTasks } from "@/components/tenant/consultant/dashboard/priority-tasks";
import { UnreadMessages } from "@/components/tenant/consultant/dashboard/unread-messages";
import { AiSummaryCard } from "@/components/tenant/consultant/dashboard/ai-summary-card";
import { NewAppointmentRequests } from "@/components/tenant/consultant/dashboard/new-appointment-requests";
import { getOwnConsultantProfile } from "@/lib/api/consultants.server";
import { getTenantAppointments } from "@/lib/api/appointments.server";
import { toPendingApprovalItem } from "@/components/tenant/admin/appointments/pending-approval-item";

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export default async function ConsultantDashboardPage() {
  const consultant = await getOwnConsultantProfile();
  const today = startOfDay(new Date());
  const rangeStart = addDays(today, -7);
  const rangeEnd = addDays(today, 35);

  const [rangeAppointments, awaitingAppointments] = consultant
    ? await Promise.all([
        getTenantAppointments({ from: rangeStart.toISOString(), to: rangeEnd.toISOString() }),
        getTenantAppointments({ status: "ADMIN_APPROVED" }),
      ])
    : [[], []];

  const appointmentsByDate: Record<string, number> = {};
  for (const appt of rangeAppointments) {
    const key = appt.scheduledStart.slice(0, 10);
    appointmentsByDate[key] = (appointmentsByDate[key] ?? 0) + 1;
  }

  const newAppointmentRequests = awaitingAppointments
    .slice()
    .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
    .map(toPendingApprovalItem);

  return (
    <div className="flex flex-col gap-6">
      <GreetingHeader />

      <div className="grid gap-4 lg:grid-cols-3">
        <div data-tour="consultant-morning-brief">
          <TodaysBriefing />
        </div>
        <div data-tour="consultant-daily-timeline">
          <DailyTimeline appointmentsByDate={appointmentsByDate} />
        </div>
        <div className="flex flex-col gap-4">
          <div data-tour="consultant-critical-commitments">
            <CriticalCommitments />
          </div>
          <PriorityTasks />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AiSummaryCard />
        <NewAppointmentRequests items={newAppointmentRequests} />
      </div>

      <UnreadMessages />
    </div>
  );
}
