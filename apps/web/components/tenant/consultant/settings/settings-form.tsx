"use client";

import { useState } from "react";
import {
  BadgeCheck,
  BellRing,
  CalendarClock,
  CalendarOff,
  Check,
  Copy,
  FileText,
  Link2,
  Lock,
  UploadCloud,
  UserRound,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";

// Consultant-scoped settings only (PRD §1.1 role matrix + Phase 3).
// Branding, currency, payouts, booking cutoff and staff are TENANT_ADMIN-owned.
const CATEGORIES = [
  "Medical",
  "Legal",
  "IT",
  "Physio",
  "Homeopathy",
  "Astrology",
] as const;

const LANGUAGES = ["English", "Hindi", "Telugu", "Tamil", "Kannada", "Marathi"];

const SESSION_DURATIONS = ["30", "45", "60", "90"] as const;
const BUFFERS = ["0", "5", "10", "15", "30"] as const;

const licenses = [
  { name: "Medical_License_MCI_2024.pdf", status: "Verified" as const },
  { name: "PG_Diploma_Homeopathy.pdf", status: "Pending review" as const },
];

export function ConsultantSettingsForm() {
  // Public profile — PRD Phase 3: photo, bio, fee, languages, Accept Bookings
  const [displayName, setDisplayName] = useState("Dr. Advik Advik");
  const [category, setCategory] = useState<string>("Homeopathy");
  const [specialization, setSpecialization] = useState("Classical Homeopathy, Chronic Care");
  const [bio, setBio] = useState(
    "Homeopathy practitioner with 12 years of experience in chronic and lifestyle conditions."
  );
  const [sessionFee, setSessionFee] = useState("1200");
  const [languages, setLanguages] = useState<string[]>(["English", "Hindi"]);
  const [acceptBookings, setAcceptBookings] = useState(true);

  // Availability defaults — full slot editor lives in Calendar
  const [sessionDuration, setSessionDuration] = useState<string>("45");
  const [bufferBefore, setBufferBefore] = useState<string>("5");
  const [bufferAfter, setBufferAfter] = useState<string>("10");

  // Out of office — PRD OutOfOfficePeriod
  const [oooEnabled, setOooEnabled] = useState(false);
  const [oooStart, setOooStart] = useState("");
  const [oooEnd, setOooEnd] = useState("");
  const [oooMessage, setOooMessage] = useState(
    "I'm currently out of office and will reply when I'm back. For urgent matters, please contact the clinic."
  );
  const [oooPauseBookings, setOooPauseBookings] = useState(true);

  // Calendar sync — outbound .ics feed (everyday-life feature #5)
  const [icsEnabled, setIcsEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const icsUrl = "https://ayushman.app/api/ics/con_7ZK1-ADVIK/feed.ics";

  // Personal preferences — PRD profile/settings page (feature #10, #12)
  const [joinReminder, setJoinReminder] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<string>("English");

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  function withDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
    };
  }

  function toggleLanguage(language: string) {
    setLanguages((prev) =>
      prev.includes(language)
        ? prev.filter((item) => item !== language)
        : [...prev, language]
    );
    setDirty(true);
  }

  function handleCopyIcs() {
    navigator.clipboard?.writeText(icsUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDiscard() {
    setDirty(false);
  }

  function handleSave() {
    setSaving(true);
    // PATCH /api/consultants/:consultantId/settings — apps/api owns persistence
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
    }, 600);
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
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Profile Photo</Label>
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 text-center transition-colors hover:bg-muted/60">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Upload Photo</span>
              <span className="text-[11px] text-muted-foreground">
                Square JPG or PNG. Shown on your public booking page.
              </span>
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </div>
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
                  <SelectItem key={item} value={item}>
                    {item}
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
            <Label htmlFor="session-fee">Session Fee (INR)</Label>
            <Input
              id="session-fee"
              type="number"
              min={0}
              value={sessionFee}
              onChange={(e) => withDirty(setSessionFee)(e.target.value)}
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              Currency is set by your workspace admin.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
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
                When off, your profile stays visible but clients can&apos;t book new
                appointments. Your admin can override this.
              </p>
            </div>
            <Switch checked={acceptBookings} onCheckedChange={withDirty(setAcceptBookings)} />
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
          {licenses.map((license) => (
            <div
              key={license.name}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm text-foreground">{license.name}</span>
              </span>
              <Badge
                variant="outline"
                className={cn(
                  license.status === "Verified"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                )}
              >
                {license.status}
              </Badge>
            </div>
          ))}
          <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input bg-muted/40 text-center transition-colors hover:bg-muted/60">
            <UploadCloud className="h-5 w-5 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Upload license or degree</span>
            <span className="text-[11px] text-muted-foreground">
              PDF only. Name the file clearly — it appears on your public profile after admin review.
            </span>
            <input type="file" accept="application/pdf" className="hidden" />
          </label>
        </CardContent>
      </Card>

      <Card id="availability-defaults" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Availability Defaults
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label>Session Duration</Label>
            <Select
              value={sessionDuration}
              onValueChange={(value) => value && withDirty(setSessionDuration)(value)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_DURATIONS.map((minutes) => (
                  <SelectItem key={minutes} value={minutes}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Buffer Before</Label>
            <Select
              value={bufferBefore}
              onValueChange={(value) => value && withDirty(setBufferBefore)(value)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUFFERS.map((minutes) => (
                  <SelectItem key={minutes} value={minutes}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Buffer After</Label>
            <Select
              value={bufferAfter}
              onValueChange={(value) => value && withDirty(setBufferAfter)(value)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUFFERS.map((minutes) => (
                  <SelectItem key={minutes} value={minutes}>
                    {minutes} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            Weekly slots and date overrides are managed in your Calendar. Booking
            cutoff and auto-approval are workspace policies set by your admin.
          </p>
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
              <Switch
                checked={oooPauseBookings}
                onCheckedChange={withDirty(setOooPauseBookings)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="calendar-sync" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Link2 className="h-3.5 w-3.5" />
            Calendar Sync
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Publish .ics feed</p>
              <p className="text-xs text-muted-foreground">
                One-way feed of your Ayushman appointments for Google Calendar or Outlook.
              </p>
            </div>
            <Switch checked={icsEnabled} onCheckedChange={withDirty(setIcsEnabled)} />
          </div>
          {icsEnabled && (
            <div className="flex flex-col gap-1.5">
              <Label>Feed URL</Label>
              <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3">
                <span className="truncate text-sm text-muted-foreground">{icsUrl}</span>
                <button
                  type="button"
                  onClick={handleCopyIcs}
                  aria-label="Copy feed URL"
                  className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Anyone with this link can see your appointment times. Keep it private.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="preferences" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <BellRing className="h-3.5 w-3.5" />
            Notifications &amp; Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Session join reminder</p>
              <p className="text-xs text-muted-foreground">
                Push notification ~10 minutes before an appointment with the video link.
              </p>
            </div>
            <Switch checked={joinReminder} onCheckedChange={withDirty(setJoinReminder)} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Email notifications</p>
              <p className="text-xs text-muted-foreground">
                Booking requests, cancellations and client messages.
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={withDirty(setEmailNotifications)}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">SMS notifications</p>
              <p className="text-xs text-muted-foreground">
                Same events over SMS for when you&apos;re away from the dashboard.
              </p>
            </div>
            <Switch
              checked={smsNotifications}
              onCheckedChange={withDirty(setSmsNotifications)}
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:max-w-xs">
            <Label>Interface Language</Label>
            <Select
              value={uiLanguage}
              onValueChange={(value) => value && withDirty(setUiLanguage)(value)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((language) => (
                  <SelectItem key={language} value={language}>
                    {language}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Branding, currency, payout account, booking cutoff window, auto-approval
          and staff management are workspace-wide settings owned by your Tenant
          Admin. Contact them to request changes.
        </p>
      </div>

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
