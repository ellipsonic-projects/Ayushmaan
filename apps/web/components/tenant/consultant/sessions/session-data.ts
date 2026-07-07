export type CalendarMember = {
  id: string;
  label: string;
  colorClass?: string;
};

export type SessionEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  memberId?: string;
  consultantName?: string;
  clientName: string;
  clientCode: string;
  clientStatus: "Lead" | "Active" | "Wait List";
  appointmentStatus: "Confirmed" | "Pending" | "Cancelled";
  paymentStatus: "Paid" | "Unpaid";
  serviceName: string;
  serviceDuration: string;
  servicePrice: string;
  description: string;
  colorClass: string;
};

export function dateAt(daysFromMonday: number, hour: number, minute = 0) {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - diffToMonday);
  const target = new Date(monday);
  target.setDate(monday.getDate() + daysFromMonday);
  target.setHours(hour, minute, 0, 0);
  return target;
}

export const sessionEvents: SessionEvent[] = [
  {
    id: "sarah-initial-assessment",
    title: "Sarah D - Initial Assessment",
    start: dateAt(1, 10, 0),
    end: dateAt(1, 11, 0),
    clientName: "Sarah Doe",
    clientCode: "000002",
    clientStatus: "Lead",
    appointmentStatus: "Confirmed",
    paymentStatus: "Unpaid",
    serviceName: "Initial Assessment",
    serviceDuration: "60 mins",
    servicePrice: "₹150.00",
    description: "Initial Assessment with Sarah Doe",
    colorClass: "bg-emerald-600",
  },
  {
    id: "john-final-appointment",
    title: "John D - Final Appointment",
    start: dateAt(1, 13, 0),
    end: dateAt(1, 13, 45),
    clientName: "John Doe",
    clientCode: "000001",
    clientStatus: "Active",
    appointmentStatus: "Confirmed",
    paymentStatus: "Paid",
    serviceName: "Standard Appointment",
    serviceDuration: "45 mins",
    servicePrice: "₹100.00",
    description: "Final Appointment with John Doe",
    colorClass: "bg-secondary",
  },
];
