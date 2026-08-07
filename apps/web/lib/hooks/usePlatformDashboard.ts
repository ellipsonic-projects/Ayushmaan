import useSWR from "swr";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";

export interface PlatformDashboardStats {
  activeTenants: number;
  openGrievances: number;
  criticalGrievances: number;
  totalUsers: number;
  newTenants: number;
}

export function usePlatformDashboardStats() {
  const { token } = useAuth();

  const { data, error, isLoading } = useSWR<{ data: PlatformDashboardStats }>(
    token ? "/api/platform/dashboard" : null,
    (url: string) => api.get(url, token!)
  );

  return { stats: data?.data ?? null, isLoading, error };
}

export type GrievanceSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type GrievanceStatus = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED";
export type GrievanceCategory =
  "SERVICE_QUALITY" | "MISCONDUCT" | "BILLING_DISPUTE" | "DATA_PRIVACY" | "OTHER";

export type GrievanceSubjectType = "CONSULTANT" | "TENANT_ADMIN" | "BILLING" | "PLATFORM" | "OTHER";

export interface PlatformGrievance {
  id: string;
  tenantId: string;
  clientId: string;
  subjectType: GrievanceSubjectType;
  subjectConsultantId: string | null;
  category: GrievanceCategory;
  description: string;
  severity: GrievanceSeverity;
  status: GrievanceStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  tenant: { id: string; displayName: string } | null;
  client: { id: string; fullName: string } | null;
  subjectConsultant: { id: string; fullName: string } | null;
}

export function useRecentGrievances(limit = 3) {
  const { token } = useAuth();

  const { data, error, isLoading } = useSWR<{ data: PlatformGrievance[] }>(
    token ? `/api/platform/grievances?status=OPEN&limit=${limit}` : null,
    (url: string) => api.get(url, token!)
  );

  return { grievances: data?.data ?? [], isLoading, error };
}

export interface GrievancesQuery {
  tenantId?: string;
  category?: GrievanceCategory;
  severity?: GrievanceSeverity;
  status?: GrievanceStatus;
  limit?: number;
}

export function useGrievances(query: GrievancesQuery = {}) {
  const { token } = useAuth();

  const params = new URLSearchParams();
  if (query.tenantId) params.set("tenantId", query.tenantId);
  if (query.category) params.set("category", query.category);
  if (query.severity) params.set("severity", query.severity);
  if (query.status) params.set("status", query.status);
  params.set("limit", String(query.limit ?? 100));

  const { data, error, isLoading, mutate } = useSWR<{ data: PlatformGrievance[] }>(
    token ? `/api/platform/grievances?${params.toString()}` : null,
    (url: string) => api.get(url, token!)
  );

  return { grievances: data?.data ?? [], isLoading, error, mutate };
}
