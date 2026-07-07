import { AuditLogHeader } from "@/components/tenant/admin/audit-log/audit-log-header";
import { AuditLogStatsRow } from "@/components/tenant/admin/audit-log/audit-log-stats-row";
import { AuditLogTable } from "@/components/tenant/admin/audit-log/audit-log-table";

export default function TenantAuditLogPage() {
  return (
    <div className="flex flex-col gap-6">
      <AuditLogHeader />
      <AuditLogStatsRow />
      <AuditLogTable />
    </div>
  );
}
