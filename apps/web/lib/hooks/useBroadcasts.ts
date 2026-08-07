import useSWR from "swr";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { authedFetchForTenant } from "@/lib/api/authed-fetch";

export type BroadcastUrgency = "INFO" | "WARNING" | "CRITICAL";
export type BroadcastScope = "GLOBAL" | "TARGETED_CLIENT";
export type BroadcastTargetRole = "ALL" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
export type BroadcastChannel = "IN_APP" | "EMAIL";

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  urgency: BroadcastUrgency;
  scope: BroadcastScope;
  targetClientId: string | null;
  targetTenantIds: string[];
  targetConsultantCategory: string | null;
  targetClientSegment: string | null;
  channels: BroadcastChannel[];
  status: "DRAFT" | "SENT";
  recipientCount: number;
  sentAt: string | null;
  createdAt: string;
}

export function useBroadcasts(limit = 20) {
  const { token } = useAuth();
  const { data, error, isLoading, mutate } = useSWR<{ data: Broadcast[] }>(
    token ? `/api/platform/notify/broadcasts?limit=${limit}` : null,
    (url: string) => api.get(url, token!)
  );
  return { broadcasts: data?.data ?? [], isLoading, error, mutate };
}

export interface BroadcastStats {
  activeUrgentAlerts: number;
  sentLast30Days: number;
  recipientsReachedLast30Days: number;
}

export function useBroadcastStats() {
  const { token } = useAuth();
  const { data, error, isLoading } = useSWR<{ data: BroadcastStats }>(
    token ? "/api/platform/notify/stats" : null,
    (url: string) => api.get(url, token!)
  );
  return { stats: data?.data ?? null, isLoading, error };
}

export interface AudienceFilter {
  scope: BroadcastScope;
  targetClientId?: string;
  targetTenantIds?: string[];
  targetRole?: BroadcastTargetRole;
  targetConsultantCategory?: string;
  targetClientSegment?: "ACTIVE" | "ON_HOLD";
}

function audienceQuery(filter: AudienceFilter) {
  const params = new URLSearchParams();
  params.set("scope", filter.scope);
  if (filter.targetClientId) params.set("targetClientId", filter.targetClientId);
  for (const id of filter.targetTenantIds ?? []) params.append("targetTenantIds", id);
  if (filter.targetRole) params.set("targetRole", filter.targetRole);
  if (filter.targetConsultantCategory)
    params.set("targetConsultantCategory", filter.targetConsultantCategory);
  if (filter.targetClientSegment) params.set("targetClientSegment", filter.targetClientSegment);
  return params.toString();
}

export function useAudienceEstimate(filter: AudienceFilter) {
  const { token } = useAuth();
  const qs = audienceQuery(filter);
  const canEstimate = filter.scope === "GLOBAL" || !!filter.targetClientId;
  const { data, error, isLoading } = useSWR<{ data: { recipientCount: number } }>(
    token && canEstimate ? `/api/platform/notify/audience-estimate?${qs}` : null,
    (url: string) => api.get(url, token!)
  );
  return { recipientCount: data?.data.recipientCount ?? 0, isLoading, error };
}

export interface CreateBroadcastInput extends AudienceFilter {
  title: string;
  body: string;
  urgency: BroadcastUrgency;
  channels: BroadcastChannel[];
}

export function createBroadcast(input: CreateBroadcastInput, token: string) {
  return api.post<{ data: Broadcast }>("/api/platform/notify/broadcasts", input, token);
}

// Minimal client-side lookup for the "Targeted to One Client" picker — a
// SUPER_ADMIN is allowed on the tenant-scoped clients list route (see
// clients.router.ts) same as a TENANT_ADMIN/CONSULTANT, so this reuses that
// route directly instead of a new platform-wide endpoint.
export interface AudienceClient {
  id: string;
  fullName: string;
}

export async function getTenantClientsForAudience(
  tenantId: string,
  tenantSlug: string
): Promise<AudienceClient[]> {
  const clients = await authedFetchForTenant(tenantId, tenantSlug, "/clients");
  return (clients?.data ?? []).map((c: { id: string; fullName: string }) => ({
    id: c.id,
    fullName: c.fullName,
  }));
}
