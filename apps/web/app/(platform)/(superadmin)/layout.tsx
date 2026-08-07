import type { ReactNode } from "react";

import { PlatformSidebar } from "@/components/platform/sidebar";
import { PlatformHeader } from "@/components/platform/header";
import { PlatformFooter } from "@/components/platform/footer";
import { TourProvider } from "@/components/tour/tour-provider";
import { superadminTourSteps } from "@/components/tour/steps/superadmin-tour";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <TourProvider role="superadmin" basePath="/superadmin" steps={superadminTourSteps}>
      <div className="platform-theme platform-shell">
        <PlatformSidebar />
        <div className="platform-shell-content">
          <PlatformHeader />
          <main className="platform-shell-main">{children}</main>
          <PlatformFooter />
        </div>
      </div>
    </TourProvider>
  );
}
