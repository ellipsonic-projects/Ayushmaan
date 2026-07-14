import useSWR from "swr";
import { api } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";

export interface TenantThemeConfig {
  primaryColor?: string;
  primaryForeground?: string;
}

export interface TenantSiteContent {
  navbar: { links: { label: string; href: string }[] };
  hero: { heading: string; subheading: string; ctaLabel: string };
  about: { heading: string; body: string };
  services: { heading: string; items: { title: string; description: string }[] };
  faq: { heading: string; items: { question: string; answer: string }[] };
  contact: { email: string; phone: string; address: string };
}

export interface TenantSite {
  displayName: string;
  logoUrl: string | null;
  themeConfig: TenantThemeConfig;
  siteContent: TenantSiteContent;
  layoutMode: "default" | "custom";
  customLayoutRequested: boolean;
}

export interface PublicTenantSite extends Omit<TenantSite, "customLayoutRequested"> {
  slug: string;
  customLayoutUrl: string | null;
}

// Unauthenticated — powers app/(tenant)/[slug]/(public), fetched server-side
// too (any Server Component can call api.get directly with the same path).
export function usePublicTenantSite(slug: string | null) {
  const { data, error, isLoading } = useSWR<{ data: PublicTenantSite }>(
    slug ? `/api/public/tenants/${slug}/site` : null,
    (url: string) => api.get(url)
  );

  return { site: data?.data ?? null, isLoading, error };
}

// Authenticated — tenant admin's own site editor.
export function useTenantSite(tenantId: string | null) {
  const { token } = useAuth();

  const { data, error, isLoading, mutate } = useSWR<{ data: TenantSite }>(
    tenantId && token ? `/api/tenants/${tenantId}/site` : null,
    (url: string) => api.get(url, token!)
  );

  return { site: data?.data ?? null, isLoading, error, mutate };
}

export function updateTenantSite(
  tenantId: string,
  updates: Partial<Pick<TenantSite, "displayName" | "logoUrl" | "themeConfig" | "siteContent">>,
  token: string
) {
  return api.patch<{ data: TenantSite }>(`/api/tenants/${tenantId}/site`, updates, token);
}

export function requestCustomLayout(tenantId: string, requested: boolean, token: string) {
  return api.patch<{ data: TenantSite }>(
    `/api/tenants/${tenantId}/site/custom-layout-request`,
    { requested },
    token
  );
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Multipart upload — bypasses the JSON-only `api` client. Persists the
// resulting public object URL as logoUrl server-side (POST /site/logo).
export async function uploadTenantLogo(tenantId: string, file: File, token: string) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/tenants/${tenantId}/site/logo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<{ data: TenantSite }>;
}
