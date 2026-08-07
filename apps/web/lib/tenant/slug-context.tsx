"use client";

import { createContext, useContext, type ReactNode } from "react";

const TenantSlugContext = createContext<string | null>(null);

export function TenantSlugProvider({ slug, children }: { slug: string; children: ReactNode }) {
  return <TenantSlugContext.Provider value={slug}>{children}</TenantSlugContext.Provider>;
}

// Current tenant's slug, for building /{slug}/tenant/... links from within
// app/(tenant)/[slug]/... pages/components without each one re-deriving it
// from useParams().
export function useTenantSlug(): string {
  const slug = useContext(TenantSlugContext);
  if (!slug) throw new Error("useTenantSlug must be used within a TenantSlugProvider");
  return slug;
}
