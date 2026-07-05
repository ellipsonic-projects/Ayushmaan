"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { UploadCloud, Send, X } from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Grievance entity — schema §1.3. subjectType constrained to what a Tenant
// Admin can escalate about themselves (never CONSULTANT/TENANT_ADMIN, which
// route through the client-facing channel in §4 instead).
const SUBJECTS = [
  { value: "BILLING", label: "Billing / Payouts" },
  { value: "PLATFORM", label: "Platform Issue" },
  { value: "OTHER", label: "Other" },
] as const;

const CATEGORIES = [
  { value: "BILLING_DISPUTE", label: "Billing Dispute" },
  { value: "DATA_PRIVACY", label: "Data Privacy" },
  { value: "OTHER", label: "Other" },
] as const;

const SEVERITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
] as const;

export function RaiseGrievanceForm() {
  const [subjectType, setSubjectType] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [severity, setSeverity] = useState<string>("MEDIUM");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isValid =
    subjectType.length > 0 && category.length > 0 && description.trim().length > 0;

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setAttachments((prev) => [...prev, ...files.map((f) => f.name)]);
    event.target.value = "";
  }

  function removeAttachment(name: string) {
    setAttachments((prev) => prev.filter((a) => a !== name));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    // POST /api/grievances — notifies SUPER_ADMIN (in-app + email; SMS if
    // severity=CRITICAL), per §4.1. tenantId is attached server-side from the
    // authenticated Tenant Admin's JWT, for context only.
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      setSubjectType("");
      setCategory("");
      setSeverity("MEDIUM");
      setDescription("");
      setAttachments([]);
    }, 600);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            New Escalation
          </CardTitle>
          <CardDescription>
            Ayushman&apos;s platform team is notified immediately on submit.
            You can track its status below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>
                Subject <span className="text-destructive">*</span>
              </Label>
              <Select value={subjectType} onValueChange={(v) => setSubjectType(v ?? "")}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={(v) => setCategory(v ?? "")}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v ?? "MEDIUM")}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="description"
              placeholder="Describe the issue in detail — what happened, when, and what resolution you're looking for..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Attachments</Label>
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input bg-muted/40 text-center transition-colors hover:bg-muted/60">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">
                Attach screenshots or documents
              </span>
              <span className="text-[11px] text-muted-foreground">
                PNG, JPG, or PDF. Max 10MB each.
              </span>
              <input
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
            {attachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {attachments.map((name) => (
                  <Badge key={name} variant="secondary" className="gap-1 py-1">
                    {name}
                    <button
                      type="button"
                      onClick={() => removeAttachment(name)}
                      className="ml-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {submitted && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400">
              Escalation submitted. The platform team has been notified and
              you can track its status below.
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button type="submit" disabled={!isValid || submitting} className="gap-1.5">
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Submitting..." : "Submit to Platform"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
