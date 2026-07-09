export type CaseSummary = {
  id: string;
  clientName: string;
  clientCode: string;
  clientStatus: "Lead" | "Active" | "Wait List";
  category: string;
  status: "Open" | "On Hold" | "Closed";
  consultantName: string;
  nextAppointment: string;
};

export type InteractionType = "Call" | "Meeting" | "Message" | "Note";

export type InteractionItem = {
  id: string;
  type: InteractionType;
  summary: string;
  notes: string;
  createdAt: Date;
  isClientVisible: boolean;
};

export type CommitmentStatus = "Pending" | "In Progress" | "Completed" | "Overdue";

export type CommitmentItem = {
  id: string;
  title: string;
  description: string;
  status: CommitmentStatus;
  dueAt: Date;
};

export type TaskStatus = "Pending" | "In Progress" | "Completed";

export type TaskItem = {
  id: string;
  title: string;
  assignedTo: string;
  status: TaskStatus;
  dueAt: Date;
};

export type DocumentItem = {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: Date;
  isClientVisible: boolean;
  sizeLabel: string;
};

export type NoteItem = {
  id: string;
  author: string;
  content: string;
  createdAt: Date;
};

export type ChatSender = "consultant" | "ai";

export type ChatMessageItem = {
  id: string;
  sender: ChatSender;
  content: string;
  createdAt: Date;
};

export const caseSummary: CaseSummary = {
  id: "sarah-initial-assessment",
  clientName: "Sarah Doe",
  clientCode: "000002",
  clientStatus: "Lead",
  category: "Financial Advisory",
  status: "Open",
  consultantName: "You",
  nextAppointment: "Fri, 12 Jul · 10:00 AM",
};

export const interactions: InteractionItem[] = [
  {
    id: "int-3",
    type: "Meeting",
    summary: "Initial assessment call",
    notes:
      "Discussed retirement goals and current portfolio allocation. Client is risk-averse, prefers steady growth over high-yield options.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isClientVisible: true,
  },
  {
    id: "int-2",
    type: "Message",
    summary: "Follow-up on document request",
    notes: "Client confirmed they will upload bank statements by end of week.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isClientVisible: true,
  },
  {
    id: "int-1",
    type: "Call",
    summary: "Intake screening call",
    notes: "Qualified lead. Referred by existing client John Doe.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    isClientVisible: false,
  },
];

export const commitments: CommitmentItem[] = [
  {
    id: "com-1",
    title: "Submit portfolio risk assessment",
    description: "Draft and send the risk assessment summary based on the initial call.",
    status: "In Progress",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
  },
  {
    id: "com-2",
    title: "Review uploaded bank statements",
    description: "Verify statements once client uploads them and flag discrepancies.",
    status: "Pending",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2),
  },
  {
    id: "com-3",
    title: "Send welcome packet",
    description: "Share onboarding documents and service agreement.",
    status: "Completed",
    dueAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

export const tasks: TaskItem[] = [
  {
    id: "task-1",
    title: "Prepare onboarding checklist for Sarah Doe",
    assignedTo: "You",
    status: "In Progress",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 4),
  },
  {
    id: "task-2",
    title: "Confirm payment method on file",
    assignedTo: "You",
    status: "Pending",
    dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
  },
];

export const documents: DocumentItem[] = [
  {
    id: "doc-1",
    fileName: "Service_Agreement_SarahDoe.pdf",
    fileType: "PDF",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
    isClientVisible: true,
    sizeLabel: "220 KB",
  },
  {
    id: "doc-2",
    fileName: "Risk_Tolerance_Questionnaire.pdf",
    fileType: "PDF",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    isClientVisible: true,
    sizeLabel: "98 KB",
  },
  {
    id: "doc-3",
    fileName: "Internal_Screening_Notes.docx",
    fileType: "DOCX",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    isClientVisible: false,
    sizeLabel: "34 KB",
  },
];

export const notes: NoteItem[] = [
  {
    id: "note-1",
    author: "You",
    content: "Client mentioned she may want to involve her spouse in future sessions.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: "note-2",
    author: "You",
    content: "Double check eligibility for the premium advisory tier before next call.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

export const chatMessages: ChatMessageItem[] = [
  {
    id: "chat-1",
    sender: "ai",
    content:
      "Hi! I'm your AI assistant for this case. Ask me anything about Sarah's interactions, commitments, or documents.",
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
  },
];
