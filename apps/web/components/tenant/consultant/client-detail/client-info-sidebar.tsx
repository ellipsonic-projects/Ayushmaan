import {
  Phone,
  Mail,
  MapPin,
  Languages,
  ShieldAlert,
  UserRound,
  CalendarClock,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { ClientProfile } from "@/components/tenant/consultant/client-detail/client-detail-data";

function InfoRow({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

export function ClientInfoSidebar({ client }: { client: ClientProfile }) {
  return (
    <aside className="sticky top-5 flex w-full shrink-0 flex-col gap-4 lg:w-72">
      <Card>
        <CardHeader>
          <CardTitle>Contact & Details</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <InfoRow icon={Phone} label="Phone" value={client.phone} />
          <InfoRow icon={Mail} label="Email" value={client.email} />
          <InfoRow icon={MapPin} label="Address" value={client.address} />
          <InfoRow icon={Languages} label="Preferred Language" value={client.preferredLanguage} />
          <InfoRow icon={ShieldAlert} label="Emergency Contact" value={client.emergencyContact} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Case Overview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <InfoRow icon={UserRound} label="Assigned Consultant" value={client.consultantName} />
          <InfoRow icon={CalendarClock} label="Client Since" value={client.since} />
          <InfoRow icon={CalendarClock} label="Next Appointment" value={client.nextAppointment} />
        </CardContent>
      </Card>
    </aside>
  );
}
