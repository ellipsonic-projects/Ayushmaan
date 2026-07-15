"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { X, UserPlus } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
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
  createConsultant,
  updateConsultantProfile,
  updateUserPhone,
} from "@/lib/api/consultants.client";

// consultant_category enum — schema_ayushman_v3.md §3.8
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

export function ConsultantOnboardingForm() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("");
  const [subSpecialization, setSubSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [languages, setLanguages] = useState<string[]>(["English"]);
  const [isAcceptingNewClients, setIsAcceptingNewClients] = useState(true);
  const [autoApproveBookings, setAutoApproveBookings] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    category.length > 0 &&
    consultationFee.trim().length > 0 &&
    languages.length > 0;

  function addLanguage(language: string | null) {
    if (!language) return;
    setLanguages((prev) => (prev.includes(language) ? prev : [...prev, language]));
  }

  function removeLanguage(language: string) {
    setLanguages((prev) => prev.filter((l) => l !== language));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // POST /api/tenants/:tenantId/consultants creates the auth.users +
      // public.users(role=CONSULTANT) + consultant_profiles rows, but only
      // accepts email/fullName/category (createConsultantSchema is
      // `.strict()`) — the rest is filled in via a follow-up PATCH.
      const created = await createConsultant({
        email: email.trim(),
        fullName: fullName.trim(),
        category,
      });

      await updateConsultantProfile(created.consultantProfile.id, {
        subSpecialization: subSpecialization.trim() || undefined,
        bio: bio.trim() || undefined,
        consultationFee: Number(consultationFee),
        currency,
        languagesSpoken: languages,
        isAcceptingNewClients,
        autoApproveBookings,
      });

      if (phone.trim()) {
        await updateUserPhone(created.id, phone.trim());
      }

      router.push(`/tenant/admin/consultants`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to onboard consultant");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            1. Account Details
          </CardTitle>
          <CardDescription>
            Used to create their login — an invite is sent to this email.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full-name">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full-name"
              placeholder="Aditi Rao"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-9"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="aditi.rao@practice.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-9"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="phone">Phone</Label>
            <PhoneInput
              id="phone"
              placeholder="98765 43210"
              value={phone}
              onChange={(value) => setPhone(value ?? "")}
              className="sm:w-1/2"
              inputClassName="h-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            2. Professional Profile
          </CardTitle>
          <CardDescription>
            Shown on their public booking profile and used to route client matches.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>
                Category <span className="text-destructive">*</span>
              </Label>
              <Select value={category} onValueChange={(value) => setCategory(value ?? "")}>
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
              <Label htmlFor="sub-specialization">Sub-specialization</Label>
              <Input
                id="sub-specialization"
                placeholder="e.g. Cardiology, Family Law"
                value={subSpecialization}
                onChange={(e) => setSubSpecialization(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bio">Bio</Label>
            <textarea
              id="bio"
              placeholder="Short professional summary shown on their public profile..."
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="consultation-fee">
                Consultation Fee <span className="text-destructive">*</span>
              </Label>
              <Input
                id="consultation-fee"
                type="number"
                min={0}
                step="0.01"
                placeholder="1500.00"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                className="h-9"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>
                Currency <span className="text-destructive">*</span>
              </Label>
              <Select value={currency} onValueChange={(value) => setCurrency(value ?? "")}>
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
            <Label>
              Languages Spoken <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              {languages.map((language) => (
                <Badge key={language} variant="secondary" className="gap-1 py-1">
                  {language}
                  <button type="button" onClick={() => removeLanguage(language)} className="ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Select onValueChange={addLanguage}>
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
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            3. Booking Settings
          </CardTitle>
          <CardDescription>
            Can be changed later from the consultant&apos;s own profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="accepting-clients" className="text-sm font-medium text-foreground">
                Accepting New Clients
              </Label>
              <p className="text-xs text-muted-foreground">
                Controls whether they appear as bookable on the public site.
              </p>
            </div>
            <Switch
              id="accepting-clients"
              checked={isAcceptingNewClients}
              onCheckedChange={setIsAcceptingNewClients}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="auto-approve" className="text-sm font-medium text-foreground">
                Auto-Approve Bookings
              </Label>
              <p className="text-xs text-muted-foreground">
                Overrides the tenant-wide default for this consultant only.
              </p>
            </div>
            <Switch
              id="auto-approve"
              checked={autoApproveBookings}
              onCheckedChange={setAutoApproveBookings}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={!isValid || submitting} className="gap-1.5">
          <UserPlus className="h-4 w-4" />
          {submitting ? "Sending Invite..." : "Invite Consultant"}
        </Button>
      </div>
    </form>
  );
}
