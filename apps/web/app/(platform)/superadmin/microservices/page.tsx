import { MicroservicesStatsRow } from "@/components/platform/microservices/microservices-stats-row";
import { MicroservicesHealth } from "@/components/platform/microservices/microservices-health";
import { TenancyDistribution } from "@/components/platform/microservices/tenancy-distribution";
import { AuditLogFeed } from "@/components/platform/microservices/audit-log-feed";

export default function MicroservicesPage() {
  return (
    <div className="flex flex-col gap-6">
      <MicroservicesStatsRow />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MicroservicesHealth />
        </div>
        <div className="xl:col-span-1">
          <TenancyDistribution />
        </div>
      </div>

      <AuditLogFeed />
    </div>
  );
}
