import { notFound } from "next/navigation";

import { getPlatformTenantDetail } from "@/lib/api/tenants.server";
import { getPlatformTenantCase } from "@/lib/api/platform-cases.server";
import { CaseDetail } from "@/components/platform/tenants/case-detail";

export default async function TenantCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string; caseId: string }>;
}) {
  const { id, caseId } = await params;
  const tenant = await getPlatformTenantDetail(id);
  if (!tenant) notFound();

  const caseDetail = await getPlatformTenantCase(id, tenant.slug, caseId);
  if (!caseDetail) notFound();

  return (
    <CaseDetail
      tenantId={id}
      tenantSlug={tenant.slug}
      tenantName={tenant.displayName}
      caseDetail={caseDetail}
    />
  );
}
