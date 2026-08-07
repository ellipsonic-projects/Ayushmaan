import { notFound } from "next/navigation";
import { format } from "date-fns";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SessionRecordingPanel } from "@/components/session/session-recording-panel";
import { getSessionAppointment } from "@/lib/api/session-recording.server";

export default async function ConsultantSessionRecordingPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const appointment = await getSessionAppointment(appointmentId);

  if (!appointment) notFound();

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>
            {appointment.case.category} session &middot;{" "}
            {format(new Date(appointment.scheduledStart), "EEE, d MMM · h:mm a")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {appointment.case.matterKey ?? "No matter key set"}
        </CardContent>
      </Card>

      <div data-tour="consultant-session-recording">
        <SessionRecordingPanel caseId={appointment.caseId} appointmentId={appointment.id} />
      </div>
    </div>
  );
}
