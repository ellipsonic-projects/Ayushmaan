export type CaseStatus = "Open" | "On Hold" | "Closed";

export type CaseConsultantAssignment = {
  id: string;
  consultantName: string;
  role: string;
  from: string;
  to?: string;
  current: boolean;
  reason?: string;
};

export type SessionStatus = "Scheduled" | "Completed" | "Cancelled";

export type CaseSession = {
  id: string;
  title: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: SessionStatus;
  consultantName: string;
};

export type CaseDetail = {
  id: string;
  caseCode: string;
  category: string;
  status: CaseStatus;
  createdAt: string;
  closedAt?: string;
  nextAppointment?: string;
  requirements: string;
  client: {
    name: string;
    clientCode: string;
    avatarClass: string;
    phone: string;
    email: string;
  };
  consultants: CaseConsultantAssignment[];
  sessions: CaseSession[];
};

export const caseDetail: CaseDetail = {
  id: "case-sarah-doe",
  caseCode: "#CAS-000002",
  category: "Financial Advisory",
  status: "Open",
  createdAt: "Jul 2, 2026",
  nextAppointment: "Fri, 26 Jul · 10:00 AM",
  requirements:
    "Client is seeking a conservative retirement portfolio review with a focus on capital preservation. She wants a risk assessment completed before committing to any new allocations, and would like her spouse looped into future sessions. Primary goal: steady growth over the next 15 years ahead of retirement at 60.",
  client: {
    name: "Sarah Doe",
    clientCode: "#CAS-000002",
    avatarClass: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    phone: "+1 (555) 214-8890",
    email: "sarah.doe@example.com",
  },
  consultants: [
    {
      id: "assign-2",
      consultantName: "You",
      role: "Primary Consultant",
      from: "Jul 15, 2026",
      current: true,
    },
    {
      id: "assign-1",
      consultantName: "Dr. Anil Kapoor",
      role: "Primary Consultant",
      from: "Jul 2, 2026",
      to: "Jul 15, 2026",
      current: false,
      reason: "Reassigned due to caseload rebalancing",
    },
  ],
  sessions: [
    {
      id: "sarah-initial-assessment",
      title: "Initial Assessment",
      scheduledStart: "Mon, 6 Jul · 10:00 AM",
      scheduledEnd: "11:00 AM",
      status: "Completed",
      consultantName: "Dr. Anil Kapoor",
    },
    {
      id: "sarah-risk-review",
      title: "Risk Tolerance Review",
      scheduledStart: "Mon, 13 Jul · 11:00 AM",
      scheduledEnd: "11:45 AM",
      status: "Completed",
      consultantName: "Dr. Anil Kapoor",
    },
    {
      id: "sarah-portfolio-review",
      title: "Portfolio Handoff Session",
      scheduledStart: "Mon, 20 Jul · 2:00 PM",
      scheduledEnd: "2:45 PM",
      status: "Completed",
      consultantName: "You",
    },
    {
      id: "sarah-follow-up",
      title: "Follow-up Consultation",
      scheduledStart: "Fri, 26 Jul · 10:00 AM",
      scheduledEnd: "10:45 AM",
      status: "Scheduled",
      consultantName: "You",
    },
  ],
};
