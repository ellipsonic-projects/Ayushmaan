import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface SharedTemplateItem {
  id: string;
  templateName: string;
  channel: "EMAIL" | null;
  sharedByRole: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
  renderedContent: {
    subject?: string | null;
    html?: string;
    text?: string;
    header?: { organizationName: string; consultantName: string; contactNumber: string };
    jsonSchema?: Record<string, unknown>;
    uiSchema?: Record<string, unknown>;
  };
  createdAt: string;
}

// Not client-specific despite living alongside client-documents.server.ts's
// naming convention — takes tenantId/tenantSlug/caseId directly, so both the
// client documentation page and the consultant documentation page call this
// same fetcher (case-documents.router.ts's shared-templates sibling enforces
// the actual access check per caller role).
export async function getCaseSharedTemplates(
  tenantId: string,
  tenantSlug: string,
  caseId: string
): Promise<SharedTemplateItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${tenantId}/cases/${caseId}/shared-templates`,
    {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "X-Tenant-Slug": tenantSlug,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as SharedTemplateItem[];
}
