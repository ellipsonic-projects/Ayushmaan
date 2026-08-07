"use client";

import { Send, Loader2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DeploymentControlsPanel({
  onDeploy,
  deploying,
  disabled,
}: {
  onDeploy: () => void;
  deploying: boolean;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Deployment Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Button
          className="w-full justify-center gap-1.5"
          onClick={onDeploy}
          disabled={disabled || deploying}
        >
          {deploying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {deploying ? "Sending..." : "Deploy Broadcast"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Sends immediately to every resolved recipient.
        </p>
      </CardContent>
    </Card>
  );
}
