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

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
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

export function DailyTimeline({
  appointmentsByDate,
}: {
  appointmentsByDate: Record<string, number>;
}) {
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
        <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-0.5">
          {views.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setView(item.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
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
              className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {label}
            </span>
          ))}

          {cells.map(({ date, inCurrentMonth }) => {
            const count = appointmentsByDate[dateKey(date)] ?? 0;
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
                <span className="text-xs font-medium text-foreground">{date.getDate()}</span>
                {count > 0 ? (
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="text-[10px] text-muted-foreground">{count}</span>
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
