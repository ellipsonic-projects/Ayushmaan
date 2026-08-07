import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type WorkflowRunStatus = "RUNNING" | "WAITING" | "COMPLETED" | "FAILED";

export interface WorkflowRun {
  id: string;
  tenantId: string;
  workflowId: string;
  status: WorkflowRunStatus;
  currentNodeId: string | null;
  context: Record<string, unknown>;
  resumeAt: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// Mirrors workflows.server.ts's getOwnWorkflow — resolves the caller's own
// home tenant via /auth/me, same as every other tenant-scoped server helper
// in this file set.
export async function getOwnWorkflowRuns(
  workflowId: string,
  status?: WorkflowRunStatus
): Promise<{ tenantId: string; tenantSlug: string; runs: WorkflowRun[] } | null> {
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

  const query = status ? `?status=${status}` : "";
  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${me.tenantId}/workflows/${workflowId}/runs${query}`,
    { headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug }, cache: "no-store" }
  );
  if (!res.ok) return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, runs: [] };
  const { data } = await res.json();
  return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, runs: data as WorkflowRun[] };
}
