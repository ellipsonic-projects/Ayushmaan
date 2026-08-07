"use client";

import type { ReactNode } from "react";

import { ConsultantSidebar } from "@/components/tenant/consultant/sidebar";
import { ConsultantHeader } from "@/components/tenant/consultant/header";
import { QuickCaptureWidget } from "@/components/session/quick-capture-widget";
import { QuickCaptureProvider } from "@/lib/quick-capture-context";
import { TourProvider } from "@/components/tour/tour-provider";
import { consultantTourSteps } from "@/components/tour/steps/consultant-tour";
import { useTenantSlug } from "@/lib/tenant/slug-context";

export default function ConsultantLayout({ children }: { children: ReactNode }) {
  const slug = useTenantSlug();

  return (
    <TourProvider
      role="consultant"
      basePath={`/${slug}/tenant/consultant`}
      steps={consultantTourSteps}
    >
      <QuickCaptureProvider>
        <div className="tenant-theme consultant-scope platform-shell">
          <ConsultantSidebar />
          <div className="platform-shell-content">
            <ConsultantHeader />
            <main className="platform-shell-main">{children}</main>
          </div>
          <QuickCaptureWidget />
        </div>
      </QuickCaptureProvider>
    </TourProvider>
  );
}
