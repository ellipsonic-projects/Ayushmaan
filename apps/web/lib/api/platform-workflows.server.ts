import { platformTenantFetch } from "./platform-tenant.server";
import type { Workflow, WorkflowListItem } from "./workflows.server";

// Cross-tenant read helpers for the SUPER_ADMIN "Workflows" tab under
// /superadmin/tenants/:id — mirrors getPlatformTenantConsultants, since a
// SUPER_ADMIN has no tenantId of their own (workflows.server.ts's
// getOwnWorkflows/getOwnWorkflow resolve via /auth/me instead, which only
// works for a user with a home tenant).
export async function getPlatformTenantWorkflows(
  tenantId: string,
  tenantSlug: string
): Promise<WorkflowListItem[]> {
  return (await platformTenantFetch<WorkflowListItem[]>(tenantId, tenantSlug, "/workflows")) ?? [];
}

export async function getPlatformTenantWorkflow(
  tenantId: string,
  tenantSlug: string,
  workflowId: string
): Promise<Workflow | null> {
  return platformTenantFetch<Workflow>(tenantId, tenantSlug, `/workflows/${workflowId}`);
}
