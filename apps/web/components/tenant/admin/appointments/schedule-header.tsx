"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ScheduleRange = "today" | "week" | "month";

export function ScheduleHeader({ rangeLabel }: { rangeLabel: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = (searchParams.get("range") as ScheduleRange | null) ?? "today";

  function setRange(value: ScheduleRange) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "today") {
      params.delete("range");
    } else {
      params.set("range", value);
    }
    router.push(params.size > 0 ? `?${params.toString()}` : "?", { scroll: false });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Master Schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-organization booking resolution and team load balancing.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Tabs value={range} onValueChange={(value) => setRange(value as ScheduleRange)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-sm text-muted-foreground">{rangeLabel}</span>
        <Button variant="outline" className="gap-1.5">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>
    </div>
  );
}
