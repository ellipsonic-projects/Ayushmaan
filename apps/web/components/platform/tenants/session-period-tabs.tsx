"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SessionPeriodTabs() {
  return (
    <Tabs defaultValue="monthly">
      <TabsList>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
        <TabsTrigger value="annual">Annual</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
