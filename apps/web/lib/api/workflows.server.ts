import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { WorkflowGraph } from "@ayushman/types/workflow";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type WorkflowStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "ARCHIVED";
export type WorkflowTriggerType = "SCHEDULE" | "EVENT" | "MANUAL";
export type WorkflowScope = "PERSONAL" | "TENANT" | "COMMUNITY";

export interface Workflow {
  id: string;
  tenantId: string;
  consultantId: string | null;
  createdByUserId: string;
  name: string;
  status: WorkflowStatus;
  triggerType: WorkflowTriggerType;
  scope: WorkflowScope;
  isOwn: boolean;
  // Whether the caller (a CONSULTANT) has opted this workflow out for their
  // own cases — always false for a TENANT_ADMIN or PERSONAL scope, since
  // opting out isn't offered there.
  optedOut: boolean;
  graph: WorkflowGraph;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowListItem extends Omit<Workflow, "graph"> {
  lastRun: { status: string; createdAt: string } | null;
}

// Mirrors workflow-templates.server.ts's getOwnWorkflowTemplates — resolves
// the caller's own home tenant via /auth/me since both admin and consultant
// workflow pages operate within a single home tenant.
export async function getOwnWorkflows(): Promise<{
  tenantId: string;
  tenantSlug: string;
  workflows: WorkflowListItem[];
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };
  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) return null;
  const { data: me } = await meRes.json();
  if (!me?.tenantId || !me.tenant?.slug) return null;

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/workflows`, {
    headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug },
    cache: "no-store",
  });
  if (!res.ok) return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, workflows: [] };
  const { data } = await res.json();
  return {
    tenantId: me.tenantId,
    tenantSlug: me.tenant.slug,
    workflows: data as WorkflowListItem[],
  };
}

// Loads a single workflow (with its graph) for the canvas page. Returns null
// on a 404/403 — the page treats both as "not found".
export async function getOwnWorkflow(workflowId: string): Promise<{
  tenantId: string;
  tenantSlug: string;
  workflow: Workflow;
} | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };
  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) return null;
  const { data: me } = await meRes.json();
  if (!me?.tenantId || !me.tenant?.slug) return null;

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/workflows/${workflowId}`, {
    headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const { data } = await res.json();
  return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, workflow: data as Workflow };
}
