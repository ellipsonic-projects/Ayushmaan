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
  Loader2,
  Paperclip,
  Star,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  searchConsultants,
  createAppointmentForCase,
  createAppointmentSeriesForCase,
  requestAppointmentWithTenant,
  getConsultantAvailability,
  type ConsultantSearchResult,
  type OpenAvailabilitySlot,
  type AppointmentSeriesOccurrence,
} from "@/lib/api/organizations.client";
import {
  requestDocumentUploadUrl,
  uploadClientDocumentFile,
  createClientDocument,
} from "@/lib/api/client-documents.client";
import { Switch } from "@/components/ui/switch";
import type { OwnClientProfile } from "@/lib/api/clients.server";
import { CATEGORY_OPTIONS } from "@/lib/categories";

// Statuses that count as "the client already has a session with this
// consultant on this day" — matches booking.service.ts's
// assertNoSameDayAppointmentWithConsultant, which the backend enforces
// regardless of this UI check.
const SAME_DAY_BLOCKING_STATUSES = new Set(["REQUESTED", "ADMIN_APPROVED", "APPROVED"]);

// Availability `dateKey`s are UTC calendar-day strings (server treats slot
// times as literal digits, not real-timezone-shifted). `date` here comes
// from the local-midnight `Date` the calendar picker selects, so we must key
// off its local Y/M/D components — `.toISOString()` would shift the day for
// any positive UTC offset (e.g. Asia/Kolkata) and miss the server's slots.
function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const steps = [
  { id: 1, label: "Field" },
  { id: 2, label: "Consultant" },
  { id: 3, label: "Requirements" },
  { id: 4, label: "Select a Slot" },
  { id: 5, label: "Confirm" },
];

