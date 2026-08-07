"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";

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

export function ReassignConsultantDialog({
  caseId,
  currentConsultantId,
  consultants,
}: {
  caseId: string;
  currentConsultantId: string;
  consultants: { id: string; fullName: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [consultantId, setConsultantId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const options = consultants.filter((c) => c.id !== currentConsultantId);

  async function handleSubmit() {
    if (!consultantId) return;
    setSubmitting(true);
    try {
      await reassignCase(caseId, { consultantId, reason: reason.trim() || undefined });
      setOpen(false);
      setConsultantId("");
      setReason("");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setOpen(true)}>
        <UserCog className="h-4 w-4" />
        Reassign Case
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign case</DialogTitle>
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
              placeholder="Reason for reassignment (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!consultantId || submitting}>
              Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
