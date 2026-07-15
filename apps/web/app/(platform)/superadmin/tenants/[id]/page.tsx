import { notFound } from "next/navigation";

import { TenantDetailHeader } from "@/components/platform/tenants/tenant-detail-header";
import { TenantDetailStatsRow } from "@/components/platform/tenants/tenant-detail-stats-row";
import { TenantProfileCard } from "@/components/platform/tenants/tenant-profile-card";
import { TenantOperationalSettings } from "@/components/platform/tenants/tenant-operational-settings";
import { TenantCommercialCard } from "@/components/platform/tenants/tenant-commercial-card";
import { TenantStaffOverview } from "@/components/platform/tenants/tenant-staff-overview";
import { getPlatformTenantDetail } from "@/lib/api/tenants.server";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await getPlatformTenantDetail(id);
  if (!tenant) notFound();

  const adminUser = tenant.users.find((u) => u.role === "TENANT_ADMIN");
  const adminEmail = adminUser?.email ?? "—";
  const adminName = adminUser ? adminUser.email.split("@")[0].replace(/[._]/g, " ") : "—";
  const joinedOn = new Date(tenant.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const statusLower = tenant.status.toLowerCase() as "active" | "suspended" | "archived";
  const headerStatus = tenant.status === "ACTIVE" ? "Active" : "Suspended";

  const staff = tenant.users
    .filter((u) => u.role === "TENANT_ADMIN" || u.role === "CONSULTANT")
    .map((u) => ({
      name: u.email.split("@")[0].replace(/[._]/g, " "),
      email: u.email,
      role: (u.role === "TENANT_ADMIN" ? "Owner" : "Consultant") as "Owner" | "Consultant",
      activity: u.accountStatus === "ACTIVE" ? "Active" : "Suspended",
      activityTone: u.accountStatus === "ACTIVE" ? undefined : ("danger" as const),
    }));

  const consultantCount = tenant.users.filter((u) => u.role === "CONSULTANT").length;
  const clientCount = tenant.users.filter((u) => u.role === "CLIENT").length;

  return (
    <div className="flex flex-col gap-6">
      <TenantDetailHeader tenantId={id} name={tenant.displayName} status={headerStatus} />
      <TenantDetailStatsRow
        tenantId={id}
        consultantCount={consultantCount}
        clientCount={clientCount}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6">
          <TenantProfileCard
            tenantId={id}
            adminName={adminName}
            adminEmail={adminEmail}
            joinedOn={joinedOn}
            displayName={tenant.displayName}
            slug={tenant.slug}
            customDomain={tenant.customDomain ?? ""}
            status={statusLower}
          />
          <TenantOperationalSettings
            defaultCurrency={
              tenant.settings?.defaultCurrency.toLowerCase() as "inr" | "usd" | "eur" | undefined
            }
            payoutCycle={
              tenant.settings?.payoutCycle.toLowerCase() as
                "weekly" | "monthly" | "quarterly" | undefined
            }
            bookingCutoffHours={tenant.settings?.bookingCutoffHours}
            autoApproveBookings={tenant.settings?.autoApproveBookings}
          />
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-80">
          <TenantCommercialCard
            licenseType={tenant.billing?.planName ?? tenant.planTier}
            mrr="—"
            arr="—"
          />
          <TenantStaffOverview staff={staff} />
        </aside>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Private access granted by Super Admin. Only visible to the platform owner. Session tracked
        and audit-verified.
      </p>
    </div>
  );
}
