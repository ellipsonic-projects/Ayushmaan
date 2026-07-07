import { AuditLogHeader } from "@/components/platform/audit-log/audit-log-header";
import { AuditLogStatsRow } from "@/components/platform/audit-log/audit-log-stats-row";
import { AuditLogTable } from "@/components/platform/audit-log/audit-log-table";

export default function PlatformAuditLogPage() {
  return (
    <div className="flex flex-col gap-6">
      <AuditLogHeader />
      <AuditLogStatsRow />
      <AuditLogTable />
    </div>
  );
}
