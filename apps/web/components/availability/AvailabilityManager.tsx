"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth/context";
import {
  useMyAvailability,
  useMyBlackoutDates,
  createAvailability,
  deleteAvailability,
  addBlackoutDate,
} from "@/lib/hooks/useAvailability";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function AvailabilityManager() {
  const { user, token } = useAuth();
  const { availability, isLoading, mutate } = useMyAvailability();
  const { blackoutDates, mutate: mutateBlackout } = useMyBlackoutDates();

  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [submitting, setSubmitting] = useState(false);

  const [blackoutStart, setBlackoutStart] = useState("");
  const [blackoutEnd, setBlackoutEnd] = useState("");
  const [blackoutReason, setBlackoutReason] = useState("");
  const [submittingBlackout, setSubmittingBlackout] = useState(false);

  const handleAddWindow = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    try {
      await createAvailability(token, {
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
      });
      await mutate();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWindow = async (id: string) => {
    if (!token) return;
    await deleteAvailability(token, id);
    await mutate();
  };

  const handleAddBlackout = async (e: FormEvent) => {
    e.preventDefault();
    if (!token || !user || !blackoutStart || !blackoutEnd) return;
    setSubmittingBlackout(true);
    try {
      await addBlackoutDate(token, user.id, {
        startDate: blackoutStart,
        endDate: blackoutEnd,
        reason: blackoutReason || undefined,
      });
      setBlackoutStart("");
      setBlackoutEnd("");
      setBlackoutReason("");
      await mutateBlackout();
    } finally {
      setSubmittingBlackout(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Working Hours
        </h2>

        <form onSubmit={handleAddWindow} className="mb-6 grid gap-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="dayOfWeek">Day</Label>
            <select
              id="dayOfWeek"
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(e.target.value)}
              className="mt-1 h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {DAYS.map((day, index) => (
                <option key={day} value={index}>
                  {day}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="startTime">Start time</Label>
            <Input
              id="startTime"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="endTime">End time</Label>
            <Input
              id="endTime"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Adding..." : "Add window"}
            </Button>
          </div>
        </form>

        {isLoading ? (
          <p className="text-slate-600 dark:text-slate-400">Loading availability...</p>
        ) : availability.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No working hours set yet.
          </p>
        ) : (
          <div className="space-y-2">
            {availability.map((window) => (
              <div
                key={window.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2 dark:border-slate-800"
              >
                <span className="text-slate-900 dark:text-white">
                  {DAYS[window.dayOfWeek]}: {window.startTime} – {window.endTime}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteWindow(window.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">
          Blackout Dates
        </h2>

        <form onSubmit={handleAddBlackout} className="mb-6 grid gap-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="blackoutStart">Start date</Label>
            <Input
              id="blackoutStart"
              type="date"
              value={blackoutStart}
              onChange={(e) => setBlackoutStart(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="blackoutEnd">End date</Label>
            <Input
              id="blackoutEnd"
              type="date"
              value={blackoutEnd}
              onChange={(e) => setBlackoutEnd(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="blackoutReason">Reason (optional)</Label>
            <Input
              id="blackoutReason"
              value={blackoutReason}
              onChange={(e) => setBlackoutReason(e.target.value)}
              placeholder="Vacation"
              className="mt-1"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={submittingBlackout} className="w-full">
              {submittingBlackout ? "Adding..." : "Add blackout"}
            </Button>
          </div>
        </form>

        {blackoutDates.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">
            No blackout dates scheduled.
          </p>
        ) : (
          <div className="space-y-2">
            {blackoutDates.map((blackout) => (
              <div
                key={blackout.id}
                className="rounded-lg border border-slate-200 px-4 py-2 dark:border-slate-800"
              >
                <span className="text-slate-900 dark:text-white">
                  {blackout.startDate} – {blackout.endDate}
                </span>
                {blackout.reason && (
                  <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
                    ({blackout.reason})
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
