import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ClientFormSubmission {
  id: string;
  status: "PENDING" | "SUBMITTED" | "EXPIRED";
  channel: "EMAIL";
  answers: Record<string, unknown>;
  submittedAt: string | null;
  createdAt: string;
  formTemplate: {
    name: string;
    jsonSchema: Record<string, unknown>;
    uiSchema: Record<string, unknown>;
  };
}

// Mirrors client-documents.server.ts's getClientCaseDocuments — a CLIENT has
// no home tenant, so each case's form submissions are fetched against that
// case's own tenant.
export async function getClientCaseFormSubmissions(
  tenantId: string,
  tenantSlug: string,
  caseId: string
): Promise<ClientFormSubmission[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${tenantId}/cases/${caseId}/form-submissions`,
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
  return data as ClientFormSubmission[];
}
