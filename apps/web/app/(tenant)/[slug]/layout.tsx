import type { ReactNode } from "react";
import { TenantSlugProvider } from "@/lib/tenant/slug-context";

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <TenantSlugProvider slug={slug}>
      <div className="tenant-theme min-h-screen bg-background">{children}</div>
    </TenantSlugProvider>
  );
}
