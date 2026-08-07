import useSWR from "swr";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import type { MeResponse } from "@/lib/auth/destination";

export function useMe() {
  const { token, logout } = useAuth();
  const router = useRouter();

  const { data, error, isLoading } = useSWR<{ data: MeResponse }>(
    token ? "/api/auth/me" : null,
    (url: string) => api.get(url, token!),
    {
      onError: (err) => {
        // The session token is valid but the local `users` row it points to
        // is gone (account deleted, tenant change, etc.) — sign out instead
        // of leaving the fetch rejection uncaught.
        if (
          err instanceof ApiError &&
          err.statusCode === 401 &&
          err.message === "No matching account"
        ) {
          logout().then(() => router.replace("/signin"));
        }
      },
    }
  );

  return { me: data?.data ?? null, isLoading, error };
}
