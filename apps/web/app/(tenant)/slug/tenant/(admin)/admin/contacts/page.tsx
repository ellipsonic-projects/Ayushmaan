import { Contact } from "lucide-react";

import { ComingSoon } from "@/components/ui/coming-soon";

export default function TenantAdminContactsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">Contacts</h2>
      <ComingSoon
        icon={Contact}
        title="A shared contacts directory is on the way"
        description="Referring physicians, pharmacies, and other non-client contacts, shared across your tenant."
      />
    </div>
  );
}
