import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type TemplateScope = "PERSONAL" | "TENANT" | "COMMUNITY";
export type TemplateChannel = "EMAIL";
// Only meaningful for scope=COMMUNITY (Sprint 5.5.5 item 5) — a PERSONAL/
// TENANT row is always effectively APPROVED as far as the UI cares.
export type TemplateModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface WorkflowTemplate {
  id: string;
  tenantId: string;
  // Null for a SUPER_ADMIN-authored COMMUNITY template — see createdByUserId.
  consultantId: string | null;
  createdByUserId: string | null;
  consultant: { fullName: string } | null;
  scope: TemplateScope;
  status: TemplateModerationStatus;
  channel: TemplateChannel;
  name: string;
  subject: string | null;
  // Tiptap JSON document — opaque here, only @tiptap/react (client) and
  // template-render.service.ts (apps/api) ever interpret its shape.
  content: Record<string, unknown>;
  // Server-computed: whether the caller is this row's owning consultant.
  // workflow_templates_update_policy is the real enforcement — this only
  // drives whether the UI shows edit/delete affordances.
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
}

// Resolves the caller's own home tenant via /auth/me — mirrors
// notification-preferences.server.ts's getOwnNotificationPreferences, since
// both admin and consultant template pages always operate within a single
// home tenant.
export async function getOwnWorkflowTemplates(): Promise<{
  tenantId: string;
  tenantSlug: string;
  templates: WorkflowTemplate[];
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

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/workflow-templates`, {
    headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug },
    cache: "no-store",
  });
  if (!res.ok) return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, templates: [] };
  const { data } = await res.json();
  return {
    tenantId: me.tenantId,
    tenantSlug: me.tenant.slug,
    templates: data as WorkflowTemplate[],
  };
}

// Loads a single template for the edit page. Returns null on a 404/403 (RLS
// denies a non-owner's PERSONAL row, or the template genuinely doesn't
// exist) rather than throwing — the page treats both as "not found".
export async function getOwnWorkflowTemplate(templateId: string): Promise<{
  tenantId: string;
  tenantSlug: string;
  template: WorkflowTemplate;
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

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${me.tenantId}/workflow-templates/${templateId}`,
    { headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const { data } = await res.json();
  return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, template: data as WorkflowTemplate };
}
