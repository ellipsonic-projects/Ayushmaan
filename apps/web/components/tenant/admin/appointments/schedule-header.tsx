"use client";

import { CalendarDays, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ScheduleHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Master Schedule</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-organization booking resolution and team load balancing.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Tabs defaultValue="today">
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" className="gap-1.5">
          <CalendarDays className="h-4 w-4" />
          Oct 24, 2023 - Oct 30, 2023
        </Button>
        <Button variant="outline" className="gap-1.5">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>
    </div>
  );
}
