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

export interface TenantCustomLayoutStatus {
  layoutMode: "default" | "custom";
  customLayoutRequested: boolean;
}

// Super-admin-only deep view — every cross-tenant read here is audit-logged
// and requires a `reason` (data_api_v4.md §4), so this hook is scoped to just
// the fields the custom-layout card needs rather than reusing the full
// tenant-detail fetch.
export function useTenantCustomLayoutStatus(tenantId: string | null) {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<{ data: TenantCustomLayoutStatus }>(
    tenantId && token
      ? `/api/platform/tenants/${tenantId}?reason=${encodeURIComponent("Manage custom layout")}`
      : null,
    (url: string) => api.get(url, token!)
  );

  return { status: data?.data ?? null, isLoading, error, mutate };
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Multipart upload — bypasses the JSON-only `api` client, same pattern as
// uploadTenantLogo in useTenantSite.ts.
export async function uploadTenantCustomLayout(tenantId: string, file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/platform/tenants/${tenantId}/custom-layout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<{ data: Tenant }>;
}

export function removeTenantCustomLayout(tenantId: string, token: string) {
  return api.delete<{ data: Tenant }>(`/api/platform/tenants/${tenantId}/custom-layout`, token);
}
