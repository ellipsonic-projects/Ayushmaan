import { Inbox } from "lucide-react";

import { ComingSoon } from "@/components/ui/coming-soon";

export default function ClientInboxPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">Inbox</h2>
      <ComingSoon
        icon={Inbox}
        title="Secure messaging is on the way"
        description="Message your care team directly from Ayushman, all in one thread per conversation."
      />
    </div>
  );
}
