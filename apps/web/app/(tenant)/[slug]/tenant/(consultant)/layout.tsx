import type { ReactNode } from "react";

import { ConsultantSidebar } from "@/components/tenant/consultant/sidebar";
import { ConsultantHeader } from "@/components/tenant/consultant/header";

export default function ConsultantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="consultant-scope flex h-screen overflow-hidden bg-background">
      <ConsultantSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <ConsultantHeader />
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
