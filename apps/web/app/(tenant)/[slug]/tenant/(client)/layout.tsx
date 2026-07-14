import type { ReactNode } from "react";

import { ClientSidebar } from "@/components/tenant/client/sidebar";
import { ClientHeader } from "@/components/tenant/client/header";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <div className="client-scope flex h-screen overflow-hidden bg-background">
      <ClientSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ClientHeader />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
