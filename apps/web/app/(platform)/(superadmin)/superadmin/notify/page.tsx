import { NotifyHeader } from "@/components/platform/notify/notify-header";
import { NotifyStatsRow } from "@/components/platform/notify/notify-stats-row";
import { BroadcastsTable } from "@/components/platform/notify/broadcasts-table";
import { QuickAlertsPanel } from "@/components/platform/notify/quick-alerts-panel";

export default function NotifyPage() {
  return (
    <div className="flex flex-col gap-6">
      <NotifyHeader />
      <NotifyStatsRow />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <BroadcastsTable />
        </div>
        <aside className="w-full shrink-0 lg:sticky lg:top-6 lg:w-72">
          <QuickAlertsPanel />
        </aside>
      </div>
    </div>
  );
}
