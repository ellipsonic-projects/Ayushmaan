"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CheckCircle2, Stethoscope, Check, ChevronsUpDown, X } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  submitConsultantApplication,
  lookupConsultantInviteCode,
} from "@/lib/api/consultant-applications.client";
import type { OwnConsultantApplication } from "@/lib/api/consultant-applications.server";
import { LANGUAGE_OPTIONS } from "@/lib/languages";

const CODE_LOOKUP_DEBOUNCE_MS = 300;

type InviteCodeOrg = { displayName: string; slug: string; logoUrl: string | null };

const CATEGORIES = [
  { value: "MEDICAL", label: "Medical" },
  { value: "LEGAL", label: "Legal" },
  { value: "IT", label: "IT" },
  { value: "PHYSIOTHERAPY", label: "Physiotherapy" },
  { value: "HOMEOPATHY", label: "Homeopathy" },
  { value: "ASTROLOGY", label: "Astrology" },
];

function statusBadge(status: OwnConsultantApplication["status"]) {
  if (status === "PENDING") return <Badge variant="secondary">Pending review</Badge>;
  if (status === "REJECTED") return <Badge variant="destructive">Rejected</Badge>;
  return <Badge>Approved</Badge>;
}

function ApplyForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [code, setCode] = useState("");
  const [org, setOrg] = useState<InviteCodeOrg | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [subSpecialization, setSubSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>(["en"]);
  const [langOpen, setLangOpen] = useState(false);
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!/^[A-Z0-9]{10}$/.test(code)) {
      setOrg(null);
      setCodeError(null);
      return;
    }
    const handle = setTimeout(() => {
      setLookingUp(true);
      setCodeError(null);
      lookupConsultantInviteCode(code)
        .then((result) => setOrg(result.tenant))
        .catch(() => {
          setOrg(null);
          setCodeError("This code is invalid or has expired.");
        })
        .finally(() => setLookingUp(false));
    }, CODE_LOOKUP_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [code]);

  function toggleLanguage(value: string) {
    setLanguagesSpoken((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const canSubmit = org !== null && category !== "" && !submitting;

  async function handleSubmit() {
    if (!org || !category) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitConsultantApplication({
        code,
        category,
        subSpecialization: subSpecialization || undefined,
        bio: bio || undefined,
        languagesSpoken,
        message: message || undefined,
      });
      onSubmitted();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("409")
          ? "You already have a pending application to this organization."
          : "Failed to submit application. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="invite-code">Invite code</Label>
        <Input
          id="invite-code"
          value={code}
          onChange={(e) =>
            setCode(
              e.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, "")
                .slice(0, 10)
            )
          }
          placeholder="10-character code from your organization's admin"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          Ask the organization's admin for an invite code and share it with you outside the app
          (phone call, WhatsApp, etc.).
        </p>
        {lookingUp && <p className="text-xs text-muted-foreground">Checking code…</p>}
        {codeError && <p className="text-xs text-destructive">{codeError}</p>}
      </div>

      {org && (
        <Card className="border-primary ring-1 ring-primary">
          <CardContent className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </span>
            <p className="min-w-0 truncate text-sm font-semibold text-foreground">
              {org.displayName}
            </p>
            <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-primary" />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Category</Label>
        <Select value={category} onValueChange={(value) => value && setCategory(value)}>
          <SelectTrigger className="h-9 w-full">
            <SelectValue placeholder="Select a category" />
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
        <Label htmlFor="sub-specialization">Sub-specialization (optional)</Label>
        <Input
          id="sub-specialization"
          value={subSpecialization}
          onChange={(e) => setSubSpecialization(e.target.value)}
          placeholder="e.g. Sports Medicine"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Languages spoken</Label>
        <Popover open={langOpen} onOpenChange={setLangOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={langOpen}
              className="w-full justify-between font-normal"
            >
              Select languages...
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--anchor-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search languages..." />
              <CommandList>
                <CommandEmpty>No language found.</CommandEmpty>
                <CommandGroup>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <CommandItem
                      key={lang.value}
                      value={lang.label}
                      onSelect={() => {
                        toggleLanguage(lang.value);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          languagesSpoken.includes(lang.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {lang.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {languagesSpoken.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {languagesSpoken.map((value) => {
              const lang = LANGUAGE_OPTIONS.find((l) => l.value === value);
              if (!lang) return null;
              return (
                <Badge
                  key={value}
                  variant="secondary"
                  className="flex cursor-pointer items-center gap-1 pr-1.5 hover:bg-secondary/80"
                  onClick={() => toggleLanguage(value)}
                >
                  {lang.label}
                  <X className="h-3 w-3 hover:text-destructive" />
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bio">Bio (optional)</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short professional summary"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="message">Message to the admin (optional)</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Anything you'd like the organization's admin to know"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <DialogFooter>
        <Button type="button" disabled={!canSubmit} onClick={handleSubmit}>
          {submitting ? "Submitting..." : "Submit application"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export function BecomeConsultantCard({
  applications,
}: {
  applications: OwnConsultantApplication[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const hasPending = applications.some((a) => a.status === "PENDING");

  function handleSubmitted() {
    setOpen(false);
    router.refresh();
  }

  return (
    <Card data-tour="client-become-consultant">
      <CardHeader>
        <CardTitle>Become a consultant</CardTitle>
        <CardDescription>
          Apply to practice as a consultant under an organization on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {applications.length > 0 && (
          <div className="flex flex-col gap-2">
            {applications.map((application) => (
              <div
                key={application.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {application.tenant.displayName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {application.category}
                      {application.status === "REJECTED" &&
                        application.rejectionReason &&
                        ` — ${application.rejectionReason}`}
                    </p>
                  </div>
                </div>
                {statusBadge(application.status)}
              </div>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            render={
              <Button
                type="button"
                variant="outline"
                disabled={hasPending}
                className="self-start"
              />
            }
          >
            {hasPending ? "Application pending review" : "Apply to become a consultant"}
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apply to become a consultant</DialogTitle>
              <DialogDescription>
                Enter the invite code your organization's admin sent you and share your professional
                details. They'll review your application.
              </DialogDescription>
            </DialogHeader>
            <ApplyForm onSubmitted={handleSubmitted} />
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
