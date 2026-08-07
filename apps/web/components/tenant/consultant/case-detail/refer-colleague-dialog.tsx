"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { referToColleague } from "@/lib/api/case-detail.client";

// Sprint 4.5 item 3 — only wires the entry point for a cross-consultant
// referral (creates a PENDING ConsultantReferral row). The accept/decline
// queue and full referral UI ship in Phase 6.
export function ReferColleagueDialog({
  caseId,
  ownConsultantId,
  consultants,
}: {
  caseId: string;
  ownConsultantId: string;
  consultants: { id: string; fullName: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [consultantId, setConsultantId] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [justSent, setJustSent] = useState(false);

  const options = consultants.filter((c) => c.id !== ownConsultantId);

  async function handleSubmit() {
    if (!consultantId) return;
    setSubmitting(true);
    try {
      await referToColleague(caseId, {
        toConsultantId: consultantId,
        contextNote: contextNote.trim() || undefined,
      });
      setJustSent(true);
      setTimeout(() => {
        setOpen(false);
        setConsultantId("");
        setContextNote("");
        setJustSent(false);
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" />
        Refer to Colleague
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Refer this case to a colleague</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Select value={consultantId} onValueChange={(value) => value && setConsultantId(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a consultant" />
              </SelectTrigger>
              <SelectContent>
                {options.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Context for your colleague (optional)"
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!consultantId || submitting}>
              {justSent ? "Sent" : "Send referral"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
