import { UsersRound } from "lucide-react";

import { ComingSoon } from "@/components/ui/coming-soon";

export default function ConsultantTeamPage() {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-foreground">Your Team</h2>
      <ComingSoon
        icon={UsersRound}
        title="Team view is on the way"
        description="See the colleagues you collaborate with in this practice and their availability."
      />
    </div>
  );
}
