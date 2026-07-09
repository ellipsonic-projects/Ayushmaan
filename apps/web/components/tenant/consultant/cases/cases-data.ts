export type CaseStatus = "Open" | "On Hold" | "Closed";

export type CaseSummary = {
  id: string;
  caseCode: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  avatarClass: string;
  category: string;
  status: CaseStatus;
  startedAt: string;
  closedAt?: string;
  lastActivity: string;
  interactionCount: number;
  commitmentCount: number;
  taskCount: number;
  documentCount: number;
};

export const cases: CaseSummary[] = [
  {
    id: "case-sarah-doe",
    caseCode: "#CAS-000002",
    clientId: "sarah-doe",
    clientName: "Sarah Doe",
    clientCode: "#CAS-000002",
    avatarClass: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    category: "Financial Advisory",
    status: "Open",
    startedAt: "Jul 2, 2026",
    lastActivity: "2 hours ago",
    interactionCount: 3,
    commitmentCount: 2,
    taskCount: 2,
    documentCount: 3,
  },
  {
    id: "case-sarah-doe-tax-filing",
    caseCode: "#CAS-000005",
    clientId: "sarah-doe",
    clientName: "Sarah Doe",
    clientCode: "#CAS-000002",
    avatarClass: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
    category: "Tax Filing Assistance",
    status: "Closed",
    startedAt: "Feb 8, 2026",
    closedAt: "Mar 4, 2026",
    lastActivity: "Mar 4, 2026",
    interactionCount: 6,
    commitmentCount: 3,
    taskCount: 3,
    documentCount: 4,
  },
  {
    id: "case-john-doe",
    caseCode: "#CAS-000001",
    clientId: "john-doe",
    clientName: "John Doe",
    clientCode: "#CAS-000001",
    avatarClass: "bg-secondary text-secondary-foreground",
    category: "Retirement Planning",
    status: "Open",
    startedAt: "Apr 18, 2026",
    lastActivity: "Yesterday",
    interactionCount: 8,
    commitmentCount: 1,
    taskCount: 0,
    documentCount: 5,
  },
  {
    id: "case-ramesh-chandra",
    caseCode: "#CAS-88219",
    clientId: "ramesh-chandra",
    clientName: "Ramesh Chandra",
    clientCode: "#CAS-88219",
    avatarClass: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
    category: "Chronic Care Management",
    status: "On Hold",
    startedAt: "Feb 3, 2026",
    lastActivity: "6 days ago",
    interactionCount: 14,
    commitmentCount: 3,
    taskCount: 1,
    documentCount: 7,
  },
  {
    id: "case-priya-sharma",
    caseCode: "#CAS-91844",
    clientId: "priya-sharma",
    clientName: "Priya Sharma",
    clientCode: "#CAS-91844",
    avatarClass: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400",
    category: "Post-Op Follow-up",
    status: "Closed",
    startedAt: "Jan 10, 2026",
    closedAt: "Mar 22, 2026",
    lastActivity: "Mar 22, 2026",
    interactionCount: 11,
    commitmentCount: 4,
    taskCount: 4,
    documentCount: 6,
  },
  {
    id: "case-ananya-verma",
    caseCode: "#CAS-77301",
    clientId: "ananya-verma",
    clientName: "Ananya Verma",
    clientCode: "#CAS-77301",
    avatarClass: "bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
    category: "Lab Review",
    status: "Closed",
    startedAt: "Oct 2, 2025",
    closedAt: "Nov 14, 2025",
    lastActivity: "Nov 14, 2025",
    interactionCount: 5,
    commitmentCount: 2,
    taskCount: 2,
    documentCount: 2,
  },
];
