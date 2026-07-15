import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface TenantClient {
  id: string;
  fullName: string;
  preferredLanguage: string;
  createdAt: string;
  user: { email: string; phone: string | null };
  cases: {
    tags: string[];
    status: string;
    consultant: { fullName: string };
    commitments: { dueAt: string | null }[];
    tasks: { dueAt: string | null; status: string }[];
    appointments: { scheduledStart: string }[];
  }[];
}

// middleware.ts already guarantees the caller is a signed-in TENANT_ADMIN
// belonging to this tenant before this page renders, so a missing
// session/tenantId here is treated as "no data" rather than re-validated.
export async function getTenantClients(): Promise<TenantClient[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) return [];
  const { data: me } = await meRes.json();
  if (!me?.tenantId) return [];

  const tenantHeaders = { ...authHeaders, "X-Tenant-Slug": me.tenant.slug };

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}/clients`, {
    headers: tenantHeaders,
    cache: "no-store",
  });
  if (!res.ok) return [];
  const { data } = await res.json();
  return data as TenantClient[];
}

export type ClientDeadlineFilter = "overdue" | "due-this-week" | "upcoming-appointment";

const DUE_SOON_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function filterClientsByDeadline(
  clients: TenantClient[],
  filter: ClientDeadlineFilter | null
): TenantClient[] {
  if (!filter) return clients;

  const now = Date.now();
  const dueSoonEnd = now + DUE_SOON_WINDOW_MS;

  return clients.filter((client) => {
    if (filter === "overdue") {
      return client.cases.some(
        (c) =>
          c.commitments.some((cm) => cm.dueAt && new Date(cm.dueAt).getTime() < now) ||
          c.tasks.some(
            (t) => t.status === "OVERDUE" || (t.dueAt && new Date(t.dueAt).getTime() < now)
          )
      );
    }

    if (filter === "due-this-week") {
      return client.cases.some(
        (c) =>
          c.commitments.some((cm) => {
            if (!cm.dueAt) return false;
            const t = new Date(cm.dueAt).getTime();
            return t >= now && t <= dueSoonEnd;
          }) ||
          c.tasks.some((t) => {
            if (t.status === "OVERDUE" || !t.dueAt) return false;
            const time = new Date(t.dueAt).getTime();
            return time >= now && time <= dueSoonEnd;
          })
      );
    }

    // upcoming-appointment
    return client.cases.some((c) =>
      c.appointments.some((a) => {
        const t = new Date(a.scheduledStart).getTime();
        return t >= now && t <= dueSoonEnd;
      })
    );
  });
}
