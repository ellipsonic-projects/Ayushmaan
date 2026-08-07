"use client";

import { useMemo } from "react";
import useSWR from "swr";

import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import {
  listNotifications,
  markNotificationRead,
  toInbox,
  type NotificationRow,
} from "@/lib/api/notifications.client";
import type { OwnClientProfile } from "@/lib/api/clients.server";

// A CLIENT has no home tenant (clients.server.ts:115-121) — their cases can
// span multiple tenants, so notifications must be fanned out per tenant and
// merged, mirroring the pattern in client-tasks.server.ts.
export function useClientNotifications() {
  const { token } = useAuth();
  const { data: profileRes } = useSWR<{ data: OwnClientProfile }>(
    token ? "/api/clients/me" : null,
    (url: string) => api.get(url, token!)
  );

  const tenants = useMemo(() => {
    const cases = profileRes?.data?.cases ?? [];
    const byTenant = new Map<string, { tenantId: string; tenantSlug: string }>();
    for (const c of cases)
      byTenant.set(c.tenantId, { tenantId: c.tenantId, tenantSlug: c.tenant.slug });
    return Array.from(byTenant.values());
  }, [profileRes]);

  const swrKey = tenants.length
    ? ([
        "client-notifications",
        tenants
          .map((t) => t.tenantId)
          .sort()
          .join(","),
      ] as const)
    : null;
  const { data, isLoading, mutate } = useSWR<NotificationRow[]>(
    swrKey,
    async () => {
      const lists = await Promise.all(
        tenants.map((t) => listNotifications(t.tenantId, t.tenantSlug))
      );
      return toInbox(lists.flat()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    { refreshInterval: 60_000 }
  );

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function markAsRead(notificationId: string) {
    const target = notifications.find((n) => n.id === notificationId);
    if (!target) return;
    const tenantSlug = tenants.find((t) => t.tenantId === target.tenantId)?.tenantSlug;
    await markNotificationRead(target.tenantId, tenantSlug, notificationId);
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
