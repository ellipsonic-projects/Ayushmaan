import { createInteraction } from "@/lib/api/case-detail.client";
import type { InteractionType } from "@/lib/api/case-detail.server";

// Sprint 5.2 item 4 — a note typed in quick-capture-widget.tsx during a
// network drop is buffered here instead of being lost, then flushed the next
// time the browser comes back online (or the widget is reopened).
const STORAGE_KEY = "ayushman:queued-interaction-drafts";

export interface QueuedInteractionDraft {
  id: string;
  caseId: string;
  type: InteractionType;
  notes: string;
  isClientVisible: boolean;
  queuedAt: string;
}

export function getQueuedDrafts(): QueuedInteractionDraft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedInteractionDraft[]) : [];
  } catch {
    return [];
  }
}

function saveQueuedDrafts(drafts: QueuedInteractionDraft[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
}

export function queueDraft(draft: Omit<QueuedInteractionDraft, "id" | "queuedAt">): void {
  const drafts = getQueuedDrafts();
  drafts.push({ ...draft, id: crypto.randomUUID(), queuedAt: new Date().toISOString() });
  saveQueuedDrafts(drafts);
}

// Flushes queued drafts in the order they were captured, stopping at the
// first failure so a still-offline connection doesn't reorder later drafts
// ahead of ones the server hasn't seen yet.
export async function flushQueuedDrafts(): Promise<{ synced: number; remaining: number }> {
  const drafts = getQueuedDrafts();
  let synced = 0;

  for (const draft of drafts) {
    try {
      await createInteraction(draft.caseId, {
        type: draft.type,
        notes: draft.notes,
        isClientVisible: draft.isClientVisible,
      });
      synced += 1;
    } catch {
      break;
    }
  }

  const remainingDrafts = drafts.slice(synced);
  saveQueuedDrafts(remainingDrafts);
  return { synced, remaining: remainingDrafts.length };
}
