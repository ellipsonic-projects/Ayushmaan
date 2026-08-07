import { createSupabaseServerClient } from "@/lib/supabase/server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface InboxConnection {
  connected: boolean;
  emailAddress: string | null;
  status: "ACTIVE" | "REVOKED" | "ERROR" | null;
}

// middleware.ts already guarantees the caller is signed in before any of
// apps/web's three inbox pages (admin/consultant/client) render, so a
// missing session here is treated as "not connected" rather than re-validated.
// /api/inbox is role-agnostic (see apps/api's inbox.router.ts) — each user
// connects their own Gmail, so no tenant resolution is needed here.
export async function getInboxConnection(): Promise<InboxConnection> {
  const notConnected: InboxConnection = { connected: false, emailAddress: null, status: null };

  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return notConnected;

  const res = await fetch(`${API_BASE_URL}/api/inbox/connection`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: "no-store",
  });
  if (!res.ok) return notConnected;
  const { data } = await res.json();
  return data as InboxConnection;
}
