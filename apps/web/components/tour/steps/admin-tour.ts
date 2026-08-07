import type { TourStep } from "../types";

export const adminTourSteps: TourStep[] = [
  {
    target: '[data-tour="admin-sidebar"]',
    route: "/dashboard",
    title: "Practice Dashboard",
    content:
      "Your command center — practice-wide stats, upcoming appointments, consultant availability, and revenue.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-stats-row"]',
    route: "/dashboard",
    title: "Key Metrics",
    content: "Active clients, total cases, pending appointments, and revenue — all at a glance.",
    placement: "bottom",
  },
  {
    target: '[data-tour="admin-upcoming-appointments"]',
    route: "/dashboard",
    title: "Upcoming Appointments",
    content:
      "See what's scheduled across all consultants. Click to view details or propose changes.",
    placement: "top",
  },
  {
    target: '[data-tour="admin-consultant-status"]',
    route: "/dashboard",
    title: "Consultant Status",
    content:
      "Workload snapshot per consultant — available hours, active cases, and availability status.",
    placement: "left",
  },
  {
    target: '[data-tour="admin-nav-consultants"]',
    route: "/consultants",
    title: "Consultant Directory",
    content:
      "View and manage all consultants. Edit profiles, view availability, monitor utilization.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-applications"]',
    route: "/consultant-applications",
    title: "Applications",
    content: "Review consultant applications. Generate invite codes to recruit new consultants.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-clients"]',
    route: "/clients",
    title: "Client Directory",
    content:
      "All clients in your practice. Filter by case status and deadlines. Book on their behalf.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-appointments"]',
    route: "/appointments",
    title: "Appointment Queue",
    content:
      "New booking requests land here first. Approve, reschedule, or reject — then the consultant accepts or declines.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-scheduler"]',
    route: "/scheduler",
    title: "Master Scheduler",
    content:
      "Bird's-eye view of every consultant's schedule. Spot conflicts, see utilization, resolve overlaps.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-templates"]',
    route: "/templates",
    title: "Templates",
    content: "Create message and form templates for your practice. Share them with consultants.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-templates-board"]',
    route: "/templates",
    title: "Templates Board",
    content: "Board view of all templates. Filter by type. Create new with the + button.",
    placement: "top",
  },
  {
    target: '[data-tour="admin-nav-workflows"]',
    route: "/workflows",
    title: "Workflows",
    content: "Automate actions on case creation, booking, and session completion.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-workflows-board"]',
    route: "/workflows",
    title: "Workflows Board",
    content: "Tenant-wide workflows. View run history, toggle active/inactive.",
    placement: "top",
  },
  {
    target: '[data-tour="admin-nav-settings"]',
    route: "/settings",
    title: "Practice Settings",
    content:
      "Configure branding, currency, payout cycle, booking cutoff hours, and auto-approve defaults.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-audit-log"]',
    route: "/audit-log",
    title: "Audit Log",
    content:
      "Every sensitive action in your practice — logins, edits, approvals — with who, what, and when.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-billing"]',
    route: "/billing",
    title: "Billing",
    content: "Overview, invoices, and the payments ledger for your practice — all in one place.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-calendar"]',
    route: "/calendar",
    title: "Practice Calendar",
    content:
      "Every consultant's sessions in one calendar. Filter by consultant, spot gaps and overlaps.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-contacts"]',
    route: "/contacts",
    title: "Contacts",
    content: "A CRM-style directory of leads and contacts before they become clients.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-grievance"]',
    route: "/grievance",
    title: "Escalate to Platform",
    content: "Raise an issue directly with the Ayushman platform team and track your escalations.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-inbox"]',
    route: "/inbox",
    title: "Inbox",
    content: "Connect and manage your practice's shared email/WhatsApp inbox in one workspace.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-nav-notifications"]',
    route: "/notifications",
    title: "Notifications",
    content: "Choose how you're notified about consultants, tasks, and practice activity.",
    placement: "right",
  },
  {
    target: '[data-tour="admin-appointment-detail"]',
    route: "/appointments/:id",
    title: "Review a Request",
    content:
      "Approve, reject, or propose a reschedule for this booking request. Reasons are sent back to the client and consultant.",
    placement: "left",
  },
  {
    target: '[data-tour="admin-new-appointment-form"]',
    route: "/appointments/new",
    title: "Book on Behalf of a Client",
    content:
      "Pick an existing client and case, or add a new client, then choose a consultant and time slot.",
    placement: "top",
  },
  {
    target: '[data-tour="admin-case-timeline"]',
    route: "/cases/:id",
    title: "Case Timeline",
    content:
      "Sessions, notes, commitments, tasks, and documents for this case in one chronological feed — same view your consultants use.",
    placement: "top",
  },
  {
    target: '[data-tour="admin-consultant-detail"]',
    route: "/consultants/:consultantId",
    title: "Consultant Profile",
    content:
      "Edit profile details, review verification documents, and set weekly availability hours.",
    placement: "left",
  },
  {
    target: '[data-tour="admin-template-editor"]',
    route: "/templates/:templateId",
    title: "Template Editor",
    content:
      "Write your message or form template, add merge fields, and save. Use it across appointments and workflows.",
    placement: "left",
  },
  {
    target: '[data-tour="admin-workflow-canvas"]',
    route: "/workflows/:workflowId",
    title: "Build a Workflow",
    content:
      "Drag steps onto the canvas — triggers, conditions, actions — and connect them to automate your practice.",
    placement: "top",
  },
];
