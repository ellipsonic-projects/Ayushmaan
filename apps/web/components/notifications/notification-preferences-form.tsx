"use client";

import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { NotificationPreferenceRow } from "@/lib/api/notification-preferences.server";
import { updateNotificationPreferences } from "@/lib/api/notification-preferences.client";

const TYPE_LABELS: Record<string, string> = {
  APPOINTMENT_REMINDER: "Appointment reminder",
  TASK_DUE: "Task due",
  TASK_REMINDER: "Task reminder",
  GRIEVANCE_SUBMITTED: "Grievance submitted",
  GRIEVANCE_STATUS_CHANGED: "Grievance status changed",
  SESSION_JOINING_SOON: "Session joining soon",
  SESSION_REMINDER: "Session reminder",
  COMMITMENT_REMINDER: "Commitment reminder",
  CONSULTANT_ONBOARDED: "Consultant onboarded",
  OUT_OF_OFFICE_NOTICE: "Out of office notice",
};

const CHANNELS: { key: string; label: string }[] = [
  { key: "IN_APP", label: "In-app" },
  { key: "EMAIL", label: "Email" },
];

const LEAD_TIME_TYPES = new Set([
  "APPOINTMENT_REMINDER",
  "TASK_REMINDER",
  "SESSION_REMINDER",
  "COMMITMENT_REMINDER",
]);

type Grid = Record<string, Record<string, { enabled: boolean; leadTimeMins: number | null }>>;

function toGrid(rows: NotificationPreferenceRow[]): Grid {
  const grid: Grid = {};
  for (const row of rows) {
    grid[row.type] ??= {};
    grid[row.type][row.channel] = { enabled: row.enabled, leadTimeMins: row.leadTimeMins };
  }
  return grid;
}

export function NotificationPreferencesForm({
  tenantId,
  tenantSlug,
  preferences,
}: {
  tenantId: string;
  tenantSlug: string;
  preferences: NotificationPreferenceRow[];
}) {
  const [grid, setGrid] = useState<Grid>(() => toGrid(preferences));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const types = Object.keys(TYPE_LABELS).filter((type) => grid[type]);

  function setCell(
    type: string,
    channel: string,
    patch: Partial<{ enabled: boolean; leadTimeMins: number | null }>
  ) {
    setGrid((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: { ...prev[type][channel], ...patch },
      },
    }));
    setDirty(true);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const rows: NotificationPreferenceRow[] = types.flatMap((type) =>
        CHANNELS.map(({ key: channel }) => ({
          type,
          channel,
          enabled: grid[type][channel].enabled,
          leadTimeMins: grid[type][channel].leadTimeMins,
        }))
      );
      await updateNotificationPreferences(tenantId, tenantSlug, rows);
      setDirty(false);
    } catch {
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>Choose how you want to be notified for each event</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-4">Notification</th>
                {CHANNELS.map((channel) => (
                  <th key={channel.key} className="px-2 py-2 text-center">
                    {channel.label}
                  </th>
                ))}
                <th className="py-2 pl-2 text-center">Lead time (min)</th>
              </tr>
            </thead>
            <tbody>
              {types.map((type) => (
                <tr key={type} className="border-b border-border/60">
                  <td className="py-3 pr-4 font-medium text-foreground">{TYPE_LABELS[type]}</td>
                  {CHANNELS.map(({ key: channel }) => (
                    <td key={channel} className="px-2 py-3 text-center">
                      <Switch
                        checked={grid[type][channel].enabled}
                        onCheckedChange={(checked) =>
                          setCell(type, channel, { enabled: Boolean(checked) })
                        }
                      />
                    </td>
                  ))}
                  <td className="py-3 pl-2">
                    {LEAD_TIME_TYPES.has(type) ? (
                      <Input
                        type="number"
                        min={1}
                        className="mx-auto h-8 w-20 text-center"
                        value={grid[type].IN_APP?.leadTimeMins ?? ""}
                        onChange={(e) => {
                          const value = e.target.value ? Number(e.target.value) : null;
                          for (const { key: channel } of CHANNELS) {
                            setCell(type, channel, { leadTimeMins: value });
                          }
                        }}
                      />
                    ) : (
                      <span className="block text-center text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-border bg-card px-6 py-3 shadow-[0_-1px_0_rgba(0,0,0,0.04)] sm:left-64">
        <span className="text-xs text-muted-foreground">
          {dirty ? "You have unsaved changes." : "All changes are saved."}
        </span>
        <Button type="button" size="sm" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
