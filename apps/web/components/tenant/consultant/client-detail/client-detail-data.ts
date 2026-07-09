export type ClientTag = { label: string; className: string };

export type ClientProfile = {
  id: string;
  name: string;
  age: number;
  gender: string;
  clientCode: string;
  status: "Lead" | "Active" | "Wait List" | "Inactive";
  category: string;
  tags: ClientTag[];
  avatarClass: string;
  phone: string;
  email: string;
  address: string;
  preferredLanguage: string;
  emergencyContact: string;
  consultantName: string;
  since: string;
  nextAppointment: string;
  riskNote?: string;
};

const tagClass: Record<string, string> = {
  VIP: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-400",
  Lead: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-400",
  "New Client": "border-border bg-muted text-muted-foreground",
};

export const clientProfile: ClientProfile = {
  id: "sarah-doe",
  name: "Sarah Doe",
  age: 41,
  gender: "Female",
  clientCode: "#CAS-000002",
  status: "Lead",
  category: "Financial Advisory",
  tags: [
    { label: "VIP", className: tagClass.VIP },
    { label: "New Client", className: tagClass["New Client"] },
  ],
  avatarClass: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-400",
  phone: "+1 (555) 214-8890",
  email: "sarah.doe@example.com",
  address: "412 Maple Street, Austin, TX",
  preferredLanguage: "English",
  emergencyContact: "Mark Doe (Spouse) · +1 (555) 214-8891",
  consultantName: "You",
  since: "Jul 2026",
  nextAppointment: "Fri, 12 Jul · 10:00 AM",
  riskNote: "Risk-averse profile — prefers steady growth over high-yield options.",
};

export const clientStats: { label: string; value: string; note: string }[] = [
  { label: "Sessions Completed", value: "3", note: "Last: 2 days ago" },
  { label: "Open Commitments", value: "2", note: "1 in progress" },
  { label: "Pending Tasks", value: "2", note: "1 due today" },
  { label: "Documents on File", value: "3", note: "1 internal only" },
];
