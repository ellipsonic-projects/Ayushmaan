"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";

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
import { reassignCase } from "@/lib/api/case-detail.client";

// Shown on an ADMIN_APPROVED appointment so a consultant can hand off a new
// request before accepting it. Unlike ReassignConsultantDialog (used on an
// already-active case), a reason is required here since the request never
// reached this consultant's queue by choice.
export function TransferToColleagueDialog({
  caseId,
  currentConsultantId,
  consultants,
  onTransferred,
}: {
  caseId: string;
  currentConsultantId: string;
  consultants: { id: string; fullName: string }[];
  onTransferred?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [consultantId, setConsultantId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = consultants.filter((c) => c.id !== currentConsultantId);
  const canSubmit = Boolean(consultantId) && reason.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await reassignCase(caseId, { consultantId, reason: reason.trim() });
      setOpen(false);
      setConsultantId("");
      setReason("");
      if (onTransferred) {
        onTransferred();
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer this appointment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <ArrowRightLeft className="h-4 w-4" />
        Transfer to a colleague
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to a colleague</DialogTitle>
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
              placeholder="Reason for transferring (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
