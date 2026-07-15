"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Phone, Users, MessageSquare, StickyNote, History } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";
import { createInteraction } from "@/lib/api/case-detail.client";
import type { CaseInteraction, InteractionType } from "@/lib/api/case-detail.server";

const typeIcon: Record<InteractionType, typeof Phone> = {
  CALL_LOG: Phone,
  SESSION_NOTE: Users,
  MESSAGE_LOG: MessageSquare,
  AD_HOC_NOTE: StickyNote,
};

const typeLabel: Record<InteractionType, string> = {
  CALL_LOG: "Call",
  SESSION_NOTE: "Session Note",
  MESSAGE_LOG: "Message",
  AD_HOC_NOTE: "Note",
};

export function CaseInteractionsTimeline({
  caseId,
  interactions: initialInteractions,
}: {
  caseId: string;
  interactions: CaseInteraction[];
}) {
  const [interactions, setInteractions] = useState(initialInteractions);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogInteraction() {
    const content = draft.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const created = await createInteraction(caseId, {
        type: "AD_HOC_NOTE",
        notes: content,
        isClientVisible: false,
      });
      setInteractions((prev) => [created, ...prev]);
      setDraft("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          Interactions Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Log an interaction, or use the mic to dictate..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="w-fit"
              onClick={handleLogInteraction}
              disabled={!draft.trim() || submitting}
            >
              Log interaction
            </Button>
            <VoiceTranscribeButton
              label="Dictate interaction"
              onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
            />
          </div>
        </div>

        {interactions.length === 0 ? (
          <p className="border-t border-border pt-5 text-sm text-muted-foreground">
            No interactions logged yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-5 border-t border-border pt-5">
            {interactions.map((item, index) => {
              const Icon = typeIcon[item.type];
              return (
                <li key={item.id} className="relative flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {index < interactions.length - 1 && (
                      <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-muted-foreground">
                        {typeLabel[item.type]}
                      </Badge>
                      {!item.isClientVisible && (
                        <Badge variant="secondary" className="text-muted-foreground">
                          Internal
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
