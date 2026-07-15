import useSWR from "swr";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import type { MeResponse } from "@/lib/auth/destination";

export function useMe() {
  const { token } = useAuth();

  const { data, error, isLoading } = useSWR<{ data: MeResponse }>(
    token ? "/api/auth/me" : null,
    (url: string) => api.get(url, token!)
  );

  return { me: data?.data ?? null, isLoading, error };
}
