import { Calendar } from "lucide-react";

import { ComingSoon } from "@/components/ui/coming-soon";

export default function ConsultantCalendarPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">Calendar</h2>
      <ComingSoon
        icon={Calendar}
        title="Full calendar view is on the way"
        description="See every upcoming appointment across day, week, and month views in one place."
      />
    </div>
  );
}
