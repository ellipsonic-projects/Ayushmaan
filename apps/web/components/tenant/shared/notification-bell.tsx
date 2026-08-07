"use client";

import { Bell } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotificationRow } from "@/lib/api/notifications.client";

const TYPE_LABELS: Record<string, string> = {
  APPOINTMENT_REMINDER: "Appointment reminder",
  TASK_DUE: "Task due",
  TASK_REMINDER: "Task reminder",
  GRIEVANCE_SUBMITTED: "Grievance submitted",
  GRIEVANCE_STATUS_CHANGED: "Grievance status changed",
  SESSION_JOINING_SOON: "Session starting soon",
  SESSION_REMINDER: "Session reminder",
  COMMITMENT_REMINDER: "Commitment reminder",
  CONSULTANT_ONBOARDED: "Consultant onboarded",
  OUT_OF_OFFICE_NOTICE: "Out of office notice",
  CASE_REFERRAL_RECEIVED: "Case referral received",
  CASE_REFERRAL_ACCEPTED: "Case referral accepted",
  CASE_REFERRAL_DECLINED: "Case referral declined",
};

function formatRelativeTime(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell({
  notifications,
  unreadCount,
  isLoading,
  onMarkAsRead,
}: {
  notifications: NotificationRow[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAsRead: (notificationId: string) => void;
}) {
  const displayed = notifications.slice(0, 20);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label="Notifications"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-primary"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold text-foreground">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Loading...</p>
          ) : displayed.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            displayed.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => !n.readAt && onMarkAsRead(n.id)}
                className={`flex w-full flex-col gap-0.5 border-b border-border/50 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-muted ${
                  n.readAt ? "" : "bg-primary/5"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                  {TYPE_LABELS[n.type] ?? n.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeTime(n.createdAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
