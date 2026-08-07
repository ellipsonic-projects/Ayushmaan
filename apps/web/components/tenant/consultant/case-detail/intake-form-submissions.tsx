"use client";

import { useState } from "react";
import { ClipboardCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CaseFormSubmission } from "@/lib/api/case-detail.server";
import { listSchemaFields, formatAnswer } from "@/lib/forms/schema-fields";

const STATUS_BADGE: Record<CaseFormSubmission["status"], string> = {
  PENDING: "border-amber-500 text-amber-600",
  SUBMITTED: "border-emerald-600 text-emerald-600",
  EXPIRED: "text-muted-foreground",
};

// Read-only for the consultant — the client fills this via the public
// SEND_INTAKE_FORM link (form-submissions.router.ts), never the consultant.
export function IntakeFormSubmissions({ submissions }: { submissions: CaseFormSubmission[] }) {
  const [open, setOpen] = useState<CaseFormSubmission | null>(null);

  if (submissions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          Intake Forms
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {submissions.map((submission) => (
          <button
            key={submission.id}
            type="button"
            onClick={() => setOpen(submission)}
            className="flex items-center justify-between gap-3 py-3 text-left first:pt-0 last:pb-0"
          >
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium text-foreground">
                {submission.formTemplate.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sent via {submission.channel} ·{" "}
                {new Date(submission.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <Badge variant="outline" className={STATUS_BADGE[submission.status]}>
              {submission.status}
            </Badge>
          </button>
        ))}
      </CardContent>

      <Dialog open={open !== null} onOpenChange={(next) => !next && setOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{open?.formTemplate.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {open?.status !== "SUBMITTED" ? (
              <p className="text-sm text-muted-foreground">
                Not yet submitted by the client ({open?.status.toLowerCase()}).
              </p>
            ) : (
              listSchemaFields(open.formTemplate.jsonSchema, open.formTemplate.uiSchema).map(
                (field) => (
                  <div key={field.key} className="flex flex-col gap-0.5">
                    <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                    <p className="text-sm text-foreground">
                      {formatAnswer(open.answers[field.key])}
                    </p>
                  </div>
                )
              )
            )}
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
