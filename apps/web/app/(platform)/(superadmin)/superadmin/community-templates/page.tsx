"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommunityTemplateModeration } from "@/lib/hooks";
import type { TemplateModerationStatus } from "@/lib/api/workflow-templates.server";

const CHANNEL_ICON = { EMAIL: Mail };

function ModerationQueue({ status }: { status: TemplateModerationStatus }) {
  const { templates, isLoading, approve, reject } = useCommunityTemplateModeration(status);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handle(action: "approve" | "reject", id: string) {
    setBusyId(id);
    try {
      await (action === "approve" ? approve(id) : reject(id));
    } finally {
      setBusyId(null);
    }
  }

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Loading...</p>;
  }
  if (templates.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">Nothing here.</p>;
  }

  return (
    <Card>
      <CardContent className="flex flex-col divide-y divide-border p-0">
        {templates.map((template) => {
          const Icon = CHANNEL_ICON[template.channel];
          return (
            <div
              key={template.id}
              className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {template.channel} &middot;{" "}
                    {template.consultant?.fullName ?? "Unknown consultant"} &middot;{" "}
                    {template.tenant?.displayName ?? "Unknown tenant"}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {status === "PENDING" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === template.id}
                      onClick={() => handle("reject", template.id)}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={busyId === template.id}
                      onClick={() => handle("approve", template.id)}
                    >
                      Approve
                    </Button>
                  </>
                ) : (
                  <Badge
                    variant="outline"
                    className={
                      status === "APPROVED"
                        ? "border-emerald-600 text-emerald-600"
                        : "border-destructive text-destructive"
                    }
                  >
                    {status}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default function CommunityTemplatesModerationPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Community Templates</h2>
        <p className="text-sm text-muted-foreground">
          Review templates consultants have submitted for platform-wide (Community) visibility.
        </p>
      </div>

      <Tabs defaultValue="PENDING" className="flex flex-col gap-4">
        <TabsList variant="line" className="border-b border-border pb-1">
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
        <TabsContent value="PENDING">
          <ModerationQueue status="PENDING" />
        </TabsContent>
        <TabsContent value="APPROVED">
          <ModerationQueue status="APPROVED" />
        </TabsContent>
        <TabsContent value="REJECTED">
          <ModerationQueue status="REJECTED" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
