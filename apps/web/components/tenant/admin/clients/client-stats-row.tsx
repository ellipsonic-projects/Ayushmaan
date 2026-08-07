import { Card, CardContent } from "@/components/ui/card";
import type { TenantClient } from "@/lib/api/clients.server";

export function ClientStatsRow({ clients }: { clients: TenantClient[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card size="sm">
        <CardContent>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Total Clients
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{clients.length}</p>
        </CardContent>
      </Card>
    </div>
  );
}
