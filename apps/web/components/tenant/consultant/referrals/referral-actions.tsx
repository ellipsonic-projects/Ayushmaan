"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { acceptReferral, declineReferral } from "@/lib/api/consultant-referrals.client";
import { useTenantSlug } from "@/lib/tenant/slug-context";

export function ReferralActions({ referralId }: { referralId: string }) {
  const router = useRouter();
  const slug = useTenantSlug();
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    setSubmitting(true);
    try {
      const { newCase } = await acceptReferral(referralId);
      router.push(`/${slug}/tenant/consultant/cases/${newCase.id}`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDecline() {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await declineReferral(referralId, reason.trim());
      setDeclineOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => setDeclineOpen(true)}
          disabled={submitting}
          className="gap-2"
        >
          <X className="h-4 w-4" />
          Reject
        </Button>
        <Button onClick={handleApprove} disabled={submitting} className="gap-2">
          <Check className="h-4 w-4" />
          Approve
        </Button>
      </div>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this referral</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Let your colleague know why you're rejecting this referral"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={!reason.trim() || submitting}
            >
              Reject referral
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
