"use client";

import { useState } from "react";
import {
  CalendarCheck2,
  CircleDollarSign,
  Clock,
  FilePlus2,
  Mail,
  MessageSquareText,
  Plus,
  UserRoundCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type ReminderChannel = "email" | "sms";

type Reminder = {
  id: string;
  channel: ReminderChannel;
  timing: string;
};

type ReminderGroup = {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  defaultTiming: string;
  reminders: Reminder[];
};

const channelMeta: Record<ReminderChannel, { label: string; icon: LucideIcon }> = {
  email: { label: "Send email", icon: Mail },
  sms: { label: "Send SMS", icon: MessageSquareText },
};

const initialGroups: ReminderGroup[] = [
  {
    id: "appointment",
    title: "Appointment reminders",
    icon: CalendarCheck2,
    description: "Send clients appointment reminders to avoid no-shows and cancellations",
    defaultTiming: "24 hours before appointment",
    reminders: [
      { id: "appt-email", channel: "email", timing: "48 hours before appointment" },
      { id: "appt-sms", channel: "sms", timing: "24 hours before appointment" },
    ],
  },
  {
    id: "intake",
    title: "Intake reminders",
    icon: FilePlus2,
    description: "Send reminders to check your client's intake progress to keep things moving",
    defaultTiming: "3 days after intake sent",
    reminders: [],
  },
  {
    id: "invoice",
    title: "Invoice reminders",
    icon: CircleDollarSign,
    description: "Send reminders for invoice due dates",
    defaultTiming: "1 days before due date",
    reminders: [{ id: "invoice-email", channel: "email", timing: "1 days before due date" }],
  },
  {
    id: "portal-invite",
    title: "Portal invite reminder",
    icon: UserRoundCheck,
    description: "Send reminders for clients to activate their portal",
    defaultTiming: "2 days after invite sent",
    reminders: [],
  },
];

export function RemindersPanel() {
  const [groups, setGroups] = useState(initialGroups);

  function addReminder(groupId: string) {
    setGroups((prev) =>
      prev.map((group) =>
        group.id !== groupId
          ? group
          : {
              ...group,
              reminders: [
                ...group.reminders,
                {
                  id: `${groupId}-${Date.now()}`,
                  channel: "email",
                  timing: group.defaultTiming,
                },
              ],
            }
      )
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
      {groups.map((group) => (
        <Card key={group.id}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <group.icon className="h-4 w-4 text-foreground" />
                </span>
                <h3 className="truncate text-base font-semibold text-foreground">
                  {group.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => addReminder(group.id)}
                className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
              >
                <Plus className="h-4 w-4" />
                New reminder
              </button>
            </div>

            <p className="text-xs text-muted-foreground">{group.description}</p>

            <div className="flex flex-col gap-2">
              {group.reminders.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border border-border px-3 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                    <group.icon className="h-4 w-4 text-muted-foreground/60" />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    No reminders configured
                  </span>
                </div>
              ) : (
                group.reminders.map((reminder) => {
                  const channel = channelMeta[reminder.channel];
                  return (
                    <div
                      key={reminder.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                        <channel.icon className="h-4 w-4 text-foreground" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {channel.label}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {reminder.timing}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
