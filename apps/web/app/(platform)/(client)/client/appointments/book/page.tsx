import { BookAppointmentFlow } from "@/components/tenant/client/appointments/book-appointment-flow";
import { getOwnClientProfile } from "@/lib/api/clients.server";

export default async function BookAppointmentPage() {
  const client = await getOwnClientProfile();

  return <BookAppointmentFlow client={client} />;
}
