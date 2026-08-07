import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTenantConsultants } from "@/lib/api/consultants.server";
import { getPlatformTenantConsultants } from "@/lib/api/platform-consultants.server";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("");
}

export async function ConsultantStatus({
  platformTenant,
}: {
  platformTenant?: { tenantId: string; tenantSlug: string };
} = {}) {
  const consultants = platformTenant
    ? await getPlatformTenantConsultants(platformTenant.tenantId, platformTenant.tenantSlug)
    : await getTenantConsultants();

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Consultant Status</CardTitle>
        <CardAction>
          <Badge variant="outline">{consultants.length} Total</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {consultants.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {initials(c.fullName)}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{c.fullName}</p>
                <p className="text-xs text-muted-foreground">{c.subSpecialization || c.category}</p>
              </div>
            </div>
            {c.user.accountStatus !== "ACTIVE" ? (
              <Badge variant="destructive">{c.user.accountStatus}</Badge>
            ) : c.isAcceptingNewClients ? (
              <Badge
                variant="outline"
                className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Accepting
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                Not Accepting
              </Badge>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
