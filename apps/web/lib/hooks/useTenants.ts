import useSWR from "swr";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";

export interface Tenant {
  id: string;
  slug: string;
  displayName: string;
  planTier: "STANDARD" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  createdAt: string;
}

export interface TenantsQuery {
  status?: "ACTIVE" | "SUSPENDED" | "ARCHIVED";
  planTier?: string;
  search?: string;
}

export function useTenants(query: TenantsQuery = {}) {
  const { token } = useAuth();

  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.planTier) params.set("planTier", query.planTier);
  if (query.search) params.set("search", query.search);
  const qs = params.toString();

  const { data, error, isLoading, mutate } = useSWR<{ data: Tenant[] }>(
    token ? `/api/platform/tenants${qs ? `?${qs}` : ""}` : null,
    (url: string) => api.get(url, token!)
  );

  return { tenants: data?.data ?? [], isLoading, error, mutate };
}

export interface CreateTenantInput {
  slug: string;
  displayName: string;
  adminEmail: string;
  planTier: "STANDARD" | "PRO" | "ENTERPRISE";
}

export function createTenant(input: CreateTenantInput, token: string) {
  return api.post<{ data: Tenant }>("/api/platform/tenants", input, token);
}
