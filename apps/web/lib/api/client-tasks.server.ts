import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ClientCaseTask {
  id: string;
  title: string;
  dueAt: string | null;
  status: "OPEN" | "COMPLETED" | "OVERDUE";
  completedAt: string | null;
  createdAt: string;
  // The deliverable required to complete this task — null on legacy tasks
  // created before this was tracked.
  type: "UPLOAD_DOCUMENT" | "FILL_FORM" | "WRITE_RESPONSE" | null;
  responseText: string | null;
}

// A CLIENT has no home tenant (see clients.server.ts's OwnClientProfile), so
// each case's tasks must be fetched against that case's own tenant, using
// the tenantId/tenantSlug already carried on OwnClientProfile.cases[]
// (mirrors client-documents.server.ts).
export async function getClientCaseTasks(
  tenantId: string,
  tenantSlug: string,
  caseId: string
): Promise<ClientCaseTask[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const res = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/cases/${caseId}/tasks`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "X-Tenant-Slug": tenantSlug,
    },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as ClientCaseTask[];
}

// CONSULTANT view of the tasks they've assigned to a client on one of their
// own cases — same endpoint, filtered server-side via ?assignedTo=CLIENT
// (case-tasks.router.ts only auto-filters for the CLIENT role).
export async function getConsultantCaseClientTasks(
  tenantId: string,
  tenantSlug: string,
  caseId: string
): Promise<ClientCaseTask[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const res = await fetch(
    `${API_BASE_URL}/api/tenants/${tenantId}/cases/${caseId}/tasks?assignedTo=CLIENT`,
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
  return data as ClientCaseTask[];
}
