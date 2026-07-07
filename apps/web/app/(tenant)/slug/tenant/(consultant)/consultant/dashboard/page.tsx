import { GreetingHeader } from "@/components/tenant/consultant/dashboard/greeting-header";
import { TodaysBriefing } from "@/components/tenant/consultant/dashboard/todays-briefing";
import { DailyTimeline } from "@/components/tenant/consultant/dashboard/daily-timeline";
import { CriticalCommitments } from "@/components/tenant/consultant/dashboard/critical-commitments";
import { PriorityTasks } from "@/components/tenant/consultant/dashboard/priority-tasks";
import { UnreadMessages } from "@/components/tenant/consultant/dashboard/unread-messages";
import { AiSummaryCard } from "@/components/tenant/consultant/dashboard/ai-summary-card";

export default function ConsultantDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <GreetingHeader />

      <div className="grid gap-4 lg:grid-cols-3">
        <TodaysBriefing />
        <DailyTimeline />
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
