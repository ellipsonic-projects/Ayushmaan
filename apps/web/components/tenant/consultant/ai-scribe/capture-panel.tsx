"use client";

import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";

export function CapturePanel<T extends { id: string }>({
  placeholder,
  submitLabel,
  micLabel,
  items,
  onAdd,
  renderItem,
  emptyLabel,
}: {
  placeholder: string;
  submitLabel: string;
  micLabel: string;
  items: T[];
  onAdd: (content: string) => void;
  renderItem: (item: T) => ReactNode;
  emptyLabel: string;
}) {
  const [draft, setDraft] = useState("");

  function handleSubmit() {
    const content = draft.trim();
    if (!content) return;
    onAdd(content);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Textarea
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <Button size="sm" className="w-fit" onClick={handleSubmit} disabled={!draft.trim()}>
            {submitLabel}
          </Button>
          <VoiceTranscribeButton
            label={micLabel}
            onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.map((item) => <div key={item.id}>{renderItem(item)}</div>)
        )}
      </div>
    </div>
  );
}
