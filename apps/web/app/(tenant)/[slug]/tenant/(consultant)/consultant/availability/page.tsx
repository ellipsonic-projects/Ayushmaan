import { ConsultantAvailabilityView } from "@/components/tenant/consultant/availability/availability-view";
import {
  getOwnConsultantProfile,
  getTenantConsultantAvailabilityDetail,
} from "@/lib/api/consultants.server";

export default async function ConsultantAvailabilityPage() {
  const consultant = await getOwnConsultantProfile();
  const { slots, clientVisibleSlots } = consultant
    ? await getTenantConsultantAvailabilityDetail(consultant.id)
    : { slots: [], clientVisibleSlots: [] };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Availability</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your recurring weekly hours are set by your tenant admin. You can block a slot with a
          reason if you need to step away. Clients can only book into slots that are OPEN.
        </p>
      </div>
      {consultant ? (
        <ConsultantAvailabilityView
          timezone={consultant.timezone}
          slots={slots}
          clientVisibleSlots={clientVisibleSlots}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Unable to load your profile.</p>
      )}
    </div>
  );
}
