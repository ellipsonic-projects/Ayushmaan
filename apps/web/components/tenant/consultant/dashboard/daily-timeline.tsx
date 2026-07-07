"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ViewKey = "week" | "15days" | "month";

const views: { key: ViewKey; label: string }[] = [
  { key: "week", label: "1 Week" },
  { key: "15days", label: "15 Days" },
  { key: "month", label: "1 Month" },
];

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

type AppointmentMark = { count: number; colorClass: string };

const mockAppointments: { offset: number; count: number; colorClass: string }[] = [
  { offset: 0, count: 3, colorClass: "bg-primary" },
  { offset: 2, count: 1, colorClass: "bg-amber-500" },
  { offset: 4, count: 2, colorClass: "bg-blue-500" },
  { offset: 7, count: 1, colorClass: "bg-emerald-500" },
  { offset: 9, count: 4, colorClass: "bg-primary" },
  { offset: 13, count: 2, colorClass: "bg-amber-500" },
  { offset: 18, count: 1, colorClass: "bg-blue-500" },
  { offset: 25, count: 3, colorClass: "bg-emerald-500" },
];

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, amount: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

function dayOffset(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

function getAppointmentMark(today: Date, date: Date): AppointmentMark | null {
  const offset = dayOffset(today, date);
  const match = mockAppointments.find((item) => item.offset === offset);
  return match ? { count: match.count, colorClass: match.colorClass } : null;
}

function buildRangeDays(today: Date, length: number) {
  return Array.from({ length }, (_, i) => addDays(today, i));
}

function buildMonthDays(today: Date) {
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const leadingBlanks = firstOfMonth.getDay();
  const gridStart = addDays(firstOfMonth, -leadingBlanks);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, i) => {
    const date = addDays(gridStart, i);
    return { date, inCurrentMonth: date.getMonth() === today.getMonth() };
  });
}

export function DailyTimeline() {
  const [view, setView] = useState<ViewKey>("week");
  const today = startOfDay(new Date());

  const cells =
    view === "month"
      ? buildMonthDays(today)
      : buildRangeDays(today, view === "week" ? 7 : 15).map((date) => ({
          date,
          inCurrentMonth: true,
        }));

  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Timeline
        </CardTitle>
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/40 p-0.5">
          {views.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                view === item.key
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {weekdayLabels.map((label) => (
            <span
              key={label}
              className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {label}
            </span>
          ))}

          {cells.map(({ date, inCurrentMonth }) => {
            const mark = getAppointmentMark(today, date);
            const isToday = dayOffset(today, date) === 0;

            return (
              <div
                key={date.toISOString()}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md border border-transparent p-1.5",
                  isToday && "border-primary bg-primary/5",
                  !inCurrentMonth && "opacity-40"
                )}
              >
                <span className="text-xs font-medium text-foreground">
                  {date.getDate()}
                </span>
                {mark ? (
                  <span className="flex items-center gap-1">
                    <span
                      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", mark.colorClass)}
                    />
                    <span className="text-[10px] text-muted-foreground">{mark.count}</span>
                  </span>
                ) : (
                  <span className="h-1.5 w-1.5" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
