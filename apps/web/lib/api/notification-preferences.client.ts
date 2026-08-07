"use client";

import { supabase } from "@/lib/supabase/client";
import type { NotificationPreferenceRow } from "@/lib/api/notification-preferences.server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function updateNotificationPreferences(
  tenantId: string,
  tenantSlug: string,
  preferences: NotificationPreferenceRow[]
): Promise<NotificationPreferenceRow[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/notification-preferences`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "X-Tenant-Slug": tenantSlug,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ preferences }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const { data } = await res.json();
  return data as NotificationPreferenceRow[];
}
