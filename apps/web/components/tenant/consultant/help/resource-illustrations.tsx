import { Mic, RefreshCw, Video, PhoneOff, Bell, Mail, MessageSquare, FileText, Users } from "lucide-react";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function AiScribeIllustration() {
  const heights = [6, 12, 20, 10, 24, 14, 8, 18, 22, 12, 6, 16];
  return (
    <div className="flex h-32 items-center justify-center gap-3 bg-primary/10">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Mic className="h-4 w-4" />
      </span>
      <div className="flex items-end gap-0.5">
        {heights.map((h, i) => (
          <span
            key={i}
            className="w-1 rounded-full bg-primary/70"
            style={{ height: h }}
          />
        ))}
      </div>
    </div>
  );
}

export function StoryIllustration() {
  return (
    <div className="flex h-32 items-center justify-center bg-gradient-to-br from-secondary/30 to-primary/40">
      <svg viewBox="0 0 64 64" className="h-16 w-16 text-primary-foreground/90">
        <circle cx="32" cy="24" r="12" fill="currentColor" opacity="0.9" />
        <path
          d="M8 58c0-13.3 10.7-22 24-22s24 8.7 24 22"
          fill="currentColor"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}

export function CalendarSyncIllustration() {
  return (
    <div className="flex h-32 flex-col justify-center gap-2 bg-muted px-4">
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5">
        <span className="text-xs text-foreground">Sync sessions to my calendar</span>
        <Switch checked />
      </div>
      <div className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-1.5">
        <span className="text-xs text-foreground">Sync my calendar to Ayushman</span>
        <Switch />
      </div>
    </div>
  );
}

export function CaseNotesIllustration() {
  return (
    <div className="flex h-32 items-center gap-3 bg-muted px-4">
      <div className="flex h-full flex-1 flex-col justify-center gap-1.5 rounded-md bg-primary/90 px-3 py-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground">
          <FileText className="h-3.5 w-3.5" /> Case #0231
        </span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-1.5 w-full rounded-full bg-primary-foreground/30" />
        ))}
      </div>
    </div>
  );
}

export function BookingTimeIllustration() {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-2 bg-primary/10">
      <span className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
        08:30 am
      </span>
      <span className="rounded-md bg-card px-4 py-1.5 text-sm text-muted-foreground">
        09:00 am
      </span>
    </div>
  );
}

export function ClientsIllustration() {
  return (
    <div className="flex h-32 flex-col justify-center gap-2 bg-muted px-4">
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-semibold text-foreground">Client roster</span>
      </div>
      <div className="flex gap-1.5">
        <Button size="xs" variant="outline">View</Button>
        <Button size="xs">Add client</Button>
      </div>
    </div>
  );
}

export function VideoCallIllustration() {
  return (
    <div className="flex h-32 flex-col items-center justify-center gap-2 bg-slate-900">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-slate-300">
          <circle cx="12" cy="8" r="4" fill="currentColor" />
          <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="currentColor" />
        </svg>
      </span>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-slate-200">
          <Video className="h-3.5 w-3.5" />
        </span>
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white">
          <PhoneOff className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

export function RemindersIllustration() {
  return (
    <div className="flex h-32 items-center justify-center gap-3 bg-primary/10">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Bell className="h-4 w-4" />
      </span>
      <RefreshCw className="h-4 w-4 text-muted-foreground" />
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card ring-1 ring-border">
        <Mail className="h-4 w-4 text-muted-foreground" />
      </span>
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card ring-1 ring-border">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
      </span>
    </div>
  );
}
