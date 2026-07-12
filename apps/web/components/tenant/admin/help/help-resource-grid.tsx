import { ResourceCard } from "@/components/tenant/admin/help/resource-card";
import {
  AiScribeIllustration,
  StoryIllustration,
  CalendarSyncIllustration,
  BrandingIllustration,
  BookingTimeIllustration,
  ClaimsIllustration,
  VideoCallIllustration,
  RemindersIllustration,
} from "@/components/tenant/admin/help/resource-illustrations";

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
    description: "Transcribe audio and transform it into any session template with one click.",
    ctaLabel: "Try it",
  },
  {
    tag: "Story",
    illustration: <StoryIllustration />,
    title:
      "Right-sized for a solo practice: how one consultant runs their practice without the busywork.",
    description: "Read how a real consultant streamlined their workflow.",
    ctaLabel: "Read story",
  },
  {
    tag: "Feature",
    illustration: <AiScribeIllustration />,
    title: "Import your templates",
    description: "Bring in the note formats and forms you already use.",
    ctaLabel: "Import",
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
    illustration: <BrandingIllustration />,
    title: "Add your branding",
    description: "Add your logo and color so your booking page feels like you.",
    ctaLabel: "Add branding",
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
    illustration: <ClaimsIllustration />,
    title: "Get set up for client invoicing",
    description: "Create invoices and track payments from the same place you run your practice.",
    ctaLabel: "Set up",
  },
  {
    tag: "Feature",
    illustration: <VideoCallIllustration />,
    title: "Start video calls",
    description: "Run secure virtual sessions inside Ayushman.",
    ctaLabel: "Try it",
  },
  {
    tag: "Feature",
    illustration: <RemindersIllustration />,
    title: "Automate reminders",
    description: "Cut no-shows with automatic SMS and email reminders.",
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
