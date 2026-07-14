import type { ReactNode } from "react";

export default function TenantLayout({ children }: { children: ReactNode }) {
  return <div className="tenant-theme min-h-screen bg-background">{children}</div>;
}
