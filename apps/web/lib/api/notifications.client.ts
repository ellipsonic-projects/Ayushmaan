"use client";

import { authedFetchForTenant } from "@/lib/api/authed-fetch";

export interface NotificationRow {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  channel: "IN_APP" | "EMAIL";
  payload: Record<string, unknown>;
  sentAt: string;
  readAt: string | null;
  createdAt: string;
}

// The bell only shows IN_APP rows — EMAIL rows in the same table are
// delivery records for that channel, not inbox items.
export function toInbox(rows: NotificationRow[]): NotificationRow[] {
  return rows.filter((n) => n.channel === "IN_APP");
}

export async function listNotifications(
  tenantId: string,
  tenantSlug?: string
): Promise<NotificationRow[]> {
  const { data } = await authedFetchForTenant(tenantId, tenantSlug, "/notifications");
  return data as NotificationRow[];
}

export async function markNotificationRead(
  tenantId: string,
  tenantSlug: string | undefined,
  notificationId: string
): Promise<NotificationRow> {
  const { data } = await authedFetchForTenant(
    tenantId,
    tenantSlug,
    `/notifications/${notificationId}/read`,
    {
      method: "PATCH",
    }
  );
  return data as NotificationRow;
}
