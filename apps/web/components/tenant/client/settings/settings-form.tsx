"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TimezoneSelectField } from "@/components/ui/timezone-select";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import type { OwnClientProfile } from "@/lib/api/clients.server";
import { updateOwnClientProfile } from "@/lib/api/clients.client";

function toDateInput(value: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function ClientProfileForm({
  client,
  scopeTenantId,
  scopeTenantSlug,
  onDone,
}: {
  client: OwnClientProfile;
  scopeTenantId: string;
  scopeTenantSlug: string;
  onDone?: () => void;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState(client.fullName);
  const [dob, setDob] = useState(toDateInput(client.dob));
  const [preferredLanguage, setPreferredLanguage] = useState(client.preferredLanguage);
  const [timezone, setTimezone] = useState(client.timezone);
  const [emergencyContactName, setEmergencyContactName] = useState(
    client.emergencyContactName ?? ""
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    client.emergencyContactPhone ?? ""
  );

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function withDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
      setError(null);
    };
  }

  function handleDiscard() {
    setFullName(client.fullName);
    setDob(toDateInput(client.dob));
    setPreferredLanguage(client.preferredLanguage);
    setTimezone(client.timezone);
    setEmergencyContactName(client.emergencyContactName ?? "");
    setEmergencyContactPhone(client.emergencyContactPhone ?? "");
    setDirty(false);
    setError(null);
    onDone?.();
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await updateOwnClientProfile(scopeTenantId, scopeTenantSlug, client.id, {
        fullName,
        ...(dob !== toDateInput(client.dob) && { dob }),
        preferredLanguage,
        timezone,
        emergencyContactName,
        emergencyContactPhone,
      });
      setDirty(false);
      router.refresh();
      onDone?.();
    } catch (err) {
      setError(
        err instanceof Error && err.message.includes("422")
          ? "Date of birth can't be changed once a guardian has given consent."
          : "Failed to save changes. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal details shared with your care team</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => withDirty(setFullName)(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={client.user.email} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => withDirty(setDob)(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={client.user.phone ?? ""} disabled />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Preferred language</Label>
            <Select
              value={preferredLanguage}
              onValueChange={(value) => value && withDirty(setPreferredLanguage)(value)}
            >
              <SelectTrigger className="h-9 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Timezone</Label>
            <TimezoneSelectField value={timezone} onChange={withDirty(setTimezone)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency contact</CardTitle>
          <CardDescription>Who to reach in case of an emergency</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-name">Name</Label>
            <Input
              id="ec-name"
              value={emergencyContactName}
              onChange={(e) => withDirty(setEmergencyContactName)(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ec-phone">Phone</Label>
            <PhoneInput
              id="ec-phone"
              value={emergencyContactPhone}
              onChange={(value) => withDirty(setEmergencyContactPhone)(value ?? "")}
            />
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

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
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
