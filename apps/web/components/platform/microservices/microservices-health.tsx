import { ServerOff } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export function MicroservicesHealth() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Microservices Health</CardTitle>
        <CardDescription>Real-time status of critical infrastructure components</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          <ServerOff className="h-5 w-5" />
          No infrastructure monitoring is connected yet.
        </div>
      </CardContent>
    </Card>
  );
}
