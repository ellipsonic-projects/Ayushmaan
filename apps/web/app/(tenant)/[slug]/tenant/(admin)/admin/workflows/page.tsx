import { WorkflowsBoard } from "@/components/tenant/shared/workflows/workflows-board";
import { getOwnWorkflows } from "@/lib/api/workflows.server";

export default async function TenantAdminWorkflowsPage() {
  const result = await getOwnWorkflows();

  return (
    <div data-tour="admin-workflows-board">
      <WorkflowsBoard initialWorkflows={result?.workflows ?? []} viewerRole="TENANT_ADMIN" />
    </div>
  );
}
