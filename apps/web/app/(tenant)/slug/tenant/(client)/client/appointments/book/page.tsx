"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  MapPin,
  ShieldCheck,
  Star,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Consultant = {
  id: string;
  name: string;
  speciality: string;
  initials: string;
  rating: number;
  reviews: number;
  mode: "Video call" | "In person";
  nextAvailable: string;
  fee: number;
};

const consultants: Consultant[] = [
  {
    id: "aris-thorne",
    name: "Dr. Aris Thorne",
    speciality: "Clinical Psychology",
    initials: "AT",
    rating: 4.9,
    reviews: 128,
    mode: "Video call",
    nextAvailable: "Today",
    fee: 1500,
  },
  {
    id: "mira-kapoor",
    name: "Dr. Mira Kapoor",
    speciality: "Cognitive Behavioural Therapy",
    initials: "MK",
    rating: 4.8,
    reviews: 96,
    mode: "In person",
    nextAvailable: "Tomorrow",
    fee: 1800,
  },
  {
    id: "rahul-menon",
    name: "Rahul Menon",
    speciality: "Care Coordination",
    initials: "RM",
    rating: 4.7,
    reviews: 54,
    mode: "Video call",
    nextAvailable: "Jul 11",
    fee: 900,
  },
];

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
  { id: 1, label: "Select Consultant" },
  { id: 2, label: "Select a Slot" },
  { id: 3, label: "Confirm Booking" },
];

export default function BookAppointmentPage() {
  const [step, setStep] = useState(1);
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [booked, setBooked] = useState(false);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);

  const consultant = useMemo(
    () => consultants.find((c) => c.id === consultantId) ?? null,
    [consultantId]
  );

  const canContinue =
    (step === 1 && !!consultantId) ||
    (step === 2 && !!date && !!time) ||
    (step === 3 && paid);

  function handleStripePayment() {
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaid(true);
    }, 1200);
  }

  function goNext() {
    if (step < 3) setStep((s) => s + 1);
    else setBooked(true);
  }

  function goBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  if (booked && consultant) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h2 className="text-2xl font-bold text-foreground">
          Appointment booked
        </h2>
        <p className="text-sm text-muted-foreground">
          Your session with {consultant.name} is confirmed for{" "}
          {date?.toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}{" "}
          at {time}. A receipt for ₹{consultant.fee.toLocaleString("en-IN")}{" "}
          has been sent to your email.
        </p>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/slug/tenant/client/dashboard">Back to dashboard</Link>
          </Button>
          <Button
            onClick={() => {
              setBooked(false);
              setStep(1);
              setConsultantId(null);
              setTime(null);
              setNotes("");
              setPaid(false);
            }}
          >
            Book another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/slug/tenant/client/dashboard"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
        <h2 className="text-2xl font-bold text-foreground">
          Book Appointment
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a consultant, pick a time and confirm your session
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
              <div
                className={cn(
                  "h-px flex-1",
                  step > s.id ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {consultants.map((c) => {
            const ModeIcon = c.mode === "Video call" ? Video : MapPin;
            const selected = consultantId === c.id;
            return (
              <Card
                key={c.id}
                onClick={() => setConsultantId(c.id)}
                className={cn(
                  "cursor-pointer transition-colors hover:border-primary/50",
                  selected && "border-primary ring-1 ring-primary"
                )}
              >
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {c.initials}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {c.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {c.speciality}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current text-amber-500" />
                      {c.rating}{" "}
                      <span className="text-muted-foreground/70">
                        ({c.reviews})
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ModeIcon className="h-3.5 w-3.5" />
                      {c.mode}
                    </span>
                  </div>
                  <Badge variant="outline" className="w-fit gap-1">
                    <Clock className="h-3 w-3" />
                    Next available: {c.nextAvailable}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select a date &amp; time</CardTitle>
            <CardDescription>
              Booking with {consultant?.name}
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
              <p className="mb-2 text-sm font-medium text-foreground">
                Available slots
              </p>
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

      {step === 3 && consultant && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm your appointment</CardTitle>
            <CardDescription>
              Review the details before booking
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {consultant.initials}
              </span>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-foreground">
                  {consultant.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {consultant.speciality}
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
                {time}
              </div>
            </div>

            <div className="grid gap-1.5">
              <label
                htmlFor="notes"
                className="text-sm font-medium text-foreground"
              >
                Notes for your consultant (optional)
              </label>
              <Textarea
                id="notes"
                placeholder="Share anything you'd like your consultant to know before the session"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && consultant && (
        <Card>
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>
              Consultation fee, paid securely via Stripe
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">
                Session fee ({consultant.mode})
              </span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                ₹{consultant.fee.toLocaleString("en-IN")}
              </span>
            </div>

            {paid ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-primary">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Payment successful — you're ready to confirm your booking.
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
                    : `Pay ₹${consultant.fee.toLocaleString("en-IN")} with Stripe`}
                </Button>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Payments are securely processed by Stripe. Your card details
                  are never stored on our servers.
                </p>
              </>
            )}
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
        <Button
          type="button"
          onClick={goNext}
          disabled={!canContinue}
          className="gap-1.5"
        >
          {step === 3
            ? paid
              ? "Confirm & Book"
              : "Pay to continue"
            : "Continue"}
          {step < 3 && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
