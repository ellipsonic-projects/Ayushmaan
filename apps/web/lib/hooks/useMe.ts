import useSWR from "swr";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";

interface Me {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "CONSULTANT" | "CLIENT";
  tenantId: string | null;
  tenant: { slug: string; status: "ACTIVE" | "SUSPENDED" | "ARCHIVED" } | null;
}

export function useMe() {
  const { token } = useAuth();

  const { data, error, isLoading } = useSWR<{ data: Me }>(
    token ? "/api/auth/me" : null,
    (url: string) => api.get(url, token!)
  );

  return { me: data?.data ?? null, isLoading, error };
}