// `start` is the absolute instant generateDiscreteAvailability computed
// (consultants.router.ts), built from the template's Time-column
// hour/minute read via UTC getters — always read it back the same way here.
function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  const hours24 = d.getUTCHours();
  const minutes = d.getUTCMinutes();
  const meridiem = hours24 >= 12 ? "PM" : "AM";
  const hours = hours24 % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${meridiem}`;
}

function to24Hour(time: string): { hours: number; minutes: number } {
  const [hourMinute, meridiem] = time.split(" ");
  const [hourStr, minuteStr] = hourMinute.split(":");
  let hours = Number(hourStr);
  const minutes = Number(minuteStr);
  if (meridiem === "PM" && hours !== 12) hours += 12;
  if (meridiem === "AM" && hours === 12) hours = 0;
  return { hours, minutes };
}

function combineDateAndTime(date: Date, time: string): Date {
  const { hours, minutes } = to24Hour(time);
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
}

export function BookAppointmentFlow({
  client,
  initialCategory,
}: {
  client: OwnClientProfile | null;
  initialCategory?: string;
}) {
  // A "Follow up" link from the relationships page pre-selects the field so
  // the fast path (existing case -> known org/consultant) resolves
  // immediately, skipping the field-selection step entirely.
  const validInitialCategory = CATEGORY_OPTIONS.some((o) => o.value === initialCategory)
    ? initialCategory!
    : "";
  const [step, setStep] = useState(validInitialCategory ? 2 : 1);

  const [consultants, setConsultants] = useState<ConsultantSearchResult[]>([]);
  const [consultantsLoading, setConsultantsLoading] = useState(false);
  const [consultantsError, setConsultantsError] = useState<string | null>(null);
  const [selectedConsultantId, setSelectedConsultantId] = useState("");

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string | null>(null);
  const [selectedDurationMins, setSelectedDurationMins] = useState(45);
  // The picked slot's server-computed absolute start (ISO) — used at confirm
  // time instead of re-deriving from date+time label, since `time` is a
  // formatted-for-display UTC label while combineDateAndTime builds a new
  // Date via local setHours; reusing the exact instant the server already
  // validated (cutoff + conflict checked in generateDiscreteAvailability)
  // avoids booking a different instant than the one shown as available.
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(null);

  const [slots, setSlots] = useState<OpenAvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [caseId, setCaseId] = useState("");
  const [category, setCategory] = useState(validInitialCategory);
  const [requirementsSubject, setRequirementsSubject] = useState("");
  const [requirements, setRequirements] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  // Recurring weekly series (Sprint 3.3) — only offered on the fast path
  // where a real consultant/availability is known, since a blind request has
  // no consultant to expand a recurrenceRule against yet.
  const [isRecurring, setIsRecurring] = useState(false);
  const [occurrenceCount, setOccurrenceCount] = useState(4);
  const [seriesOccurrences, setSeriesOccurrences] = useState<AppointmentSeriesOccurrence[]>([]);

  // "Book for" — the caller's own profile, or a consented guardian_links
  // dependent (client.dependents). Every downstream step reads whichever
  // profile is currently selected instead of `client` directly.
  const bookingProfiles = useMemo(() => {
    if (!client) return [];
    return [
      { id: client.id, fullName: client.fullName, cases: client.cases },
      ...(client.dependents ?? []).map((d) => ({ id: d.id, fullName: d.fullName, cases: d.cases })),
    ];
  }, [client]);
  const [bookingForId, setBookingForId] = useState("");
  useEffect(() => {
    if (client && !bookingForId) setBookingForId(client.id);
  }, [client, bookingForId]);
  const bookingFor =
    bookingProfiles.find((p) => p.id === bookingForId) ?? bookingProfiles[0] ?? null;
  const isBookingForSelf = !client || bookingFor?.id === client.id;

  // Consultants the current bookingFor profile already has a
  // pending/approved appointment with on the currently selected date — the
  // backend rejects a second booking against these (409
  // SAME_DAY_APPOINTMENT_EXISTS), so the picker greys them out upfront
  // instead of letting the client hit that error at step 5.
  const blockedConsultantIdsForDate = useMemo(() => {
    const blocked = new Set<string>();
    if (!date || !bookingFor) return blocked;
    const dateKey = toLocalDateKey(date);
    for (const c of bookingFor.cases) {
      if (!c.consultant) continue;
      const hasBlockingAppointment = c.appointments.some(
        (a) =>
          SAME_DAY_BLOCKING_STATUSES.has(a.status) &&
          new Date(a.scheduledStart).toISOString().slice(0, 10) === dateKey
      );
      if (hasBlockingAppointment) blocked.add(c.consultant.id);
    }
    return blocked;
  }, [date, bookingFor]);

  // A case only reaches ACTIVE once a consultant claims it (or a TENANT_ADMIN
  // assigns one) — PENDING_ASSIGNMENT cases still have a null consultant, so
  // this doubles as the type-safe narrowing for the `.consultant.fullName`
  // accesses below.
  const activeCases = useMemo(
    () =>
      (bookingFor?.cases ?? []).filter(
        (c): c is typeof c & { consultant: NonNullable<typeof c.consultant> } =>
          c.status === "ACTIVE" && c.consultant !== null
      ),
    [bookingFor]
  );

  // The client picks a specific consultant directly (across every tenant
  // serving this field) rather than the flow auto-matching an organization —
  // that pick doubles as the organization pick, since a consultant belongs to
  // exactly one tenant.
  useEffect(() => {
    if (!category) {
      setConsultants([]);
      setConsultantsError(null);
      return;
    }
    let cancelled = false;
    setConsultantsLoading(true);
    setConsultantsError(null);
    searchConsultants(category)
      .then((results) => {
        if (cancelled) return;
        setConsultants(results);
        if (results.length === 0) {
          setConsultantsError("No consultants are currently available in this field.");
        }
      })
      .catch(() => {
        if (!cancelled) setConsultantsError("Failed to load consultants. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setConsultantsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  const selectedConsultant = useMemo(
    () => consultants.find((c) => c.id === selectedConsultantId) ?? null,
    [consultants, selectedConsultantId]
  );
  const selectedOrg = useMemo(
    () =>
      selectedConsultant
        ? {
            id: selectedConsultant.tenantId,
            slug: selectedConsultant.tenantSlug,
            displayName: selectedConsultant.tenantDisplayName,
            logoUrl: null as string | null,
          }
        : null,
    [selectedConsultant]
  );

  function handleSelectConsultant(id: string) {
    setSelectedConsultantId(id);
    setCaseId("");
  }

  // Case.category is a snapshot taken when the case was created — re-check
  // against the consultant's current category so a case whose consultant
  // was later recategorized can't hijack this match for a field they no
  // longer practice in. Scoped to the specific consultant the client picked
  // above — a client can still have more than one ACTIVE case with the same
  // consultant via distinct matterKeys (schema §3.11), hence a filter rather
  // than a single find.
  const casesForOrg = useMemo(
    () =>
      selectedConsultant
        ? activeCases.filter(
            (c) =>
              c.consultant.id === selectedConsultant.id &&
              c.category === category &&
              c.consultant.category === category
          )
        : [],
    [activeCases, selectedConsultant, category]
  );
  const hasExistingCase = casesForOrg.length > 0;

  // Only one matching case — no need to make the client click it in step 3.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (casesForOrg.length === 1) setCaseId(casesForOrg[0].id);
  }, [casesForOrg]);

  const selectedCase = useMemo(
    () => casesForOrg.find((c) => c.id === caseId) ?? null,
    [casesForOrg, caseId]
  );

  // Real availability_slots for the picked consultant — the consultant is
  // always known upfront now (step 2), so this always runs by the time the
  // client reaches step 4. Resets time whenever the consultant changes.
  useEffect(() => {
    if (!selectedConsultant) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSlotsLoading(true);
    setTime(null);
    setSelectedSlotStart(null);
    getConsultantAvailability(
      selectedConsultant.tenantId,
      selectedConsultant.tenantSlug,
      selectedConsultant.id
    )
      .then((data) => {
        if (!cancelled) setSlots(data);
      })
      .catch(() => {
        if (!cancelled) setSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
      setSlots([]);
    };
  }, [selectedConsultant]);

  // `slots` already holds one entry per discrete bookable instant for this
  // consultant (server-expanded, cutoff- and conflict-filtered) — just pick
  // the ones matching the calendar date selected in step 4.
  const availableTimesForDate = useMemo(() => {
    if (!date) return [];
    const dateKey = toLocalDateKey(date);
    return slots
      .filter((slot) => slot.dateKey === dateKey)
      .map((slot) => ({
        time: formatSlotTime(slot.start),
        durationMins: slot.durationMins,
        start: slot.start,
      }));
  }, [slots, date]);

  const canContinue =
    (step === 1 && !!category) ||
    (step === 2 &&
      !!selectedConsultantId &&
      !blockedConsultantIdsForDate.has(selectedConsultantId)) ||
    (step === 3 && (hasExistingCase ? !!caseId : true)) ||
    (step === 4 &&
      !!date &&
      !!time &&
      !(selectedConsultant && blockedConsultantIdsForDate.has(selectedConsultant.id)));

  // Uploaded once the case a document should attach to actually exists —
  // either a pre-existing case (fast path) or the one just created by the
  // blind request path below.
  async function uploadAttachedFiles(tenantId: string, tenantSlug: string, targetCaseId: string) {
    for (const file of attachedFiles) {
      const { path, token } = await requestDocumentUploadUrl(
        tenantId,
        tenantSlug,
        targetCaseId,
        file.name
      );
      await uploadClientDocumentFile(path, token, file);
      await createClientDocument(tenantId, tenantSlug, targetCaseId, {
        fileName: file.name,
        storagePath: path,
      });
    }
  }

  function handleBookingForChange(id: string) {
    setBookingForId(id);
    setCaseId("");
  }

  async function handleConfirm() {
    if (!selectedOrg || !date || !time) return;
    setSubmitting(true);
    setError(null);
    try {
      // Prefer the picked slot's server-validated absolute instant over
      // re-deriving it from the date+time label (see selectedSlotStart's
      // definition) — falls back to the old derivation if a slot wasn't
      // picked from the list for some reason (e.g. recurring-series flow
      // below computes its own recurrence rule independently anyway).
      const scheduledStart = selectedSlotStart
        ? new Date(selectedSlotStart)
        : combineDateAndTime(date, time);
      const scheduledEnd = new Date(scheduledStart.getTime() + selectedDurationMins * 60_000);

      if (hasExistingCase) {
        if (!selectedCase) return;
        if (isRecurring) {
          const { hours, minutes } = to24Hour(time);
          const result = await createAppointmentSeriesForCase(
            selectedOrg.id,
            selectedOrg.slug,
            selectedCase.id,
            {
              recurrenceRule: {
                dayOfWeek: date.getDay(),
                startTime: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
                durationMins: selectedDurationMins,
                startDate: scheduledStart.toISOString().slice(0, 10),
                occurrenceCount,
              },
            }
          );
          setSeriesOccurrences(result.appointments);
        } else {
          await createAppointmentForCase(selectedOrg.id, selectedOrg.slug, selectedCase.id, {
            scheduledStart: scheduledStart.toISOString(),
            scheduledEnd: scheduledEnd.toISOString(),
            meetingLink: meetingLink || undefined,
          });
        }
        if (attachedFiles.length > 0) {
          await uploadAttachedFiles(selectedOrg.id, selectedOrg.slug, selectedCase.id);
        }
      } else {
        const result = await requestAppointmentWithTenant(selectedOrg.id, selectedOrg.slug, {
          category,
          consultantId: selectedConsultantId,
          requirementsSubject: requirementsSubject || undefined,
          requirements: requirements || undefined,
          scheduledStart: scheduledStart.toISOString(),
          scheduledEnd: scheduledEnd.toISOString(),
          meetingLink: meetingLink || undefined,
          onBehalfOfClientId: isBookingForSelf ? undefined : (bookingFor?.id ?? undefined),
        });
        if (attachedFiles.length > 0) {
          await uploadAttachedFiles(selectedOrg.id, selectedOrg.slug, result.case.id);
        }
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
          {hasExistingCase && selectedCase
            ? isRecurring
              ? "Recurring series booked"
              : "Appointment booked"
            : "Request sent"}
        </h2>
        <p className="text-sm text-muted-foreground">
          {hasExistingCase && selectedCase ? (
            isRecurring ? (
              <>
                {isBookingForSelf ? "Your" : `${bookingFor?.fullName}'s`} weekly sessions with{" "}
                {selectedCase.consultant.fullName} are set up — {seriesOccurrences.length} session
                {seriesOccurrences.length === 1 ? "" : "s"} scheduled.
              </>
            ) : (
              <>
                {isBookingForSelf ? "Your" : `${bookingFor?.fullName}'s`} session with{" "}
                {selectedCase.consultant.fullName} is confirmed for{" "}
                {date?.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}{" "}
                at {time}.
              </>
            )
          ) : (
            <>
              {isBookingForSelf ? "Your" : `${bookingFor?.fullName}'s`} request has been sent to{" "}
              {selectedOrg.displayName}. Their team will review it and confirm the session shortly.
            </>
          )}
        </p>
        {isRecurring && seriesOccurrences.length > 0 && (
          <div className="w-full max-w-xs rounded-lg border border-border p-3 text-left text-sm">
            <p className="mb-2 font-semibold tracking-[-0.01em] text-foreground">
              Your scheduled sessions
            </p>
            <ul className="flex flex-col gap-1.5 text-muted-foreground">
              {seriesOccurrences
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()
                )
                .map((occ) => (
                  <li key={occ.id} className="flex items-center gap-2">
                    <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                    {new Date(occ.scheduledStart).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    at{" "}
                    {new Date(occ.scheduledStart).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </li>
                ))}
            </ul>
          </div>
        )}
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

      <div className="flex items-center gap-2" data-tour="client-book-flow-steps">
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
            <CardTitle>What field do you need help with?</CardTitle>
            <CardDescription>
              Choose the type of consultancy you&apos;re looking for
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {bookingProfiles.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Who is this appointment for?
                </Label>
                <div className="flex flex-wrap gap-2">
                  {bookingProfiles.map((profile) => (
                    <Button
                      key={profile.id}
                      type="button"
                      size="sm"
                      variant={bookingForId === profile.id ? "default" : "outline"}
                      onClick={() => handleBookingForChange(profile.id)}
                    >
                      {profile.id === client.id ? "Myself" : profile.fullName}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>Field of consultancy</Label>
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value ?? "");
                  setCaseId("");
                }}
              >
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
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose a consultant</CardTitle>
            <CardDescription>
              Every consultant available for{" "}
              {CATEGORY_OPTIONS.find((opt) => opt.value === category)?.label ?? "this field"},
              across all organizations
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {consultantsLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading consultants…
              </div>
            )}

            {!consultantsLoading && consultantsError && (
              <p className="text-sm text-destructive">{consultantsError}</p>
            )}

            {!consultantsLoading && consultants.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {consultants.map((c) => {
                  const selected = selectedConsultantId === c.id;
                  const hasCaseWithThem = activeCases.some(
                    (ac) => ac.consultant.id === c.id && ac.category === category
                  );
                  const blockedToday = blockedConsultantIdsForDate.has(c.id);
                  return (
                    <Card
                      key={c.id}
                      onClick={() => !blockedToday && handleSelectConsultant(c.id)}
                      className={cn(
                        "transition-colors",
                        blockedToday
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer hover:border-primary/50",
                        selected && "border-primary ring-1 ring-primary"
                      )}
                    >
                      <CardContent className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0 leading-tight">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {c.fullName}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {c.tenantDisplayName}
                            </p>
                          </div>
                          {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {c.category}
                          {c.subSpecialization ? ` · ${c.subSpecialization}` : ""}
                        </p>
                        {c.bio && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">{c.bio}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="w-fit">
                            {c.currency} {c.consultationFee}
                          </Badge>
                          {hasCaseWithThem && (
                            <Badge variant="outline" className="w-fit">
                              Active case with them
                            </Badge>
                          )}
                          {blockedToday && (
                            <Badge variant="outline" className="w-fit text-destructive">
                              Already booked on this date
                            </Badge>
                          )}
                          {c.ratingCount > 0 && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                              {Number(c.ratingAvg).toFixed(1)} ({c.ratingCount})
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
            <CardDescription>
              {hasExistingCase
                ? "Confirm which case this session is for"
                : "Tell the organization what you need help with"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {hasExistingCase ? (
              <div className="flex flex-col gap-1.5">
                <Label>Case</Label>
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
                          {c.consultant.bio && (
                            <p className="line-clamp-2 text-xs text-muted-foreground">
                              {c.consultant.bio}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="w-fit">
                              {c.consultant.currency} {c.consultant.consultationFee}
                            </Badge>
                            {c.consultant.languagesSpoken.map((lang) => (
                              <Badge key={lang} variant="outline" className="w-fit uppercase">
                                {lang}
                              </Badge>
                            ))}
                            {c.consultant._count.cases > 0 && (
                              <Badge variant="outline" className="w-fit">
                                {c.consultant._count.cases} active case
                                {c.consultant._count.cases === 1 ? "" : "s"}
                              </Badge>
                            )}
                            {c.consultant.ratingCount > 0 && (
                              <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                                {Number(c.consultant.ratingAvg).toFixed(1)} (
                                {c.consultant.ratingCount})
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="requirementsSubject">Subject (optional)</Label>
                  <Input
                    id="requirementsSubject"
                    placeholder="Short summary, e.g. Divorce filing help"
                    value={requirementsSubject}
                    onChange={(e) => setRequirementsSubject(e.target.value)}
                  />
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
                  {selectedOrg?.displayName}&apos;s team will review your request, then a consultant
                  in this field will take it on.
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

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="attachedFiles" className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                Attach documents (optional)
              </Label>
              <Input
                id="attachedFiles"
                type="file"
                multiple
                onChange={(e) => setAttachedFiles(Array.from(e.target.files ?? []))}
              />
              {attachedFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {attachedFiles.length} file{attachedFiles.length === 1 ? "" : "s"} selected
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a date &amp; time</CardTitle>
            <CardDescription>Session length depends on the selected slot</CardDescription>
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
              <p className="mb-2 text-sm font-semibold tracking-[-0.01em] text-foreground">
                Available slots
              </p>
              {selectedConsultant && blockedConsultantIdsForDate.has(selectedConsultant.id) ? (
                <p className="text-sm text-destructive">
                  You already have an appointment with {selectedConsultant.fullName} on this date.
                  Pick another date or go back and choose a different consultant.
                </p>
              ) : slotsLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading availability…
                </p>
              ) : availableTimesForDate.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No open slots on this date. Try another day.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {availableTimesForDate.map((slot) => (
                    <Button
                      key={slot.time}
                      type="button"
                      variant={time === slot.time ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setTime(slot.time);
                        setSelectedDurationMins(slot.durationMins);
                        setSelectedSlotStart(slot.start);
                      }}
                    >
                      {slot.time} &middot; {slot.durationMins}m
                    </Button>
                  ))}
                </div>
              )}

              {hasExistingCase && (
                <div className="mt-5 flex flex-col gap-3 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label htmlFor="recurring-toggle">Book as a recurring series</Label>
                      <p className="text-xs text-muted-foreground">
                        Repeats weekly on the same day and time
                      </p>
                    </div>
                    <Switch
                      id="recurring-toggle"
                      checked={isRecurring}
                      onCheckedChange={setIsRecurring}
                    />
                  </div>
                  {isRecurring && (
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="occurrence-count">Number of sessions</Label>
                      <Input
                        id="occurrence-count"
                        type="number"
                        min={2}
                        max={52}
                        value={occurrenceCount}
                        onChange={(e) =>
                          setOccurrenceCount(Math.min(52, Math.max(2, Number(e.target.value) || 2)))
                        }
                        className="w-24"
                      />
                    </div>
                  )}
                </div>
              )}
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
                  {selectedConsultant?.fullName ?? selectedOrg.displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {selectedConsultant ? `${selectedConsultant.category} · ` : ""}
                  {selectedOrg.displayName}
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
                {time} ({selectedDurationMins} min)
              </div>
            </div>

            {meetingLink && (
              <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                Meeting link: {meetingLink}
              </div>
            )}

            {isRecurring && date && time && (
              <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                <p className="font-semibold tracking-[-0.01em] text-foreground">
                  Repeats weekly, {occurrenceCount} sessions
                </p>
                <p className="mt-1">
                  Every {date.toLocaleDateString(undefined, { weekday: "long" })} at {time},
                  starting {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}.
                </p>
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
