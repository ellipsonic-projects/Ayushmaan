"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RemindersPanel } from "@/components/tenant/shared/workflows/reminders-panel";
import { cn } from "@/lib/utils";

type WorkflowItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  active: boolean;
};

type WorkflowSection = {
  id: string;
  title: string;
  items: WorkflowItem[];
};

const initialSections: WorkflowSection[] = [
  {
    id: "client-docs",
    title: "Client and documentation",
    items: [
      {
        id: "send-intake",
        title: "Send intake",
        description: "Send forms and agreements when a new client is created",
        tags: ["Choose forms and agreements", "Send email"],
        active: false,
      },
      {
        id: "send-portal-invite",
        title: "Send portal invite",
        description: "Send a portal invite when a new client is created",
        tags: ["Add portal invite", "Send email"],
        active: false,
      },
    ],
  },
  {
    id: "scheduling",
    title: "Scheduling",
    items: [
      {
        id: "appt-declined",
        title: "Appointment request declined",
        description: "Let clients know their appointment request was declined",
        tags: ["Send email", "Send SMS"],
        active: true,
      },
      {
        id: "appt-received",
        title: "Appointment request received",
        description: "Let clients know their appointment request was received",
        tags: ["Send email", "Send SMS"],
        active: true,
      },
      {
        id: "appt-cancelled",
        title: "Cancelled appointment",
        description: "Notify clients when an appointment is cancelled",
        tags: ["Send email", "Send SMS"],
        active: true,
      },
      {
        id: "appt-new",
        title: "New appointment",
        description: "Notify clients when an appointment is booked for them",
        tags: ["Send email", "Send SMS"],
        active: true,
      },
      {
        id: "appt-rescheduled",
        title: "Rescheduled appointment",
        description: "Notify clients when an appointment is rescheduled",
        tags: ["Send email", "Send SMS"],
        active: true,
      },
    ],
  },
];

export function WorkflowsBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const [sections, setSections] = useState(initialSections);

  function openBuilder(itemId: string) {
    router.push(`${pathname.replace(/\/$/, "")}/send?id=${itemId}`);
  }
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function toggleActive(sectionId: string, itemId: string) {
    setSections((prev) =>
      prev.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, active: !item.active } : item
              ),
            }
      )
    );
  }

  function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const newItem: WorkflowItem = {
      id: `custom-${Date.now()}`,
      title: trimmed,
      description: "Custom workflow",
      tags: [],
      active: false,
    };

    setSections((prev) => {
      const customIndex = prev.findIndex((section) => section.id === "custom");
      if (customIndex === -1) {
        return [...prev, { id: "custom", title: "Custom", items: [newItem] }];
      }
      const next = [...prev];
      next[customIndex] = {
        ...next[customIndex],
        items: [...next[customIndex].items, newItem],
      };
      return next;
    });

    setName("");
    setOpen(false);
  }

  return (
    <Tabs defaultValue="workflows" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Workflows</h2>
          <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New workflow
          </Button>
        </div>
        <TabsList variant="line" className="border-b border-border pb-1">
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
          <TabsTrigger value="reminders">Reminders</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="workflows" className="flex flex-col gap-6">
        {sections.map((section) => (
        <Card key={section.id}>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">{section.title}</h3>
              <span className="text-xs text-muted-foreground">{section.items.length}</span>
            </div>
            {section.items.map((item) => (
              <div
                key={item.id}
                onClick={() => openBuilder(item.id)}
                className="flex cursor-pointer flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="font-normal text-muted-foreground">
                      {tag}
                    </Badge>
                  ))}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleActive(section.id, item.id);
                    }}
                    aria-label={`Toggle ${item.title}`}
                  >
                    <Badge
                      className={cn(
                        "cursor-pointer",
                        item.active
                          ? "bg-emerald-600 text-white hover:bg-emerald-600"
                          : "border-border bg-transparent text-muted-foreground"
                      )}
                    >
                      {item.active ? "Active" : "Inactive"}
                    </Badge>
                  </button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        ))}
      </TabsContent>

      <TabsContent value="reminders">
        <RemindersPanel />
      </TabsContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New workflow</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="workflow-name">Name</Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Follow-up reminder"
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button onClick={handleCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}
