import { getTenantAuditLog } from "@/lib/api/audit-log.server";
import { AuditLogHeader } from "@/components/tenant/admin/audit-log/audit-log-header";
import { AuditLogStatsRow } from "@/components/tenant/admin/audit-log/audit-log-stats-row";
import { AuditLogTable } from "@/components/tenant/admin/audit-log/audit-log-table";

export default async function TenantAuditLogPage() {
  const entries = await getTenantAuditLog();

  return (
    <div className="flex flex-col gap-6">
      <AuditLogHeader />
      <AuditLogStatsRow entries={entries} />
      <AuditLogTable entries={entries} />
    </div>
  );
}
