"use client";

import { authedFetch, authedFetchForTenant, authedFetchPlatform } from "@/lib/api/authed-fetch";
import type {
  TemplateChannel,
  TemplateScope,
  WorkflowTemplate,
} from "@/lib/api/workflow-templates.server";

export interface WorkflowTemplateInput {
  name: string;
  channel: TemplateChannel;
  scope: TemplateScope;
  subject?: string;
  content: Record<string, unknown>;
}

// Every mutation below takes an optional explicit tenant context — used by
// the SUPER_ADMIN "Templates" section, which has no home tenant of its own
// to resolve via /auth/me (authedFetch's default). "platform" is the other
// no-home-tenant case: a COMMUNITY template created via /superadmin/templates
// has tenant_id null, so its CRUD goes through /api/platform/workflow-templates
// instead of /api/tenants/:tenantId/workflow-templates. Omit the param
// entirely (as the CONSULTANT/TENANT_ADMIN pages do) to resolve the caller's
// own tenant instead. Mirrors workflows.client.ts's WorkflowTenantParam.
export type TemplateTenantContext = { tenantId: string; tenantSlug?: string };
export type TemplateTenantParam = TemplateTenantContext | "platform";

function doFetch(path: string, init: RequestInit, tenant?: TemplateTenantParam) {
  if (tenant === "platform") return authedFetchPlatform(path, init);
  if (tenant) return authedFetchForTenant(tenant.tenantId, tenant.tenantSlug, path, init);
  return authedFetch(path, init);
}

// Used by the workflow canvas's SEND_EMAIL config panel to
// offer a template picker scoped the same Personal/Tenant/Community way as
// the templates library page (Sprint 5.5.3 item 5). The API has no
// channel filter, so callers narrow by `channel` on the returned list.
export async function listWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const { data } = await authedFetch(`/workflow-templates`, { method: "GET" });
  return data;
}

// Used by the top-level SUPER_ADMIN "Templates" page (/superadmin/templates)
// to list every COMMUNITY template platform-wide.
export async function listPlatformWorkflowTemplates(): Promise<WorkflowTemplate[]> {
  const { data } = await authedFetchPlatform(`/workflow-templates`, { method: "GET" });
  return data;
}

// Same, for a single template — used by the top-level SUPER_ADMIN template
// editor route (/superadmin/templates/:templateId).
export async function getPlatformWorkflowTemplate(templateId: string): Promise<WorkflowTemplate> {
  const { data } = await authedFetchPlatform(`/workflow-templates/${templateId}`, {
    method: "GET",
  });
  return data;
}

export async function createWorkflowTemplate(
  input: WorkflowTemplateInput,
  tenant?: TemplateTenantParam
): Promise<WorkflowTemplate> {
  const { data } = await doFetch(
    `/workflow-templates`,
    { method: "POST", body: JSON.stringify(input) },
    tenant
  );
  return data;
}

export async function updateWorkflowTemplate(
  templateId: string,
  updates: Partial<WorkflowTemplateInput>,
  tenant?: TemplateTenantParam
): Promise<WorkflowTemplate> {
  // The platform router's content-edit path is deliberately distinct from
  // its status-only moderation PATCH /:templateId (see
  // workflow-templates.router.ts's platformWorkflowTemplateModerationRouter).
  const path =
    tenant === "platform"
      ? `/workflow-templates/${templateId}/content`
      : `/workflow-templates/${templateId}`;
  const { data } = await doFetch(path, { method: "PATCH", body: JSON.stringify(updates) }, tenant);
  return data;
}

export async function deleteWorkflowTemplate(
  templateId: string,
  tenant?: TemplateTenantParam
): Promise<void> {
  await doFetch(`/workflow-templates/${templateId}`, { method: "DELETE" }, tenant);
}
