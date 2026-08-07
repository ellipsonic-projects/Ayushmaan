import { ResourceCard } from "@/components/tenant/consultant/help/resource-card";
import {
  AiScribeIllustration,
  StoryIllustration,
  CalendarSyncIllustration,
  CaseNotesIllustration,
  BookingTimeIllustration,
  ClientsIllustration,
  VideoCallIllustration,
  RemindersIllustration,
} from "@/components/tenant/consultant/help/resource-illustrations";

const resources: {
  tag: "Feature" | "Story";
  illustration: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
}[] = [
  {
    tag: "Feature",
    illustration: <AiScribeIllustration />,
    title: "Save time with AI Scribe",
    description: "Transcribe your sessions and turn them into notes with one click.",
    ctaLabel: "Try it",
  },
  {
    tag: "Story",
    illustration: <StoryIllustration />,
    title:
      "Right-sized for a solo practice: how one clinician runs their practice without the busywork.",
    description: "Read how a real consultant streamlined their workflow.",
    ctaLabel: "Read story",
  },
  {
    tag: "Feature",
    illustration: <CaseNotesIllustration />,
    title: "Track your cases",
    description: "Keep case notes, progress, and history organized in one place.",
    ctaLabel: "View cases",
  },
  {
    tag: "Feature",
    illustration: <CalendarSyncIllustration />,
    title: "Sync your calendar",
    description: "Connect Google or Outlook so nothing double-books you.",
    ctaLabel: "Connect",
  },
  {
    tag: "Feature",
    illustration: <ClientsIllustration />,
    title: "Manage your clients",
    description: "See client details, session history, and notes at a glance.",
    ctaLabel: "View clients",
  },
  {
    tag: "Feature",
    illustration: <BookingTimeIllustration />,
    title: "Share your booking link",
    description: "Your booking page is live. Put it where clients can find it.",
    ctaLabel: "Share",
  },
  {
    tag: "Feature",
    illustration: <VideoCallIllustration />,
    title: "Start video calls",
    description: "Run secure telehealth sessions inside Ayushman.",
    ctaLabel: "Try it",
  },
  {
    tag: "Feature",
    illustration: <RemindersIllustration />,
    title: "Automate reminders",
    description: "Cut no-shows with automatic email reminders.",
    ctaLabel: "Set up",
  },
];

export function HelpResourceGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {resources.map((resource) => (
        <ResourceCard key={resource.title} {...resource} />
      ))}
    </div>
  );
}
