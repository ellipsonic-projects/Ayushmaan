import { TeamStatusGrid } from "@/components/tenant/consultant/team/team-status-grid";

export default function ConsultantTeamPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Your Team</h2>
        <p className="text-sm text-muted-foreground">
          Peer consultants in this practice and their current status.
        </p>
      </div>
      <TeamStatusGrid />
    </div>
  );
}
