import type { CSSProperties, ReactNode } from "react";

import { api } from "@/lib/api/client";
import type { PublicTenantSite } from "@/lib/hooks";

// The ONLY place theme_config/logo is injected — everything below this
// layout (public landing, admin, consultant, client) is tenant-branded.
// Falls back to the default .tenant-theme colors (globals.css) whenever the
// tenant can't be resolved (unknown slug, suspended tenant, API hiccup) so a
// branding lookup failure never blocks access to the authenticated
// dashboards nested under this layout.
export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let themeConfig: PublicTenantSite["themeConfig"] = {};
  try {
    const res = await api.get<{ data: PublicTenantSite }>(`/api/public/tenants/${slug}/site`);
    themeConfig = res.data.themeConfig ?? {};
  } catch {
    // unknown/suspended tenant or API unreachable — render with default theme
  }

  const style: CSSProperties = {
    ...(themeConfig.primaryColor && { ["--primary" as string]: themeConfig.primaryColor }),
    ...(themeConfig.primaryForeground && {
      ["--primary-foreground" as string]: themeConfig.primaryForeground,
    }),
  };

  return (
    <div className="tenant-theme min-h-screen bg-background" style={style}>
      {children}
    </div>
  );
}
