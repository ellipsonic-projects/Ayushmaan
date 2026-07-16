"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxLoadingIcon,
  ComboboxClear,
  ComboboxContent,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
} from "@/components/ui/combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  searchTenants,
  createAppointmentForCase,
  requestAppointmentWithTenant,
  type TenantSearchResult,
} from "@/lib/api/organizations.client";
import type { OwnClientProfile } from "@/lib/api/clients.server";

const APPOINTMENT_DURATION_MINUTES = 45;
const BOOKING_FEE = 500;
const SEARCH_DEBOUNCE_MS = 200;

function highlightMatch(text: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const index = text.toLowerCase().indexOf(trimmed.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <span className="text-primary">{text.slice(index, index + trimmed.length)}</span>
      {text.slice(index + trimmed.length)}
    </>
  );
}

const timeSlots = [
  "09:00 AM",
  "09:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:30 AM",
  "01:00 PM",
  "02:30 PM",
  "03:00 PM",
  "04:00 PM",
  "04:30 PM",
];

const steps = [
  { id: 1, label: "Organization" },
  { id: 2, label: "Payment" },
  { id: 3, label: "Select a Slot" },
  { id: 4, label: "Appointment Details" },
  { id: 5, label: "Confirm" },
];

const CATEGORY_OPTIONS = [
  { value: "MEDICAL", label: "Medical" },
  { value: "LEGAL", label: "Legal" },
  { value: "IT", label: "IT" },
  { value: "PHYSIOTHERAPY", label: "Physiotherapy" },
  { value: "HOMEOPATHY", label: "Homeopathy" },
  { value: "ASTROLOGY", label: "Astrology" },
];

