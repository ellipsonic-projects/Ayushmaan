"use client";

import { format } from "date-fns";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface AppointmentDetails {
  id: string;
  caseId: string;
  clientName: string;
  consultantCategory: string;
  consultantName: string | null;
  scheduledStart: string;
  scheduledEnd: string;
  requirementsSubject: string | null;
  requirements: string | null;
}

// Shared by conflict-resolution-queue.tsx and pending-approvals-table.tsx so
// a Tenant Admin always sees the case requirements in the same layout —
// view-only, since approving no longer requires picking a consultant.
export function AppointmentDetailsDialog({
  item,
  onOpenChange,
}: {
  item: AppointmentDetails | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={item !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        {item && (
          <>
            <DialogHeader>
              <DialogTitle>{item.clientName}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Category</p>
                <p className="text-foreground">{item.consultantCategory}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Requested slot</p>
                <p className="text-foreground" suppressHydrationWarning>
                  {format(new Date(item.scheduledStart), "EEE, MMM d 'at' h:mm a")} –{" "}
                  {format(new Date(item.scheduledEnd), "h:mm a")}
                </p>
              </div>
              {item.requirementsSubject && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Subject</p>
                  <p className="text-foreground">{item.requirementsSubject}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-muted-foreground">Requirements</p>
                <p className="whitespace-pre-wrap text-foreground">
                  {item.requirements ?? "No requirements provided."}
                </p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
