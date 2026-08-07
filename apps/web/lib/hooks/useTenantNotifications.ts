"use client";

import useSWR from "swr";

import {
  listNotifications,
  markNotificationRead,
  toInbox,
  type NotificationRow,
} from "@/lib/api/notifications.client";

export function useTenantNotifications(tenantId: string | null | undefined, tenantSlug?: string) {
  const key = tenantId ? (["notifications", tenantId, tenantSlug ?? ""] as const) : null;
  const { data, isLoading, mutate } = useSWR<NotificationRow[]>(
    key,
    () => listNotifications(tenantId!, tenantSlug).then(toInbox),
    { refreshInterval: 60_000 }
  );

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function markAsRead(notificationId: string) {
    await markNotificationRead(tenantId!, tenantSlug, notificationId);
    mutate(
      (current) =>
        current?.map((n) =>
          n.id === notificationId ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n
        ),
      { revalidate: false }
    );
  }

  return { notifications, unreadCount, isLoading, markAsRead };
}
