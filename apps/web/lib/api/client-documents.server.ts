import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ClientCaseDocument {
  id: string;
  fileName: string;
  createdAt: string;
  uploadedByRole: "CONSULTANT" | "CLIENT" | "TENANT_ADMIN";
}

// A CLIENT has no home tenant (see clients.server.ts's OwnClientProfile), so
// each case's documents must be fetched against that case's own tenant,
// using the tenantId/tenantSlug already carried on
// OwnClientProfile.cases[] rather than resolving via /api/auth/me.
export async function getClientCaseDocuments(
  tenantId: string,
  tenantSlug: string,
  caseId: string
): Promise<ClientCaseDocument[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const res = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/cases/${caseId}/documents`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "X-Tenant-Slug": tenantSlug,
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as ClientCaseDocument[];
}
