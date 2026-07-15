"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CalendarOff, FileText, Trash2, UserRound } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  ConsultantProfile,
  ConsultantVerificationDocument,
  ConsultantOutOfOfficePeriod,
} from "@/lib/api/consultants.server";
import {
  updateConsultantProfile,
  deleteVerificationDocument,
  createOutOfOffice,
  updateOutOfOffice,
  deleteOutOfOffice,
} from "@/lib/api/consultants.client";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "MEDICAL", label: "Medical" },
  { value: "LEGAL", label: "Legal" },
  { value: "IT", label: "IT" },
  { value: "PHYSIOTHERAPY", label: "Physiotherapy" },
  { value: "HOMEOPATHY", label: "Homeopathy" },
  { value: "ASTROLOGY", label: "Astrology" },
];

const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Marathi"];
const CURRENCIES = ["INR", "USD"] as const;
const PAYMENT_TIMINGS: { value: "PAY_ON_BOOKING" | "PAY_AFTER_SESSION"; label: string }[] = [
  { value: "PAY_ON_BOOKING", label: "Pay on booking" },
  { value: "PAY_AFTER_SESSION", label: "Pay after session" },
];

function toDateInput(value: string) {
  return value.slice(0, 10);
}

export function ConsultantSettingsForm({
  consultant,
  documents,
  oooPeriods,
}: {
  consultant: ConsultantProfile;
  documents: ConsultantVerificationDocument[];
  oooPeriods: ConsultantOutOfOfficePeriod[];
}) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(consultant.fullName);
  const [category, setCategory] = useState(consultant.category);
  const [specialization, setSpecialization] = useState(consultant.subSpecialization ?? "");
  const [bio, setBio] = useState(consultant.bio ?? "");
  const [sessionFee, setSessionFee] = useState(consultant.consultationFee);
  const [currency, setCurrency] = useState(consultant.currency);
  const [languages, setLanguages] = useState<string[]>(consultant.languagesSpoken);
  const [acceptBookings, setAcceptBookings] = useState(consultant.isAcceptingNewClients);
  const [autoApproveBookings, setAutoApproveBookings] = useState(consultant.autoApproveBookings);
  const [paymentTiming, setPaymentTiming] = useState(consultant.paymentTiming);

  const existingOoo = oooPeriods[0] ?? null;
  const [oooEnabled, setOooEnabled] = useState(existingOoo !== null);
  const [oooStart, setOooStart] = useState(existingOoo ? toDateInput(existingOoo.startDate) : "");
  const [oooEnd, setOooEnd] = useState(existingOoo ? toDateInput(existingOoo.endDate) : "");
  const [oooMessage, setOooMessage] = useState(existingOoo?.autoReplyMessage ?? "");
  const [oooPauseBookings, setOooPauseBookings] = useState(existingOoo?.pausesNewBookings ?? true);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  function withDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
    };
  }

  function toggleLanguage(language: string) {
    setLanguages((prev) =>
      prev.includes(language) ? prev.filter((item) => item !== language) : [...prev, language]
    );
    setDirty(true);
  }

  function handleDiscard() {
    setDisplayName(consultant.fullName);
    setCategory(consultant.category);
    setSpecialization(consultant.subSpecialization ?? "");
    setBio(consultant.bio ?? "");
    setSessionFee(consultant.consultationFee);
    setCurrency(consultant.currency);
    setLanguages(consultant.languagesSpoken);
    setAcceptBookings(consultant.isAcceptingNewClients);
    setAutoApproveBookings(consultant.autoApproveBookings);
    setPaymentTiming(consultant.paymentTiming);
    setOooEnabled(existingOoo !== null);
    setOooStart(existingOoo ? toDateInput(existingOoo.startDate) : "");
    setOooEnd(existingOoo ? toDateInput(existingOoo.endDate) : "");
    setOooMessage(existingOoo?.autoReplyMessage ?? "");
    setOooPauseBookings(existingOoo?.pausesNewBookings ?? true);
    setDirty(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateConsultantProfile(consultant.id, {
        fullName: displayName,
        category,
        subSpecialization: specialization,
        bio,
        consultationFee: Number(sessionFee),
        currency,
        languagesSpoken: languages,
        isAcceptingNewClients: acceptBookings,
        autoApproveBookings,
        paymentTiming,
      });

      if (oooEnabled && oooStart && oooEnd) {
        if (existingOoo) {
          await updateOutOfOffice(existingOoo.id, {
            startDate: oooStart,
            endDate: oooEnd,
            autoReplyMessage: oooMessage,
            pausesNewBookings: oooPauseBookings,
          });
        } else {
          await createOutOfOffice(consultant.id, {
            startDate: oooStart,
            endDate: oooEnd,
            autoReplyMessage: oooMessage,
            pausesNewBookings: oooPauseBookings,
          });
        }
      } else if (!oooEnabled && existingOoo) {
        await deleteOutOfOffice(existingOoo.id);
      }

      setDirty(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteDocument(docId: string) {
    setDeletingDocId(docId);
    try {
      await deleteVerificationDocument(docId);
      router.refresh();
    } finally {
      setDeletingDocId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Card id="public-profile" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            Public Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => withDirty(setDisplayName)(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(value) => value && withDirty(setCategory)(value)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="specialization">Sub-specialization</Label>
            <Input
              id="specialization"
              value={specialization}
              onChange={(e) => withDirty(setSpecialization)(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => withDirty(setBio)(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="session-fee">Session Fee</Label>
            <div className="flex items-center gap-2">
              <Input
                id="session-fee"
                type="number"
                min={0}
                value={sessionFee}
                onChange={(e) => withDirty(setSessionFee)(e.target.value)}
                className="h-9"
              />
              <div className="flex h-9 shrink-0 items-center rounded-lg border border-input p-0.5">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => withDirty(setCurrency)(c)}
                    className={cn(
                      "h-full rounded-md px-3 text-xs font-semibold transition-colors",
                      currency === c
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Payment Timing</Label>
            <Select
              value={paymentTiming}
              onValueChange={(value) =>
                value &&
                withDirty(setPaymentTiming)(value as "PAY_ON_BOOKING" | "PAY_AFTER_SESSION")
              }
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TIMINGS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Languages Spoken</Label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map((language) => (
                <button
                  key={language}
                  type="button"
                  onClick={() => toggleLanguage(language)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    languages.includes(language)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  {language}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4 sm:col-span-2">
            <div>
              <p className="text-sm font-medium text-foreground">Accept Bookings</p>
              <p className="text-xs text-muted-foreground">
                When off, your profile stays visible but clients can&apos;t book new appointments.
                Your admin can override this.
              </p>
            </div>
            <Switch checked={acceptBookings} onCheckedChange={withDirty(setAcceptBookings)} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4 sm:col-span-2">
            <div>
              <p className="text-sm font-medium text-foreground">Auto-approve Bookings</p>
              <p className="text-xs text-muted-foreground">
                When on, new booking requests are confirmed automatically instead of waiting for
                your review.
              </p>
            </div>
            <Switch
              checked={autoApproveBookings}
              onCheckedChange={withDirty(setAutoApproveBookings)}
            />
          </div>
        </CardContent>
      </Card>

      <Card id="credentials" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BadgeCheck className="h-3.5 w-3.5" />
            Qualifications &amp; Licenses
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents on file.</p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-foreground">
                      {doc.documentType.replace(/_/g, " ")}
                    </span>
                    {doc.issuingAuthority && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {doc.issuingAuthority}
                      </span>
                    )}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteDocument(doc.id)}
                  disabled={deletingDocId === doc.id}
                  aria-label="Remove document"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card id="out-of-office" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarOff className="h-3.5 w-3.5" />
            Out of Office
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Enable out-of-office period</p>
              <p className="text-xs text-muted-foreground">
                Client messages get an auto-reply while this is active.
              </p>
            </div>
            <Switch checked={oooEnabled} onCheckedChange={withDirty(setOooEnabled)} />
          </div>
          <div
            className={cn(
              "grid grid-cols-1 gap-4 sm:grid-cols-2",
              !oooEnabled && "pointer-events-none opacity-50"
            )}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ooo-start">Start Date</Label>
              <Input
                id="ooo-start"
                type="date"
                value={oooStart}
                onChange={(e) => withDirty(setOooStart)(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ooo-end">End Date</Label>
              <Input
                id="ooo-end"
                type="date"
                value={oooEnd}
                onChange={(e) => withDirty(setOooEnd)(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ooo-message">Auto-reply Message</Label>
              <textarea
                id="ooo-message"
                rows={2}
                value={oooMessage}
                onChange={(e) => withDirty(setOooMessage)(e.target.value)}
                className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              />
            </div>
            <div className="flex items-center justify-between gap-4 sm:col-span-2">
              <div>
                <p className="text-sm font-medium text-foreground">Pause new bookings</p>
                <p className="text-xs text-muted-foreground">
                  Blocks new bookings during this period instead of you declining each one.
                </p>
              </div>
              <Switch checked={oooPauseBookings} onCheckedChange={withDirty(setOooPauseBookings)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-border bg-card px-6 py-3 shadow-[0_-1px_0_rgba(0,0,0,0.04)] sm:left-64">
        <span className="text-xs text-muted-foreground">
          {dirty ? "You have unsaved changes." : "All changes are saved."}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!dirty || saving}
            onClick={handleDiscard}
          >
            Discard
          </Button>
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