function combineDateAndTime(date: Date, time: string): Date {
  const [hourMinute, meridiem] = time.split(" ");
  let [hours, minutes] = hourMinute.split(":").map(Number);
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export function BookAppointmentFlow({ client }: { client: OwnClientProfile | null }) {
  const [step, setStep] = useState(1);

  const [orgQuery, setOrgQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TenantSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<TenantSearchResult | null>(null);

  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string | null>(null);

  const [caseId, setCaseId] = useState("");
  const [category, setCategory] = useState("");
  const [requirements, setRequirements] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  // A case only reaches ACTIVE once a TENANT_ADMIN assigns a consultant to it
  // (see POST /cases/:caseId/assign-consultant) — PENDING_ASSIGNMENT cases
  // still have a null consultant, so this doubles as the type-safe narrowing
  // for the `.consultant.fullName` accesses below.
  const activeCases = useMemo(
    () =>
      (client?.cases ?? []).filter(
        (c): c is typeof c & { consultant: NonNullable<typeof c.consultant> } =>
          c.status === "ACTIVE" && c.consultant !== null
      ),
    [client]
  );

  // Organization search is platform-wide (GET /clients/tenants) — a client
  // can book with any active organization, not just ones they already have a
  // case with. Debounced so every keystroke doesn't fire a request. An empty
  // query returns the platform's default org list, so the dropdown has
  // options before the user types anything.
  useEffect(() => {
    setIsSearching(true);
    const handle = setTimeout(() => {
      searchTenants(orgQuery)
        .then(setSearchResults)
        .catch(() => setSearchResults([]))
        .finally(() => setIsSearching(false));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [orgQuery]);

  // Clients never browse individual consultants — if they already have an
  // active case with the selected org, follow up with a known consultant
  // (fast path); otherwise this becomes a blind request the org's
  // TENANT_ADMIN assigns a consultant to.
  const casesForOrg = useMemo(
    () => (selectedOrg ? activeCases.filter((c) => c.tenantId === selectedOrg.id) : []),
    [activeCases, selectedOrg]
  );
  const hasExistingCase = casesForOrg.length > 0;

  const selectedCase = useMemo(
    () => casesForOrg.find((c) => c.id === caseId) ?? null,
    [casesForOrg, caseId]
  );

  const canContinue =
    (step === 1 && !!selectedOrg) ||
    (step === 2 && paid) ||
    (step === 3 && !!date && !!time) ||
    (step === 4 && (hasExistingCase ? !!caseId : !!category));

  function handleStripePayment() {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaid(true);
    }, 1200);
  }

  async function handleConfirm() {
    if (!selectedOrg || !date || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      const scheduledStart = combineDateAndTime(date, time);
      const scheduledEnd = new Date(
        scheduledStart.getTime() + APPOINTMENT_DURATION_MINUTES * 60_000
      );

      if (hasExistingCase) {
        if (!selectedCase) return;
        await createAppointmentForCase(selectedOrg.id, selectedOrg.slug, selectedCase.id, {
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          meetingLink: meetingLink || undefined,
        });
      } else {
        await requestAppointmentWithTenant(selectedOrg.id, selectedOrg.slug, {
          category,
          requirements: requirements || undefined,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          meetingLink: meetingLink || undefined,
        });
      }
      setBooked(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (step < 5) setStep((s) => s + 1);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  if (!client) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center text-sm text-muted-foreground">
        Unable to load your profile. Please refresh or sign in again.
      </div>
    );
  }

  if (booked && selectedOrg) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="text-2xl font-bold text-foreground">
          {hasExistingCase && selectedCase ? "Appointment booked" : "Request sent"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasExistingCase && selectedCase ? (
            <>
              Your session with {selectedCase.consultant.fullName} is confirmed for{" "}
              {date?.toLocaleDateString(undefined, {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}{" "}
              at {time}.
            </>
          ) : (
            <>
              Your request has been sent to {selectedOrg.displayName}. Their team will assign a
              consultant and confirm your session shortly.
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/client/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/client/dashboard"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <h2 className="text-2xl font-bold text-foreground">Book Appointment</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Find your organization, pick a time and confirm your session
        </p>
      </div>

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step > s.id
                    ? "bg-primary text-primary-foreground"
                    : step === s.id
                      ? "bg-primary/10 text-primary ring-1 ring-primary"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  step >= s.id ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("h-px flex-1", step > s.id ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Find your organization</CardTitle>
            <CardDescription>Search for the practice you&apos;d like to book with</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Combobox<TenantSearchResult>
              items={searchResults}
              value={selectedOrg}
              onValueChange={(org) => {
                setSelectedOrg(org);
                setCaseId("");
              }}
              inputValue={orgQuery}
              onInputValueChange={(value) => setOrgQuery(value)}
              itemToStringLabel={(org) => org.displayName}
              isItemEqualToValue={(item, value) => item.id === value.id}
              filter={null}
            >
              <ComboboxInputGroup>
                <ComboboxInput placeholder="Search organizations by name…" autoComplete="off" />
                <ComboboxLoadingIcon loading={isSearching} />
                {!isSearching && <ComboboxClear />}
              </ComboboxInputGroup>
              <ComboboxContent>
                <ComboboxEmpty>
                  {isSearching
                    ? "Searching…"
                    : orgQuery.trim()
                      ? `No organizations match "${orgQuery}".`
                      : "No organizations available."}
                </ComboboxEmpty>
                <ComboboxList>
                  {(org: TenantSearchResult) => (
                    <ComboboxItem key={org.id} value={org}>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 truncate font-medium text-foreground">
                        {highlightMatch(org.displayName, orgQuery)}
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>

            {selectedOrg && (
              <Card className="border-primary ring-1 ring-primary">
                <CardContent className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 leading-tight">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {selectedOrg.displayName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {hasExistingCase ? "Your organization" : "New organization"}
                    </p>
                  </div>
                  <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-primary" />
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>Consultation booking fee, paid securely via Stripe</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">Booking fee</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                ₹{BOOKING_FEE.toLocaleString("en-IN")}
              </span>
            </div>

            {paid ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-primary">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Payment successful — you&apos;re ready to continue.
              </div>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={handleStripePayment}
                  disabled={paying}
                  className="gap-2 bg-[#635BFF] text-white hover:bg-[#635BFF]/90"
                >
                  {paying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  {paying
                    ? "Processing payment…"
                    : `Pay ₹${BOOKING_FEE.toLocaleString("en-IN")} with Stripe`}
                </Button>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Payments are securely processed by Stripe. Your card details are never stored on
                  our servers.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a date &amp; time</CardTitle>
            <CardDescription>
              Sessions run for {APPOINTMENT_DURATION_MINUTES} minutes
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:gap-8">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={{ before: new Date() }}
              className="rounded-lg border border-border"
            />
            <div className="flex-1">
              <p className="mb-2 text-sm font-medium text-foreground">Available slots</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {timeSlots.map((slot) => (
                  <Button
                    key={slot}
                    type="button"
                    variant={time === slot ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTime(slot)}
                  >
                    {slot}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Appointment details</CardTitle>
            <CardDescription>
              {hasExistingCase
                ? "Choose which consultant and case this session is for"
                : "Tell the organization what you need help with"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {hasExistingCase ? (
              <div className="flex flex-col gap-1.5">
                <Label>Consultant &amp; case</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {casesForOrg.map((c) => {
                    const selected = caseId === c.id;
                    return (
                      <Card
                        key={c.id}
                        onClick={() => setCaseId(c.id)}
                        className={cn(
                          "cursor-pointer transition-colors hover:border-primary/50",
                          selected && "border-primary ring-1 ring-primary"
                        )}
                      >
                        <CardContent className="flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {c.consultant.fullName}
                            </p>
                            {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {c.consultant.category}
                            {c.matterKey ? ` · ${c.matterKey}` : ""}
                          </p>
                          <Badge variant="outline" className="w-fit">
                            {c.consultant.currency} {c.consultant.consultationFee}
                          </Badge>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label>What do you need help with?</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value ?? "")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="requirements">Details (optional)</Label>
                  <Textarea
                    id="requirements"
                    placeholder="Briefly describe what you need help with…"
                    value={requirements}
                    onChange={(e) => setRequirements(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedOrg?.displayName} doesn&apos;t have any consultant assigned to you yet —
                  their team will review your request and assign one.
                </p>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meetingLink">Meeting link (optional)</Label>
              <Input
                id="meetingLink"
                type="url"
                placeholder="https://meet.example.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && selectedOrg && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm your appointment</CardTitle>
            <CardDescription>Review the details before booking</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-foreground">
                  {hasExistingCase && selectedCase
                    ? selectedCase.consultant.fullName
                    : selectedOrg.displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {hasExistingCase && selectedCase
                    ? `${selectedCase.consultant.category} · ${selectedOrg.displayName}`
                    : "A consultant will be assigned by the organization"}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                {date?.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {time} ({APPOINTMENT_DURATION_MINUTES} min)
              </div>
            </div>

            {meetingLink && (
              <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                Meeting link: {meetingLink}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={goBack}
          disabled={step === 1}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        {step === 5 ? (
          <Button type="button" onClick={handleConfirm} disabled={submitting} className="gap-1.5">
            {submitting ? "Booking…" : "Confirm & Book"}
          </Button>
        ) : (
          <Button type="button" onClick={goNext} disabled={!canContinue} className="gap-1.5">
            Continue
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
