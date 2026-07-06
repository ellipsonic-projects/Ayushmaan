"use client";

import { useState } from "react";
import {
  Briefcase,
  ScrollText,
  AlertTriangle,
  FileText,
  X,
  Ban,
  RotateCcw,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
  DialogClose,
} from "@/components/ui/dialog";

// consultant_category enum — schema §3.8
const CATEGORIES = [
  { value: "MEDICAL", label: "Medical" },
  { value: "LEGAL", label: "Legal" },
  { value: "IT", label: "IT" },
  { value: "PHYSIOTHERAPY", label: "Physiotherapy" },
  { value: "HOMEOPATHY", label: "Homeopathy" },
  { value: "ASTROLOGY", label: "Astrology" },
];

const CURRENCIES = ["INR", "USD", "EUR", "GBP"];

const AVAILABLE_LANGUAGES = [
  "English",
  "Hindi",
  "Tamil",
  "Telugu",
  "Kannada",
  "Marathi",
  "Bengali",
];

// consultant_verification_documents — schema §3.25
type VerificationDocument = {
  id: string;
  documentType: string;
  issuingAuthority: string;
  expiryDate: string | null;
};

const initialDocuments: VerificationDocument[] = [
  {
    id: "DOC-1",
    documentType: "Medical License",
    issuingAuthority: "Medical Council of India",
    expiryDate: "Mar 2028",
  },
  {
    id: "DOC-2",
    documentType: "Degree Certificate",
    issuingAuthority: "AIIMS Delhi",
    expiryDate: null,
  },
];

export function ConsultantDetailForm({
  consultant,
}: {
  consultant: {
    id: string;
    fullName: string;
    email: string;
    category: string;
    subSpecialization: string;
    bio: string;
    consultationFee: string;
    currency: string;
    languages: string[];
    isAcceptingNewClients: boolean;
    accountStatus: "ACTIVE" | "SUSPENDED";
    caseCount: number;
    disputeCount: number;
  };
}) {
  const [category, setCategory] = useState(consultant.category);
  const [subSpecialization, setSubSpecialization] = useState(
    consultant.subSpecialization
  );
  const [bio, setBio] = useState(consultant.bio);
  const [consultationFee, setConsultationFee] = useState(consultant.consultationFee);
  const [currency, setCurrency] = useState(consultant.currency);
  const [languages, setLanguages] = useState<string[]>(consultant.languages);
  const [isAcceptingNewClients, setIsAcceptingNewClients] = useState(
    consultant.isAcceptingNewClients
  );
  const [documents, setDocuments] = useState(initialDocuments);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [accountStatus, setAccountStatus] = useState(consultant.accountStatus);

  function withDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
    };
  }

  function addLanguage(language: string) {
    setLanguages((prev) => (prev.includes(language) ? prev : [...prev, language]));
    setDirty(true);
  }

  function removeLanguage(language: string) {
    setLanguages((prev) => prev.filter((l) => l !== language));
    setDirty(true);
  }

  function removeDocument(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  function handleDiscard() {
    setDirty(false);
  }

  function handleSave() {
    setSaving(true);
    // PATCH /api/tenants/:tenantId/consultants/:consultantId — apps/api owns
    // consultant_profiles persistence.
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
    }, 600);
  }

  function confirmStatusToggle() {
    setAccountStatus((prev) => (prev === "ACTIVE" ? "SUSPENDED" : "ACTIVE"));
    setSuspendDialogOpen(false);
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Briefcase className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Cases
              </p>
              <p className="text-xl font-bold text-foreground">{consultant.caseCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                consultant.disputeCount > 0
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                  : "bg-muted text-foreground"
              }`}
            >
              <AlertTriangle className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Open Dispute Flags
              </p>
              <p className="text-xl font-bold text-foreground">{consultant.disputeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Accepting New Clients
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Public "Accept Bookings" toggle override
              </p>
            </div>
            <Switch
              checked={isAcceptingNewClients}
              onCheckedChange={withDirty(setIsAcceptingNewClients)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Professional Profile
          </CardTitle>
          <CardDescription>
            Shown on their public booking profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => withDirty(setCategory)(v ?? category)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
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
              <Label htmlFor="sub-specialization">Sub-specialization</Label>
              <Input
                id="sub-specialization"
                value={subSpecialization}
                onChange={(e) => withDirty(setSubSpecialization)(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => withDirty(setBio)(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consultation-fee">Consultation Fee</Label>
              <Input
                id="consultation-fee"
                type="number"
                min={0}
                step="0.01"
                value={consultationFee}
                onChange={(e) => withDirty(setConsultationFee)(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Currency</Label>
              <Select value={currency} onValueChange={(v) => withDirty(setCurrency)(v ?? currency)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Languages Spoken</Label>
            <div className="flex flex-wrap items-center gap-2">
              {languages.map((language) => (
                <Badge key={language} variant="secondary" className="gap-1 py-1">
                  {language}
                  <button type="button" onClick={() => removeLanguage(language)} className="ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Select<string> onValueChange={(v) => v && addLanguage(v)}>
                <SelectTrigger size="sm" className="h-8 w-40">
                  <SelectValue placeholder="Add language..." />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_LANGUAGES.filter((l) => !languages.includes(l)).map((language) => (
                    <SelectItem key={language} value={language}>
                      {language}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ScrollText className="h-3.5 w-3.5" />
            License &amp; Verification Documents
          </CardTitle>
          <CardDescription>
            Self-attested uploads shown on the public profile — review only,
            there is no platform approval workflow.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {documents.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No documents uploaded yet.
            </p>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileText className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{doc.documentType}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.issuingAuthority}
                      {doc.expiryDate ? ` · Expires ${doc.expiryDate}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove document"
                    onClick={() => removeDocument(doc.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-destructive/60">
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {accountStatus === "ACTIVE" ? "Suspend this consultant" : "Reactivate this consultant"}
            </p>
            <p className="text-xs text-muted-foreground">
              {accountStatus === "ACTIVE"
                ? "Removes them from public booking and logs them out. Reversible at any time."
                : "Restores account access and public bookability."}
            </p>
          </div>
          <Button
            variant={accountStatus === "ACTIVE" ? "destructive" : "outline"}
            className="gap-1.5"
            onClick={() => setSuspendDialogOpen(true)}
          >
            {accountStatus === "ACTIVE" ? (
              <Ban className="h-3.5 w-3.5" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            {accountStatus === "ACTIVE" ? "Suspend" : "Reactivate"}
          </Button>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-10 z-10 flex items-center justify-between border-t border-border bg-card px-6 py-3 shadow-[0_-1px_0_rgba(0,0,0,0.04)] sm:left-64">
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

      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {accountStatus === "ACTIVE"
                ? "Suspend this consultant?"
                : "Reactivate this consultant?"}
            </DialogTitle>
            <DialogDescription>
              {accountStatus === "ACTIVE"
                ? `${consultant.fullName} will be removed from public booking and their existing clients will be notified. This can be reversed at any time.`
                : `${consultant.fullName} will regain access to their account and become bookable again.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button
              variant={accountStatus === "ACTIVE" ? "destructive" : "default"}
              onClick={confirmStatusToggle}
            >
              {accountStatus === "ACTIVE" ? "Suspend" : "Reactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
