import { notFound } from "next/navigation";

import { WorkflowCanvas } from "@/components/tenant/shared/workflows/workflow-canvas";
import { getPlatformTenantDetail } from "@/lib/api/tenants.server";
import { getPlatformTenantWorkflow } from "@/lib/api/platform-workflows.server";

export default async function SuperAdminTenantWorkflowCanvasPage({
  params,
}: {
  params: Promise<{ id: string; workflowId: string }>;
}) {
  const { id, workflowId } = await params;
  const tenant = await getPlatformTenantDetail(id);
  if (!tenant) notFound();

  const workflow = await getPlatformTenantWorkflow(id, tenant.slug, workflowId);
  if (!workflow) notFound();

  return (
    <WorkflowCanvas
      workflow={workflow}
      viewerRole="SUPER_ADMIN"
      tenant={{ tenantId: id, tenantSlug: tenant.slug }}
    />
  );
}
