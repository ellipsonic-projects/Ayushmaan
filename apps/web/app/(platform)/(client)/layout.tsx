import type { ReactNode } from "react";

import { ClientSidebar } from "@/components/tenant/client/sidebar";
import { ClientHeader } from "@/components/tenant/client/header";
import { TourProvider } from "@/components/tour/tour-provider";
import { clientTourSteps } from "@/components/tour/steps/client-tour";

export default function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <TourProvider role="client" basePath="/client" steps={clientTourSteps}>
      <div className="client-scope platform-shell">
        <ClientSidebar />
        <div className="platform-shell-content">
          <ClientHeader />
          <main className="platform-shell-main">{children}</main>
        </div>
      </div>
    </TourProvider>
  );
}
