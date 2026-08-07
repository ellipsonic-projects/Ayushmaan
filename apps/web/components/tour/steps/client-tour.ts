import type { TourStep } from "../types";

export const clientTourSteps: TourStep[] = [
  {
    target: '[data-tour="client-sidebar"]',
    route: "/dashboard",
    title: "Welcome to Ayushman",
    content:
      "This is your personal dashboard. See upcoming appointments, completed sessions, and shared documents at a glance.",
    placement: "right",
  },
  {
    target: '[data-tour="client-stats"]',
    route: "/dashboard",
    title: "Your Activity",
    content:
      "Three cards show your upcoming appointments, completed sessions, and documents shared with you. Tap any for details.",
    placement: "bottom",
  },
  {
    target: '[data-tour="client-appointments-tab"]',
    route: "/dashboard",
    title: "Appointment History",
    content:
      "Switch between Upcoming and Past. Each card shows your consultant, date/time, and session status.",
    placement: "top",
  },
  {
    target: '[data-tour="client-book-cta"]',
    route: "/dashboard",
    title: "Book an Appointment",
    content:
      "Pick a consultant, choose a time slot, and confirm. This is how you start or continue a case.",
    placement: "bottom",
  },
  {
    target: '[data-tour="client-nav-relationships"]',
    route: "/relationships",
    title: "Your Consultants",
    content:
      "See every consultant you've worked with. View case timelines, send messages, and book follow-ups.",
    placement: "right",
  },
  {
    target: '[data-tour="client-nav-tasks"]',
    route: "/tasks",
    title: "Your Tasks",
    content:
      "Tasks assigned by your consultant, organized by case. Complete them to keep your case moving forward.",
    placement: "right",
  },
  {
    target: '[data-tour="client-nav-docs"]',
    route: "/documentation",
    title: "Documentation",
    content: "Documents, form submissions, and shared materials — all organized by case.",
    placement: "right",
  },
  {
    target: '[data-tour="client-nav-notifications"]',
    route: "/notifications",
    title: "Notifications",
    content:
      "Choose how you get reminders — email. Appointment reminders, task alerts, and session join links.",
    placement: "right",
  },
  {
    target: '[data-tour="client-nav-appointments"]',
    route: "/appointments",
    title: "Appointments",
    content:
      "Every session across your cases, sorted into needing your response, upcoming, and past.",
    placement: "right",
  },
  {
    target: '[data-tour="client-appointments-list"]',
    route: "/appointments",
    title: "Respond & Manage",
    content:
      "Accept or decline reschedule proposals here, and cancel upcoming sessions if plans change.",
    placement: "top",
  },
  {
    target: '[data-tour="client-nav-book"]',
    route: "/appointments/book",
    title: "Book a New Appointment",
    content: "Jump straight into booking — pick a field, consultant, and time slot in a few steps.",
    placement: "right",
  },
  {
    target: '[data-tour="client-book-flow-steps"]',
    route: "/appointments/book",
    title: "Follow the Steps",
    content:
      "Field, Consultant, Requirements, Slot, Confirm — track your progress here as you move through the flow.",
    placement: "bottom",
  },
  {
    target: '[data-tour="client-nav-documents"]',
    route: "/documents",
    title: "My Documents",
    content: "Upload, download, and manage documents for each of your cases.",
    placement: "right",
  },
  {
    target: '[data-tour="client-nav-inbox"]',
    route: "/inbox",
    title: "Inbox",
    content:
      "Connect your email to message consultants directly, or use chat — everything in one place.",
    placement: "right",
  },
  {
    target: '[data-tour="client-nav-settings"]',
    route: "/settings",
    title: "Profile & Settings",
    content: "Update your profile details, or apply to become a consultant on the platform.",
    placement: "right",
  },
  {
    target: '[data-tour="client-become-consultant"]',
    route: "/settings",
    title: "Become a Consultant",
    content: "Apply directly, or use an invite code from a practice to join as a consultant.",
    placement: "top",
  },
];
