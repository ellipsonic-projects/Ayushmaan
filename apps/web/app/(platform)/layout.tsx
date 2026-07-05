import type { ReactNode } from "react";

import { PlatformSidebar } from "@/components/platform/sidebar";
import { PlatformHeader } from "@/components/platform/header";
import { PlatformFooter } from "@/components/platform/footer";

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <PlatformSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <PlatformHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
        <PlatformFooter />
      </div>
    </div>
  );
}
