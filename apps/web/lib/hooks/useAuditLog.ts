import useSWR from "swr";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  actorUserId: string;
  actorRole: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
  isCrossTenantAccess: boolean;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  createdAt: string;
  tenant: { id: string; displayName: string } | null;
  actor: { id: string; email: string } | null;
}

export interface AuditLogQuery {
  tenantId?: string;
  actorUserId?: string;
  isCrossTenantAccess?: boolean;
  limit?: number;
}

export function useAuditLog(query: AuditLogQuery = {}) {
  const { token } = useAuth();

  const params = new URLSearchParams();
  if (query.tenantId) params.set("tenantId", query.tenantId);
  if (query.actorUserId) params.set("actorUserId", query.actorUserId);
  if (query.isCrossTenantAccess !== undefined)
    params.set("isCrossTenantAccess", String(query.isCrossTenantAccess));
  params.set("limit", String(query.limit ?? 100));

  const { data, error, isLoading, mutate } = useSWR<{ data: AuditLogEntry[] }>(
    token ? `/api/platform/audit-log?${params.toString()}` : null,
    (url: string) => api.get(url, token!)
  );

  return { entries: data?.data ?? [], isLoading, error, mutate };
}
