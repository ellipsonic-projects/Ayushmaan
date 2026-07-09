"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Phone, Users, MessageSquare, StickyNote, History } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";
import type {
  InteractionItem,
  InteractionType,
} from "@/components/tenant/consultant/session-detail/session-detail-data";

const typeIcon: Record<InteractionType, typeof Phone> = {
  Call: Phone,
  Meeting: Users,
  Message: MessageSquare,
  Note: StickyNote,
};

export function InteractionsTimeline({
  interactions: initialInteractions,
}: {
  interactions: InteractionItem[];
}) {
  const [interactions, setInteractions] = useState(initialInteractions);
  const [draft, setDraft] = useState("");

  function handleLogInteraction() {
    const content = draft.trim();
    if (!content) return;

    setInteractions((prev) => [
      {
        id: `int-${Date.now()}`,
        type: "Note",
        summary: content.length > 60 ? `${content.slice(0, 60)}...` : content,
        notes: content,
        createdAt: new Date(),
        isClientVisible: false,
      },
      ...prev,
    ]);
    setDraft("");
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
            <Button size="sm" className="w-fit" onClick={handleLogInteraction} disabled={!draft.trim()}>
              Log interaction
            </Button>
            <VoiceTranscribeButton
              label="Dictate interaction"
              onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
            />
          </div>
        </div>

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
                    <p className="text-sm font-medium text-foreground">{item.summary}</p>
                    <Badge variant="outline" className="text-muted-foreground">
                      {item.type}
                    </Badge>
                    {!item.isClientVisible && (
                      <Badge variant="secondary" className="text-muted-foreground">
                        Internal
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
