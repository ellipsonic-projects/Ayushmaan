import { Pencil, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ConsultantProfile } from "@/lib/api/consultants.server";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

const PAYMENT_TIMING_LABELS: Record<string, string> = {
  PAY_ON_BOOKING: "Pay on booking",
  PAY_AFTER_SESSION: "Pay after session",
};

export function ConsultantProfileDetails({
  consultant,
  onEdit,
}: {
  consultant: ConsultantProfile;
  onEdit?: () => void;
}) {
  return (
    <Card id="public-profile" className="scroll-mt-24">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <UserRound className="h-3.5 w-3.5" />
          Public Profile
        </CardTitle>
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Edit profile"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Display Name" value={consultant.fullName} />
        <Field label="Category" value={consultant.category} />
        <Field label="Sub-specialization" value={consultant.subSpecialization ?? ""} />
        <div className="flex flex-col gap-1 sm:col-span-2">
          <span className="text-xs text-muted-foreground">Bio</span>
          <span className="text-sm text-foreground">{consultant.bio || "—"}</span>
        </div>
        <Field label="Session Fee" value={`${consultant.currency} ${consultant.consultationFee}`} />
        <Field
          label="Payment Timing"
          value={PAYMENT_TIMING_LABELS[consultant.paymentTiming] ?? consultant.paymentTiming}
        />
        <Field label="Timezone" value={consultant.timezone} />
        <Field label="Languages Spoken" value={consultant.languagesSpoken.join(", ")} />
        <Field label="Accepting Bookings" value={consultant.isAcceptingNewClients ? "Yes" : "No"} />
        <Field
          label="Auto-approve Bookings"
          value={consultant.autoApproveBookings ? "Yes" : "No"}
        />
      </CardContent>
    </Card>
  );
}
