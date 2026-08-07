"use client";

import useSWR from "swr";
import { useAuth } from "@/lib/auth/context";
import { useMe } from "@/lib/hooks/useMe";
import { apiCall } from "@/lib/api/client";

export interface SearchResults {
  consultants: { id: string; fullName: string; category: string }[];
  clients: { id: string; fullName: string }[];
  interactions: {
    id: string;
    notes: string | null;
    type: string;
    caseId: string;
    case: { client: { fullName: string } };
  }[];
  commitments: { id: string; title: string; status: string; caseId: string }[];
  tasks: { id: string; title: string; status: string; caseId: string }[];
}

// GET /tenants/:tenantId/search — backs the header search bar
// (search.router.ts). Scoped to the caller's own cases when they're a
// CONSULTANT, tenant-wide for TENANT_ADMIN/SUPER_ADMIN.
export function useGlobalSearch(query: string) {
  const { token } = useAuth();
  const { me } = useMe();

  const trimmed = query.trim();
  const tenantId = me?.tenantId;
  const tenantSlug = me?.tenant?.slug;
  const canSearch = Boolean(token && tenantId && tenantSlug) && trimmed.length >= 2;

  const { data, error, isLoading } = useSWR<{ data: SearchResults }>(
    canSearch ? ["/search", tenantId, trimmed, token] : null,
    () =>
      apiCall<{ data: SearchResults }>(
        `/api/tenants/${tenantId}/search?q=${encodeURIComponent(trimmed)}`,
        { token: token ?? undefined, headers: { "X-Tenant-Slug": tenantSlug! } }
      ),
    { keepPreviousData: true }
  );

  return {
    results: data?.data ?? null,
    isLoading: isLoading && canSearch,
    error,
    isActive: trimmed.length >= 2,
  };
}
