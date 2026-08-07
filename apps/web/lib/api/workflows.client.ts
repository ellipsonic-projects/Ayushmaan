"use client";

import { authedFetch, authedFetchForTenant, authedFetchPlatform } from "@/lib/api/authed-fetch";
import type { WorkflowGraph } from "@ayushman/types/workflow";
import type {
  Workflow,
  WorkflowListItem,
  WorkflowScope,
  WorkflowStatus,
  WorkflowTriggerType,
} from "@/lib/api/workflows.server";

// Every mutation below takes an optional explicit tenant context — used by
// the SUPER_ADMIN "Workflows" tab under /superadmin/tenants/:id, which has
// no home tenant of its own to resolve via /auth/me (authedFetch's default).
// "platform" is the other no-home-tenant case: a COMMUNITY workflow created
// via /superadmin/workflows has tenant_id null, so its CRUD goes through
// /api/platform/workflows instead of /api/tenants/:tenantId/workflows.
// Omit the param entirely (as the CONSULTANT/TENANT_ADMIN pages do) to
// resolve the caller's own tenant instead.
export type WorkflowTenantContext = { tenantId: string; tenantSlug?: string };
export type WorkflowTenantParam = WorkflowTenantContext | "platform";

function doFetch(path: string, init: RequestInit, tenant?: WorkflowTenantParam) {
  if (tenant === "platform") return authedFetchPlatform(path, init);
  if (tenant) return authedFetchForTenant(tenant.tenantId, tenant.tenantSlug, path, init);
  return authedFetch(path, init);
}

// Used by the top-level SUPER_ADMIN "Workflows" page (/superadmin/workflows)
// to list every COMMUNITY workflow platform-wide.
export async function listPlatformWorkflows(): Promise<WorkflowListItem[]> {
  const { data } = await authedFetchPlatform(`/workflows`, { method: "GET" });
  return data;
}

// Same, for a single workflow — used by the top-level SUPER_ADMIN workflow
// canvas route (/superadmin/workflows/:workflowId).
export async function getPlatformWorkflow(workflowId: string): Promise<Workflow> {
  const { data } = await authedFetchPlatform(`/workflows/${workflowId}`, { method: "GET" });
  return data;
}

export async function createWorkflow(
  input: { name: string; triggerType: WorkflowTriggerType; scope?: WorkflowScope },
  tenant?: WorkflowTenantParam
): Promise<Workflow> {
  const { data } = await doFetch(
    `/workflows`,
    { method: "POST", body: JSON.stringify(input) },
    tenant
  );
  return data;
}

export async function updateWorkflow(
  workflowId: string,
  updates: Partial<{ name: string; graph: WorkflowGraph; status: WorkflowStatus }>,
  tenant?: WorkflowTenantParam
): Promise<Workflow> {
  const { data } = await doFetch(
    `/workflows/${workflowId}`,
    { method: "PATCH", body: JSON.stringify(updates) },
    tenant
  );
  return data;
}

export async function deleteWorkflow(
  workflowId: string,
  tenant?: WorkflowTenantParam
): Promise<void> {
  await doFetch(`/workflows/${workflowId}`, { method: "DELETE" }, tenant);
}

export async function runWorkflowNow(
  workflowId: string,
  tenant?: WorkflowTenantParam
): Promise<void> {
  await doFetch(`/workflows/${workflowId}/run`, { method: "POST" }, tenant);
}

// Stops (or resumes) a TENANT/COMMUNITY scoped workflow from firing for the
// caller's own cases only — doesn't touch workflows.status, so it keeps
// running for every other consultant.
export async function optOutOfWorkflow(
  workflowId: string,
  tenant?: WorkflowTenantParam
): Promise<void> {
  await doFetch(`/workflows/${workflowId}/opt-out`, { method: "POST" }, tenant);
}

export async function optInToWorkflow(
  workflowId: string,
  tenant?: WorkflowTenantParam
): Promise<void> {
  await doFetch(`/workflows/${workflowId}/opt-out`, { method: "DELETE" }, tenant);
}
