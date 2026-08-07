import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type FormTemplateScope = "PERSONAL" | "TENANT" | "COMMUNITY";
export type FormTemplateModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface FormTemplate {
  id: string;
  tenantId: string;
  consultantId: string;
  consultant?: { fullName: string } | null;
  scope: FormTemplateScope;
  status: FormTemplateModerationStatus;
  name: string;
  jsonSchema: RJSFSchema;
  uiSchema: UiSchema;
  isOwn: boolean;
  createdAt: string;
  updatedAt: string;
}

// Mirrors workflow-templates.server.ts's getOwnWorkflowTemplates — resolves
// the caller's own home tenant via /auth/me.
export async function getOwnFormTemplates(): Promise<{
  tenantId: string;
  tenantSlug: string;
  templates: FormTemplate[];
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

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/form-templates`, {
    headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug },
    cache: "no-store",
  });
  if (!res.ok) return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, templates: [] };
  const { data } = await res.json();
  return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, templates: data as FormTemplate[] };
}

export async function getOwnFormTemplate(templateId: string): Promise<{
  tenantId: string;
  tenantSlug: string;
  template: FormTemplate;
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
    `${API_BASE_URL}/api/tenants/${me.tenantId}/form-templates/${templateId}`,
    { headers: { ...authHeaders, "X-Tenant-Slug": me.tenant.slug }, cache: "no-store" }
  );
  if (!res.ok) return null;
  const { data } = await res.json();
  return { tenantId: me.tenantId, tenantSlug: me.tenant.slug, template: data as FormTemplate };
}
