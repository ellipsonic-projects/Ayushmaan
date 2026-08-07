"use client";

import { useEffect, useState } from "react";
import { NotebookPen, Loader2, CloudOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { VoiceTranscribeButton } from "@/components/tenant/consultant/session-detail/voice-transcribe-button";
import { createInteraction, listOwnCases, type OwnCaseSummary } from "@/lib/api/case-detail.client";
import type { InteractionType } from "@/lib/api/case-detail.server";
import { useQuickCapture } from "@/lib/quick-capture-context";
import { useOnline } from "@/lib/hooks/useOnline";
import { queueDraft, flushQueuedDrafts, getQueuedDrafts } from "@/lib/offline-drafts";

const typeOptions: { value: InteractionType; label: string }[] = [
  { value: "AD_HOC_NOTE", label: "Note" },
  { value: "CALL_LOG", label: "Call" },
  { value: "MESSAGE_LOG", label: "Message" },
];

function caseLabel(c: OwnCaseSummary) {
  return `${c.client.fullName} — ${c.matterKey ?? c.category}`;
}

// Available from anywhere in the consultant dashboard (not just inside a
// session) so a thought between sessions can be logged against the right
// case without navigating away first (sprint 4.1 item 5).
export function QuickCaptureWidget() {
  const { open, presetCaseId, openWidget, closeWidget } = useQuickCapture();
  const [cases, setCases] = useState<OwnCaseSummary[] | null>(null);
  const loadingCases = open && cases === null;
  const [caseId, setCaseId] = useState<string>("");
  const [type, setType] = useState<InteractionType>("AD_HOC_NOTE");
  const [notes, setNotes] = useState("");
  const [isClientVisible, setIsClientVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [savedOffline, setSavedOffline] = useState(false);
  const [queuedCount, setQueuedCount] = useState(() => getQueuedDrafts().length);
  const online = useOnline();

  // Syncing caseId from the presetCaseId prop during render (React's
  // documented "adjusting state when a prop changes" pattern) rather than in
  // an effect — avoids the extra render an effect-based setState would cause.
  const [prevPresetCaseId, setPrevPresetCaseId] = useState(presetCaseId);
  if (open && presetCaseId !== prevPresetCaseId) {
    setPrevPresetCaseId(presetCaseId);
    if (presetCaseId) setCaseId(presetCaseId);
  }

  useEffect(() => {
    if (!open || cases !== null) return;
    listOwnCases()
      .then(setCases)
      .catch(() => setCases([]));
  }, [open, cases]);

  // Flush any drafts buffered during a network drop as soon as connectivity
  // is restored, rather than waiting for the widget to be reopened.
  useEffect(() => {
    if (!online) return;
    if (getQueuedDrafts().length === 0) return;
    flushQueuedDrafts().then(({ remaining }) => setQueuedCount(remaining));
  }, [online]);

  function handleOpenChange(next: boolean) {
    if (next) {
      openWidget();
    } else {
      closeWidget();
    }
  }

  function reset() {
    setNotes("");
    setIsClientVisible(false);
    setType("AD_HOC_NOTE");
  }

  async function handleSave() {
    const content = notes.trim();
    if (!content || !caseId) return;

    setSubmitting(true);
    try {
      if (!online) throw new Error("offline");
      await createInteraction(caseId, { type, notes: content, isClientVisible });
      reset();
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      // Network drop (or genuinely offline) — buffer the draft instead of
      // losing it; it's flushed automatically once connectivity returns.
      queueDraft({ caseId, type, notes: content, isClientVisible });
      setQueuedCount(getQueuedDrafts().length);
      reset();
      setSavedOffline(true);
      setTimeout(() => setSavedOffline(false), 2500);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40" data-tour="consultant-quick-capture">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg"
              aria-label="Quick capture"
            >
              <NotebookPen className="h-5 w-5" />
            </Button>
          }
        />
        <PopoverContent align="end" side="top" className="w-80">
          <PopoverHeader>
            <PopoverTitle>Quick capture</PopoverTitle>
          </PopoverHeader>

          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <Label htmlFor="quick-capture-case" className="text-xs text-muted-foreground">
                Case
              </Label>
              <Select value={caseId} onValueChange={(v) => v && setCaseId(v)}>
                <SelectTrigger id="quick-capture-case" className="w-full">
                  <SelectValue placeholder={loadingCases ? "Loading cases..." : "Select a case"} />
                </SelectTrigger>
                <SelectContent>
                  {(cases ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {caseLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="quick-capture-type" className="text-xs text-muted-foreground">
                Type
              </Label>
              <Select value={type} onValueChange={(v) => v && setType(v as InteractionType)}>
                <SelectTrigger id="quick-capture-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Textarea
                placeholder="Log a quick thought, or use the mic to dictate..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
              <VoiceTranscribeButton
                label="Dictate note"
                onTranscript={(text) => setNotes((prev) => (prev ? `${prev} ${text}` : text))}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="quick-capture-visible" className="text-xs text-muted-foreground">
                Visible to client
              </Label>
              <Switch
                id="quick-capture-visible"
                checked={isClientVisible}
                onCheckedChange={setIsClientVisible}
              />
            </div>

            {!online && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <CloudOff className="h-3.5 w-3.5" />
                You&apos;re offline — notes will save locally and sync automatically.
              </p>
            )}
            {queuedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {queuedCount} note{queuedCount === 1 ? "" : "s"} waiting to sync.
              </p>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={!notes.trim() || !caseId || submitting}
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {savedOffline ? "Saved offline" : justSaved ? "Saved" : "Save"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
