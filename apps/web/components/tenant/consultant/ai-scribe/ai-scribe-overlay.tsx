"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Mic } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CapturePanel } from "@/components/tenant/consultant/ai-scribe/capture-panel";
import { CasePicker } from "@/components/tenant/consultant/ai-scribe/case-picker";
import type { ScribeCase } from "@/components/tenant/consultant/ai-scribe/ai-scribe-data";
import {
  interactions as initialInteractions,
  commitments as initialCommitments,
  tasks as initialTasks,
  notes as initialNotes,
  type InteractionItem,
  type CommitmentItem,
  type TaskItem,
  type NoteItem,
} from "@/components/tenant/consultant/session-detail/session-detail-data";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AiScribeOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [selectedCase, setSelectedCase] = useState<ScribeCase | null>(null);
  const [interactions, setInteractions] = useState(initialInteractions);
  const [commitments, setCommitments] = useState(initialCommitments);
  const [tasks, setTasks] = useState(initialTasks);
  const [notes, setNotes] = useState(initialNotes);

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

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Back"
          onClick={handleBack}
        >
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
                ? `Logging against ${selectedCase.clientName} (${selectedCase.clientCode})`
                : "Speak or type to capture interactions, commitments, tasks, and notes."}
            </p>
          </div>
        </div>
        {selectedCase && (
          <div className="ml-auto flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {initials(selectedCase.clientName)}
            </span>
            <Badge
              variant="outline"
              className="hidden text-muted-foreground sm:inline-flex"
            >
              {selectedCase.category}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {!selectedCase ? (
          <CasePicker onSelect={setSelectedCase} />
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
                <CapturePanel<InteractionItem>
                  placeholder="Log an interaction, or use the mic to dictate..."
                  submitLabel="Log interaction"
                  micLabel="Dictate interaction"
                  emptyLabel="No interactions logged yet."
                  items={interactions}
                  onAdd={(content) =>
                    setInteractions((prev) => [
                      {
                        id: `int-${Date.now()}`,
                        type: "Note",
                        summary:
                          content.length > 60
                            ? `${content.slice(0, 60)}...`
                            : content,
                        notes: content,
                        createdAt: new Date(),
                        isClientVisible: false,
                      },
                      ...prev,
                    ])
                  }
                  renderItem={(item) => (
                    <div className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {item.summary}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          {item.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">{item.notes}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDistanceToNow(item.createdAt, {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="commitment" className="pt-4">
                <CapturePanel<CommitmentItem>
                  placeholder="Add a commitment, or use the mic to dictate..."
                  submitLabel="Add commitment"
                  micLabel="Dictate commitment"
                  emptyLabel="No commitments yet."
                  items={commitments}
                  onAdd={(content) =>
                    setCommitments((prev) => [
                      {
                        id: `com-${Date.now()}`,
                        title:
                          content.length > 60
                            ? `${content.slice(0, 60)}...`
                            : content,
                        description: content,
                        status: "Pending",
                        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
                      },
                      ...prev,
                    ])
                  }
                  renderItem={(item) => (
                    <div className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {item.title}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        {item.description}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due {format(item.dueAt, "EEE, dd MMM · h:mm a")}
                      </p>
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="task" className="pt-4">
                <CapturePanel<TaskItem>
                  placeholder="Add a task, or use the mic to dictate..."
                  submitLabel="Add task"
                  micLabel="Dictate task"
                  emptyLabel="No tasks yet."
                  items={tasks}
                  onAdd={(content) =>
                    setTasks((prev) => [
                      {
                        id: `task-${Date.now()}`,
                        title:
                          content.length > 60
                            ? `${content.slice(0, 60)}...`
                            : content,
                        assignedTo: "You",
                        status: "Pending",
                        dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
                      },
                      ...prev,
                    ])
                  }
                  renderItem={(item) => (
                    <div className="text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-foreground">
                          {item.title}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          {item.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Assigned to {item.assignedTo} &middot; Due{" "}
                        {format(item.dueAt, "EEE, dd MMM · h:mm a")}
                      </p>
                    </div>
                  )}
                />
              </TabsContent>

              <TabsContent value="note" className="pt-4">
                <CapturePanel<NoteItem>
                  placeholder="Add a private note, or use the mic to dictate..."
                  submitLabel="Add note"
                  micLabel="Dictate note"
                  emptyLabel="No notes yet."
                  items={notes}
                  onAdd={(content) =>
                    setNotes((prev) => [
                      {
                        id: `note-${Date.now()}`,
                        author: "You",
                        content,
                        createdAt: new Date(),
                      },
                      ...prev,
                    ])
                  }
                  renderItem={(item) => (
                    <div className="text-sm">
                      <p className="text-foreground">{item.content}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.author} &middot;{" "}
                        {formatDistanceToNow(item.createdAt, {
                          addSuffix: true,
                        })}
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
