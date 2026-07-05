import { ScheduleHeader } from "@/components/tenant/admin/consultants/schedule-header";
import { MasterScheduleGrid } from "@/components/tenant/admin/consultants/master-schedule-grid";
import { ConflictResolutionQueue } from "@/components/tenant/admin/consultants/conflict-resolution-queue";
import { ResourceUtilization } from "@/components/tenant/admin/consultants/resource-utilization";

export default function ConsultantsSchedulePage() {
  return (
    <div className="flex flex-col gap-6">
      <ScheduleHeader />
      <MasterScheduleGrid />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ConflictResolutionQueue />
        </div>
        <div className="xl:col-span-1">
          <ResourceUtilization />
        </div>
      </div>
    </div>
  );
}
