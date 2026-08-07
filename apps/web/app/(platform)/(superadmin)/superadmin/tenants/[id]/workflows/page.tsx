import { notFound } from "next/navigation";

import { WorkflowsBoard } from "@/components/tenant/shared/workflows/workflows-board";
import { getPlatformTenantDetail } from "@/lib/api/tenants.server";
import { getPlatformTenantWorkflows } from "@/lib/api/platform-workflows.server";

export default async function SuperAdminTenantWorkflowsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getPlatformTenantDetail(id);
  if (!tenant) notFound();

  const workflows = await getPlatformTenantWorkflows(id, tenant.slug);

  return (
    <WorkflowsBoard
      initialWorkflows={workflows}
      viewerRole="SUPER_ADMIN"
      tenant={{ tenantId: id, tenantSlug: tenant.slug }}
    />
  );
}
