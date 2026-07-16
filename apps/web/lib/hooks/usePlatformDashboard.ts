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

export interface PlatformGrievance {
  id: string;
  category: GrievanceCategory;
  description: string;
  severity: GrievanceSeverity;
  status: GrievanceStatus;
  createdAt: string;
  tenant: { id: string; displayName: string } | null;
}

export function useRecentGrievances(limit = 3) {
  const { token } = useAuth();

  const { data, error, isLoading } = useSWR<{ data: PlatformGrievance[] }>(
    token ? `/api/platform/grievances?status=OPEN&limit=${limit}` : null,
    (url: string) => api.get(url, token!)
  );

  return { grievances: data?.data ?? [], isLoading, error };
}
