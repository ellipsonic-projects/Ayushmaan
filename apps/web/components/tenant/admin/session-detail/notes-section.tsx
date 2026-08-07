"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { NotebookPen } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";
import type { NoteItem } from "@/components/tenant/admin/session-detail/session-detail-data";

export function NotesSection({ notes: initialNotes }: { notes: NoteItem[] }) {
  const [notes, setNotes] = useState(initialNotes);
  const [draft, setDraft] = useState("");

  function handleAddNote() {
    const content = draft.trim();
    if (!content) return;

    setNotes((prev) => [
      { id: `note-${Date.now()}`, author: "You", content, createdAt: new Date() },
      ...prev,
    ]);
    setDraft("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-muted-foreground" />
          Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <Textarea
            placeholder="Add a private note about this case, or use the mic to dictate..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" className="w-fit" onClick={handleAddNote} disabled={!draft.trim()}>
              Add note
            </Button>
            <VoiceTranscribeButton
              label="Dictate note"
              onTranscript={(text) => setDraft((prev) => (prev ? `${prev} ${text}` : text))}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-3">
          {notes.map((note) => (
            <div key={note.id} className="text-sm">
              <p className="text-foreground">{note.content}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {note.author} &middot; {formatDistanceToNow(note.createdAt, { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
