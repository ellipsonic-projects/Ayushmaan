import { GreetingHeader } from "@/components/tenant/consultant/dashboard/greeting-header";
import { TodaysBriefing } from "@/components/tenant/consultant/dashboard/todays-briefing";
import { DailyTimeline } from "@/components/tenant/consultant/dashboard/daily-timeline";
import { CriticalCommitments } from "@/components/tenant/consultant/dashboard/critical-commitments";
import { PriorityTasks } from "@/components/tenant/consultant/dashboard/priority-tasks";
import { UnreadMessages } from "@/components/tenant/consultant/dashboard/unread-messages";
import { AiSummaryCard } from "@/components/tenant/consultant/dashboard/ai-summary-card";
import { getOwnConsultantProfile } from "@/lib/api/consultants.server";
import { getTenantAppointments } from "@/lib/api/appointments.server";

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

  const rangeAppointments = consultant
    ? await getTenantAppointments({ from: rangeStart.toISOString(), to: rangeEnd.toISOString() })
    : [];

  const appointmentsByDate: Record<string, number> = {};
  for (const appt of rangeAppointments) {
    const key = appt.scheduledStart.slice(0, 10);
    appointmentsByDate[key] = (appointmentsByDate[key] ?? 0) + 1;
  }

  return (
    <div className="flex flex-col gap-6">
      <GreetingHeader />

      <div className="grid gap-4 lg:grid-cols-3">
        <TodaysBriefing />
        <DailyTimeline appointmentsByDate={appointmentsByDate} />
        <div className="flex flex-col gap-4">
          <CriticalCommitments />
          <PriorityTasks />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <AiSummaryCard />
      </div>

      <UnreadMessages />
    </div>
  );
}
