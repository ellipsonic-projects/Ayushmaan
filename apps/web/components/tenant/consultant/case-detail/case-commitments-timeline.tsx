"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CheckCircle2, Circle, ShieldAlert, XCircle } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";
import { cn } from "@/lib/utils";
import { createCommitment } from "@/lib/api/case-detail.client";
import type { CaseCommitment, CommitmentDbStatus } from "@/lib/api/case-detail.server";

function displayStatus(item: CaseCommitment): { label: string; className: string } {
  if (item.status === "COMPLETED") {
    return {
      label: "Completed",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
    };
  }
  if (item.status === "DISCONTINUED") {
    return { label: "Discontinued", className: "border-border text-muted-foreground" };
  }
  if (item.dueAt && new Date(item.dueAt).getTime() < Date.now()) {
    return {
      label: "Overdue",
      className: "border-destructive/30 bg-destructive/10 text-destructive",
    };
  }
  return { label: "Active", className: "text-muted-foreground" };
}

const statusIcon: Record<CommitmentDbStatus, typeof Circle> = {
  ACTIVE: Circle,
  COMPLETED: CheckCircle2,
  DISCONTINUED: XCircle,
};

export function CaseCommitmentsTimeline({
  caseId,
  commitments: initialCommitments,
}: {
  caseId: string;
  commitments: CaseCommitment[];
}) {
  const [commitments, setCommitments] = useState(initialCommitments);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAddCommitment() {
    const content = draft.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const created = await createCommitment(caseId, {
        title: content.length > 60 ? `${content.slice(0, 60)}...` : content,
        description: content,
      });
      setCommitments((prev) => [created, ...prev]);
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          Commitments Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Add a commitment, or use the mic to dictate..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="w-fit"
              onClick={handleAddCommitment}
              disabled={!draft.trim() || submitting}
            >
              Add commitment
            </Button>
            <VoiceTranscribeButton
              label="Dictate commitment"
              onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
            />
          </div>
        </div>

        {commitments.length === 0 ? (
          <p className="border-t border-border pt-5 text-sm text-muted-foreground">
            No commitments yet.
          </p>
        ) : (
          <div className="space-y-4 border-t border-border pt-5">
            {commitments.map((item) => {
              const Icon = statusIcon[item.status];
              const status = displayStatus(item);
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <Icon className={cn("h-4 w-4 shrink-0 translate-y-0.5", status.className)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    )}
                    {item.dueAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {format(new Date(item.dueAt), "EEE, dd MMM · h:mm a")}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={cn("shrink-0", status.className)}>
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
