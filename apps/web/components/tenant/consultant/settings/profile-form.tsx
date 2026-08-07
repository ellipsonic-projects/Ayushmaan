"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserRound, Check, ChevronsUpDown, X } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimezoneSelectField } from "@/components/ui/timezone-select";
import { cn } from "@/lib/utils";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import type { ConsultantProfile } from "@/lib/api/consultants.server";
import { updateConsultantProfile } from "@/lib/api/consultants.client";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "MEDICAL", label: "Medical" },
  { value: "LEGAL", label: "Legal" },
  { value: "IT", label: "IT" },
  { value: "PHYSIOTHERAPY", label: "Physiotherapy" },
  { value: "HOMEOPATHY", label: "Homeopathy" },
  { value: "ASTROLOGY", label: "Astrology" },
];

const PAYMENT_TIMINGS: { value: "PAY_ON_BOOKING" | "PAY_AFTER_SESSION"; label: string }[] = [
  { value: "PAY_ON_BOOKING", label: "Pay on booking" },
  { value: "PAY_AFTER_SESSION", label: "Pay after session" },
];

export function ConsultantProfileForm({
  consultant,
  onDone,
}: {
  consultant: ConsultantProfile;
  onDone?: () => void;
}) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(consultant.fullName);
  const [category, setCategory] = useState(consultant.category);
  const [specialization, setSpecialization] = useState(consultant.subSpecialization ?? "");
  const [bio, setBio] = useState(consultant.bio ?? "");
  const [timezone, setTimezone] = useState(consultant.timezone);
  const [languages, setLanguages] = useState<string[]>(consultant.languagesSpoken);
  const [acceptBookings, setAcceptBookings] = useState(consultant.isAcceptingNewClients);
  const [autoApproveBookings, setAutoApproveBookings] = useState(consultant.autoApproveBookings);
  const [paymentTiming, setPaymentTiming] = useState(consultant.paymentTiming);

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
      prev.includes(language) ? prev.filter((item) => item !== language) : [...prev, language]
    );
    setDirty(true);
  }

  function handleDiscard() {
    setDisplayName(consultant.fullName);
    setCategory(consultant.category);
    setSpecialization(consultant.subSpecialization ?? "");
    setBio(consultant.bio ?? "");
    setTimezone(consultant.timezone);
    setLanguages(consultant.languagesSpoken);
    setAcceptBookings(consultant.isAcceptingNewClients);
    setAutoApproveBookings(consultant.autoApproveBookings);
    setPaymentTiming(consultant.paymentTiming);
    setDirty(false);
    onDone?.();
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateConsultantProfile(consultant.id, {
        fullName: displayName,
        category,
        subSpecialization: specialization,
        bio,
        timezone,
        languagesSpoken: languages,
        isAcceptingNewClients: acceptBookings,
        autoApproveBookings,
        paymentTiming,
      });

      setDirty(false);
      router.refresh();
      onDone?.();
    } finally {
      setSaving(false);
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
            <Input
              id="session-fee"
              value={`${consultant.currency} ${consultant.consultationFee}`}
              disabled
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">Set by your tenant admin.</p>
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
          <div className="flex flex-col gap-1.5">
            <Label>Timezone</Label>
            <TimezoneSelectField value={timezone} onChange={withDirty(setTimezone)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Languages Spoken</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
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
                              languages.includes(lang.value) ? "opacity-100" : "opacity-0"
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
            {languages.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {languages.map((value) => {
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

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-between border-t border-border bg-card px-6 py-3 shadow-[0_-1px_0_rgba(0,0,0,0.04)] sm:left-64">
        <span className="text-xs text-muted-foreground">
          {dirty ? "You have unsaved changes." : "Editing profile"}
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={handleDiscard}
          >
            {dirty ? "Discard" : "Cancel"}
          </Button>
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
