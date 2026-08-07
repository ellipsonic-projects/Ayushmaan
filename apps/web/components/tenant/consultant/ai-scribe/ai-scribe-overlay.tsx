"use client";

import { useEffect, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Mic, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CapturePanel } from "@/components/tenant/consultant/ai-scribe/capture-panel";
import { CasePicker } from "@/components/tenant/consultant/ai-scribe/case-picker";
import type { OwnCaseSummary } from "@/lib/api/case-detail.client";
import {
  getCaseDetail,
  createInteraction,
  createCommitment,
  createTask,
} from "@/lib/api/case-detail.client";
import type { CaseInteraction, CaseCommitment, CaseTask } from "@/lib/api/case-detail.server";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AiScribeOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [selectedCase, setSelectedCase] = useState<OwnCaseSummary | null>(null);
  const [loadedCaseId, setLoadedCaseId] = useState<string | null>(null);
  const [interactions, setInteractions] = useState<CaseInteraction[]>([]);
  const [commitments, setCommitments] = useState<CaseCommitment[]>([]);
  const [tasks, setTasks] = useState<CaseTask[]>([]);
  const loading = !!selectedCase && loadedCaseId !== selectedCase.id;

  useEffect(() => {
    if (!selectedCase) return;
    getCaseDetail(selectedCase.id).then((detail) => {
      setInteractions(detail?.interactions ?? []);
      setCommitments(detail?.commitments ?? []);
      setTasks(detail?.tasks ?? []);
      setLoadedCaseId(selectedCase.id);
    });
  }, [selectedCase]);

  if (!open) return null;

  function handleClose() {
    setSelectedCase(null);
    onClose();
  }

  function handleBack() {
    if (selectedCase) {
      setSelectedCase(null);
    } else {
      handleClose();
    }
  }

  async function handleAddInteraction(content: string) {
    if (!selectedCase) return;
    const created = await createInteraction(selectedCase.id, {
      type: "SESSION_NOTE",
      notes: content,
    });
    setInteractions((prev) => [created, ...prev]);
  }

  async function handleAddNote(content: string) {
    if (!selectedCase) return;
    const created = await createInteraction(selectedCase.id, {
      type: "AD_HOC_NOTE",
      notes: content,
    });
    setInteractions((prev) => [created, ...prev]);
  }

  async function handleAddCommitment(content: string) {
    if (!selectedCase) return;
    const created = await createCommitment(selectedCase.id, {
      title: content.length > 60 ? `${content.slice(0, 60)}...` : content,
      description: content,
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });
    setCommitments((prev) => [created, ...prev]);
  }

  async function handleAddTask(content: string) {
    if (!selectedCase) return;
    const created = await createTask(selectedCase.id, {
      title: content.length > 60 ? `${content.slice(0, 60)}...` : content,
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    });
    setTasks((prev) => [created, ...prev]);
  }

  const notes = interactions.filter((i) => i.type === "AD_HOC_NOTE");
  const loggedInteractions = interactions.filter((i) => i.type !== "AD_HOC_NOTE");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Button variant="ghost" size="icon-sm" aria-label="Back" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mic className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-sm font-semibold text-foreground">New Log</h1>
            <p className="text-xs text-muted-foreground">
              {selectedCase
                ? `Logging against ${selectedCase.client.fullName}`
                : "Speak or type to capture interactions, commitments, tasks, and notes."}
            </p>
          </div>
        </div>
        {selectedCase && (
          <div className="ml-auto flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials(selectedCase.client.fullName)}
            </span>
            <Badge variant="outline" className="hidden text-muted-foreground sm:inline-flex">
              {selectedCase.category}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {!selectedCase ? (
          <CasePicker onSelect={setSelectedCase} />
        ) : loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading case history...
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <Tabs defaultValue="interaction">
              <TabsList className="w-full">
                <TabsTrigger value="interaction">Interaction</TabsTrigger>
                <TabsTrigger value="commitment">Commitment</TabsTrigger>
                <TabsTrigger value="task">Task</TabsTrigger>
                <TabsTrigger value="note">Note</TabsTrigger>
              </TabsList>

              <TabsContent value="interaction" className="pt-4">
                <CapturePanel<CaseInteraction>
                  placeholder="Log an interaction, or use the mic to dictate..."
                  submitLabel="Log interaction"
                  micLabel="Dictate interaction"
                  emptyLabel="No interactions logged yet."
                  items={loggedInteractions}
                  onAdd={handleAddInteraction}
                  renderItem={(item) => (
                    <div className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-muted-foreground">
                          {item.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{item.notes}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="commitment" className="pt-4">
                <CapturePanel<CaseCommitment>
                  placeholder="Add a commitment, or use the mic to dictate..."
                  submitLabel="Add commitment"
                  micLabel="Dictate commitment"
                  emptyLabel="No commitments yet."
                  items={commitments}
                  onAdd={handleAddCommitment}
                  renderItem={(item) => (
                    <div className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <Badge variant="outline" className="text-muted-foreground">
                          {item.status}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-muted-foreground">{item.description}</p>
                      )}
                      {item.dueAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due {format(new Date(item.dueAt), "EEE, dd MMM · h:mm a")}
                        </p>
                      )}
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="task" className="pt-4">
                <CapturePanel<CaseTask>
                  placeholder="Add a task, or use the mic to dictate..."
                  submitLabel="Add task"
                  micLabel="Dictate task"
                  emptyLabel="No tasks yet."
                  items={tasks}
                  onAdd={handleAddTask}
                  renderItem={(item) => (
                    <div className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">{item.title}</p>
                        <Badge variant="outline" className="text-muted-foreground">
                          {item.status}
                        </Badge>
                      </div>
                      {item.dueAt && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Due {format(new Date(item.dueAt), "EEE, dd MMM · h:mm a")}
                        </p>
                      )}
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="note" className="pt-4">
                <CapturePanel<CaseInteraction>
                  placeholder="Add a private note, or use the mic to dictate..."
                  submitLabel="Add note"
                  micLabel="Dictate note"
                  emptyLabel="No notes yet."
                  items={notes}
                  onAdd={handleAddNote}
                  renderItem={(item) => (
                    <div className="text-sm">
                      <p className="text-foreground">{item.notes}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
