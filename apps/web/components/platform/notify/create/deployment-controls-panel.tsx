"use client";

import { useState } from "react";
import { Eye, Send } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function DeploymentControlsPanel() {
  const [scheduled, setScheduled] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Deployment Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="schedule-later" className="text-sm font-medium text-foreground">
            Schedule for later
          </Label>
          <Switch id="schedule-later" checked={scheduled} onCheckedChange={setScheduled} />
        </div>

        <Button variant="outline" className="w-full justify-center gap-1.5">
          <Eye className="h-4 w-4" />
          Preview Broadcast
        </Button>
        <Button className="w-full justify-center gap-1.5">
          <Send className="h-4 w-4" />
          Deploy Broadcast
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Action will be logged in Global Audit Log
        </p>
      </CardContent>
    </Card>
  );
}
