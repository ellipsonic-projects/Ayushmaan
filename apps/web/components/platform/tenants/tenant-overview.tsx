"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TenantDetailHeader } from "@/components/platform/tenants/tenant-detail-header";
import { TenantDetailStatsRow } from "@/components/platform/tenants/tenant-detail-stats-row";
import { TenantProfileCard } from "@/components/platform/tenants/tenant-profile-card";
import { TenantOperationalSettings } from "@/components/platform/tenants/tenant-operational-settings";
import { TenantCommercialCard } from "@/components/platform/tenants/tenant-commercial-card";
import { TenantStaffOverview } from "@/components/platform/tenants/tenant-staff-overview";
import {
  suspendPlatformTenant,
  reinstatePlatformTenant,
  updatePlatformTenant,
} from "@/lib/api/tenants.client";

type Staff = {
  name: string;
  email: string;
  role: "Owner" | "Consultant";
  activity: string;
  activityTone?: "danger";
};

export function TenantOverview({
  tenantId,
  displayName: initialDisplayName,
  status: initialStatus,
  adminName,
  adminEmail,
  joinedOn,
  slug,
  customDomain,
  consultantCount,
  clientCount,
  operationalSettings,
  licenseType,
  staff,
}: {
  tenantId: string;
  displayName: string;
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  adminName: string;
  adminEmail: string;
  joinedOn: string;
  slug: string;
  customDomain: string;
  consultantCount: number;
  clientCount: number;
  operationalSettings: {
    defaultCurrency?: "inr" | "usd" | "eur";
    payoutCycle?: "weekly" | "monthly" | "quarterly";
    bookingCutoffHours?: number;
    autoApproveBookings?: boolean;
  };
  licenseType: string;
  staff: Staff[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);

  const dirty = displayName !== initialDisplayName;
  const headerStatus = status === "ACTIVE" ? "Active" : "Suspended";
  const profileStatus = status.toLowerCase() as "active" | "suspended" | "archived";

  async function handleSave() {
    setSaving(true);
    try {
      await updatePlatformTenant(
        tenantId,
        { displayName },
        "Super Admin console: tenant profile update"
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend() {
    await suspendPlatformTenant(tenantId);
    setStatus("SUSPENDED");
    router.refresh();
  }

  async function handleReinstate() {
    await reinstatePlatformTenant(tenantId);
    setStatus("ACTIVE");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <TenantDetailHeader
        tenantId={tenantId}
        name={displayName}
        status={headerStatus}
        onSuspend={handleSuspend}
        onReinstate={handleReinstate}
        onSave={handleSave}
        dirty={dirty}
        saving={saving}
      />
      <TenantDetailStatsRow
        tenantId={tenantId}
        consultantCount={consultantCount}
        clientCount={clientCount}
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 flex-col gap-6">
          <TenantProfileCard
            tenantId={tenantId}
            adminName={adminName}
            adminEmail={adminEmail}
            joinedOn={joinedOn}
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            slug={slug}
            customDomain={customDomain}
            status={profileStatus}
          />
          <TenantOperationalSettings {...operationalSettings} />
        </div>
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-80">
          <TenantCommercialCard licenseType={licenseType} mrr="—" arr="—" />
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
