"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/context";
import { createAppointment } from "@/lib/hooks/useAppointments";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface BookingFormProps {
  consultantId: string;
  consultantName: string;
  onSuccess: (appointmentId: string) => void;
}

const DURATIONS = [
  { label: "30 minutes", minutes: 30 },
  { label: "60 minutes", minutes: 60 },
  { label: "90 minutes", minutes: 90 },
];

export function BookingForm({ consultantId, consultantName, onSuccess }: BookingFormProps) {
  const { token } = useAuth();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(String(DURATIONS[1].minutes));
  const [title, setTitle] = useState(`Consultation with ${consultantName}`);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !date || !time) return;

    setSubmitting(true);
    setError(null);

    try {
      const startTime = new Date(`${date}T${time}`);
      const endTime = new Date(startTime.getTime() + Number(duration) * 60 * 1000);

      const result = await createAppointment(token, {
        consultantId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        title,
      });

      onSuccess(result.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="mb-4 text-lg font-bold text-foreground">
        Book with {consultantName}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="title">Session title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="duration">Duration</Label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          >
            {DURATIONS.map((d) => (
              <option key={d.minutes} value={d.minutes}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Booking..." : "Confirm Booking"}
        </Button>
      </form>
    </Card>
  );
}
