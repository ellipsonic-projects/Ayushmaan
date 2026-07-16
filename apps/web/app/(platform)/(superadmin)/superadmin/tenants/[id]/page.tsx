import { notFound } from "next/navigation";

import { TenantOverview } from "@/components/platform/tenants/tenant-overview";
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
    <TenantOverview
      tenantId={id}
      displayName={tenant.displayName}
      status={tenant.status}
      adminName={adminName}
      adminEmail={adminEmail}
      joinedOn={joinedOn}
      slug={tenant.slug}
      customDomain={tenant.customDomain ?? ""}
      consultantCount={consultantCount}
      clientCount={clientCount}
      operationalSettings={{
        defaultCurrency: tenant.settings?.defaultCurrency.toLowerCase() as
          "inr" | "usd" | "eur" | undefined,
        payoutCycle: tenant.settings?.payoutCycle.toLowerCase() as
          "weekly" | "monthly" | "quarterly" | undefined,
        bookingCutoffHours: tenant.settings?.bookingCutoffHours,
        autoApproveBookings: tenant.settings?.autoApproveBookings,
      }}
      licenseType={tenant.billing?.planName ?? tenant.planTier}
      staff={staff}
    />
  );
}
