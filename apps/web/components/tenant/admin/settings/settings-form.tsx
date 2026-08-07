"use client";

import { useEffect, useState } from "react";
import { Building2, Clock, ShieldCheck, Copy, Check, Users } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/context";
import { useMe } from "@/lib/hooks/useMe";
import {
  getTenantAvailabilityDefaults,
  setTenantAvailabilityDefaults,
  updateConsultantProfile,
} from "@/lib/api/consultants.client";
import {
  getOwnTenantBilling,
  getOwnTenantProfile,
  updateOwnTenantProfile,
  type TenantBilling,
} from "@/lib/api/tenants.client";
import type { ConsultantProfile } from "@/lib/api/consultants.server";

// AvailabilitySlot dayOfWeek/startTime/endTime — schema §3.9: one recurring
// weekly window applied as the default for every consultant in the org.
const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

export function SettingsForm({ consultants }: { consultants: ConsultantProfile[] }) {
  const { user } = useAuth();
  const { me } = useMe();

  // Business Identity defaults — the tenant signup form (organization mode)
  // only ever collects displayName and the admin's email, so those are the
  // only two fields we can genuinely prefill from signup.
  const [companyName, setCompanyName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [savedAddress, setSavedAddress] = useState("");
  const [prefilledFromSignup, setPrefilledFromSignup] = useState(false);

  useEffect(() => {
    if (prefilledFromSignup) return;
    if (!me?.tenant?.displayName && !user?.email) return;
    if (me?.tenant?.displayName) setCompanyName(me.tenant.displayName);
    if (user?.email) setContactEmail(user.email);
    setPrefilledFromSignup(true);
  }, [me, user, prefilledFromSignup]);

  // Tenant Organization name, admin phone/email and this address are the
  // fields template-header.ts prepends to every sent message/form template
  // — address isn't part of GET /auth/me, so it's fetched separately.
  useEffect(() => {
    getOwnTenantProfile()
      .then((profile) => {
        setAddress(profile.address ?? "");
        setSavedAddress(profile.address ?? "");
      })
      .catch(() => {});
  }, []);

  const [feeEdits, setFeeEdits] = useState<Record<string, string>>(() =>
    Object.fromEntries(consultants.map((c) => [c.id, c.consultationFee]))
  );
  const [recurringDays, setRecurringDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [recurringStartTime, setRecurringStartTime] = useState("09:00");
  const [recurringEndTime, setRecurringEndTime] = useState("18:00");
  const [sessionDurationMins, setSessionDurationMins] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recurringError, setRecurringError] = useState<string | null>(null);
  const [billing, setBilling] = useState<TenantBilling | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    getOwnTenantBilling()
      .then(setBilling)
      .catch(() => setBilling(null));
  }, []);

  // Hydrate the recurring-hours fields from the tenant's saved defaults —
  // without this, sessionDurationMins (and the other fields) never reflect
  // what's actually persisted, so an unrelated later Save silently
  // overwrites a prior duration change back to the initial state above.
  useEffect(() => {
    getTenantAvailabilityDefaults()
      .then((defaults) => {
        if (defaults.length > 0) {
          setRecurringDays(defaults.map((d) => d.dayOfWeek).sort());
          setRecurringStartTime(defaults[0].startTime);
          setRecurringEndTime(defaults[0].endTime);
          setSessionDurationMins(defaults[0].slotDurationMins);
        } else {
          setSessionDurationMins(30);
        }
      })
      .catch(() => {
        setSessionDurationMins(30);
      })
      .finally(() => setHydrated(true));
  }, []);

  const tenantId = me?.tenantId ?? "";

  function withDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
    };
  }

  function handleFeeChange(id: string, fee: string) {
    setFeeEdits((prev) => ({ ...prev, [id]: fee }));
    setDirty(true);
  }

  function toggleRecurringDay(day: number) {
    setRecurringDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
    setDirty(true);
  }

  function handleCopyTenantId() {
    navigator.clipboard?.writeText(tenantId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDiscard() {
    setFeeEdits(Object.fromEntries(consultants.map((c) => [c.id, c.consultationFee])));
    if (me?.tenant?.displayName) setCompanyName(me.tenant.displayName);
    setAddress(savedAddress);
    setDirty(false);
  }

  // Persists the recurring weekly window as the tenant's default and applies
  // it to every consultant in the tenant server-side (backfilling anyone
  // missing it), and persists any edited consultation fees.
  async function handleSave() {
    if (sessionDurationMins === null) return;
    setSaving(true);
    setRecurringError(null);
    try {
      const feeUpdates = consultants
        .filter((c) => feeEdits[c.id] !== undefined && feeEdits[c.id] !== c.consultationFee)
        .map((c) => updateConsultantProfile(c.id, { consultationFee: Number(feeEdits[c.id]) }));

      const profileUpdates: Record<string, string> = {};
      if (companyName.trim() && companyName !== me?.tenant?.displayName) {
        profileUpdates.displayName = companyName.trim();
      }
      if (address !== savedAddress) profileUpdates.address = address;

      const results = await Promise.allSettled([
        ...feeUpdates,
        ...(Object.keys(profileUpdates).length > 0
          ? [
              updateOwnTenantProfile(profileUpdates).then((profile) => {
                setSavedAddress(profile.address ?? "");
              }),
            ]
          : []),
        setTenantAvailabilityDefaults(
          recurringDays.map((dayOfWeek) => ({
            dayOfWeek,
            startTime: recurringStartTime,
            endTime: recurringEndTime,
            slotDurationMins: sessionDurationMins,
          }))
        ),
      ]);
      const failures = results.filter((r) => r.status === "rejected").length;
      if (failures > 0) {
        setRecurringError(`${failures} of ${results.length} changes could not be saved.`);
      }
    } finally {
      setSaving(false);
      setDirty(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Card id="business-identity" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            Business Identity
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company-name">Company Name</Label>
            <Input
              id="company-name"
              value={companyName}
              onChange={(e) => withDirty(setCompanyName)(e.target.value)}
              placeholder={prefilledFromSignup ? undefined : "Loading…"}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact-email">Contact Email</Label>
            <Input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => withDirty(setContactEmail)(e.target.value)}
              placeholder={prefilledFromSignup ? undefined : "Loading…"}
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => withDirty(setAddress)(e.target.value)}
              placeholder="Organization mailing address"
              className="h-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card id="consultant-fees" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Consultant Fees
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {consultants.length === 0 && (
            <p className="text-sm text-muted-foreground">No consultants yet.</p>
          )}
          {consultants.map((consultant) => (
            <div
              key={consultant.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{consultant.fullName}</p>
                <p className="text-xs text-muted-foreground">{consultant.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  value={feeEdits[consultant.id] ?? consultant.consultationFee}
                  onChange={(e) => handleFeeChange(consultant.id, e.target.value)}
                  className="h-9 w-28"
                  aria-label={`${consultant.fullName} consultation fee`}
                />
                <Badge variant="outline">{consultant.currency}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card id="weekly-recurring-time" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Weekly Recurring Time
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            Applied as the default recurring availability window for every consultant in the
            organization.
          </p>
          {recurringError && <p className="text-xs text-destructive">{recurringError}</p>}
          <div className="flex flex-col gap-1.5">
            <Label>Days</Label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleRecurringDay(value)}
                  className={cn(
                    "h-9 w-14 rounded-lg border border-input text-xs font-semibold transition-colors",
                    recurringDays.includes(value)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recurring-start-time">Start Time</Label>
              <Input
                id="recurring-start-time"
                type="time"
                value={recurringStartTime}
                onChange={(e) => withDirty(setRecurringStartTime)(e.target.value)}
                className="h-9 max-w-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recurring-end-time">End Time</Label>
              <Input
                id="recurring-end-time"
                type="time"
                value={recurringEndTime}
                onChange={(e) => withDirty(setRecurringEndTime)(e.target.value)}
                className="h-9 max-w-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="session-duration">Session Duration (minutes)</Label>
              <Input
                id="session-duration"
                type="number"
                min={5}
                step={5}
                value={sessionDurationMins ?? ""}
                placeholder={hydrated ? undefined : "Loading…"}
                disabled={!hydrated}
                onChange={(e) =>
                  withDirty(setSessionDurationMins)(Math.max(5, Number(e.target.value) || 5))
                }
                className="h-9 max-w-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card id="platform-oversight" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Platform Oversight
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Tenant ID</Label>
            <div className="flex h-9 items-center justify-between gap-2 rounded-lg border border-input bg-muted/40 px-3">
              <span className="truncate text-sm text-muted-foreground">{tenantId}</span>
              <button
                type="button"
                onClick={handleCopyTenantId}
                aria-label="Copy tenant ID"
                className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Plan Tier</Label>
            <div className="flex h-9 items-center gap-2">
              <Badge className="bg-blue-600 text-white dark:bg-blue-500">
                {billing?.planName ?? "—"}
              </Badge>
              {billing && (
                <Badge
                  variant="outline"
                  className={cn(
                    billing.status === "ACTIVE"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                      : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                  )}
                >
                  {billing.status}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="fixed inset-x-0 bottom-10 z-10 flex items-center justify-between border-t border-border bg-card px-6 py-3 shadow-[0_-1px_0_rgba(0,0,0,0.04)] sm:left-64">
        <span className="text-xs text-muted-foreground">
          {dirty ? "You have unsaved changes." : "All changes are saved. Last synced 2m ago."}
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
          <Button
            type="button"
            size="sm"
            disabled={!dirty || saving || !hydrated}
            onClick={handleSave}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
