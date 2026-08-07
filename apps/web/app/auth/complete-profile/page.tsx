"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TimezoneSelectField } from "@/components/ui/timezone-select";
import { PhoneInput } from "@/components/ui/phone-input";
import { LANGUAGE_OPTIONS } from "@/lib/languages";
import { authProvider } from "@/lib/auth";
import { supabase } from "@/lib/supabase/client";
import { api, apiCall, ApiError } from "@/lib/api/client";
import { destinationFor, type MeResponse } from "@/lib/auth/destination";
import { consumeSignupIntent } from "@/lib/auth/signup-intent";
import { markTourAutostartPending } from "@/lib/auth/tour-autostart";

type ProfileMode = "individual" | "organization" | "consultant";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Landing point after a first-time Google sign-in (app/auth/callback/page.tsx
// redirects here when GET /auth/me 401s with "No matching account"). Google
// never runs through the signup form's fields, so which account type to
// create isn't known yet — this page asks, mirroring signup-form.tsx's two
// modes: "individual" calls POST /auth/register-profile (CLIENT role),
// "organization" calls POST /auth/register-tenant (TENANT_ADMIN role, new
// Tenant). It's also the landing point destinationFor() sends a CONSULTANT
// to exactly once, right after their client->consultant application is
// approved (consultant_profiles.onboarding_completed_at is still NULL) —
// the "consultant" mode below confirms/fills the profile details the
// become-consultant application form didn't collect (timezone) and lets
// them touch up what it did (bio, sub-specialization, languages).
export default function CompleteProfilePage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [mode, setMode] = useState<ProfileMode>("individual");
  // True when the mode was already picked on /signup and carried through the
  // Google redirect (lib/auth/signup-intent.ts), or the caller is a
  // CONSULTANT landing here post-elevation — the toggle below is hidden
  // then, so the user isn't asked to choose Individual/Organization.
  const [modeLocked, setModeLocked] = useState(false);

  // Individual fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  // Organization fields
  const [displayName, setDisplayName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [address, setAddress] = useState("");

  // Consultant fields (post-elevation)
  const [consultantContext, setConsultantContext] = useState<{
    tenantId: string;
    tenantSlug: string;
    consultantId: string;
  } | null>(null);
  const [subSpecialization, setSubSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [languagesSpoken, setLanguagesSpoken] = useState<string[]>(["en"]);
  const [langOpen, setLangOpen] = useState(false);

  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authProvider
      .getSession()
      .then(async (session) => {
        if (!session) {
          router.replace("/signin");
          return;
        }
        setAccessToken(session.accessToken);

        // A CONSULTANT with an incomplete onboarding step takes priority over
        // any stale signup intent left in sessionStorage/auth metadata — this
        // is the only mode a CONSULTANT can ever land on this page in. A brand
        // new user (no `users` row yet — the normal reason for landing here)
        // makes this 401 with "No matching account"; that's expected, so fall
        // through to the signup-intent flow below instead of treating it as
        // an error.
        let me: MeResponse | null = null;
        try {
          ({ data: me } = await api.get<{ data: MeResponse }>("/api/auth/me", session.accessToken));
        } catch (err) {
          if (!(
            err instanceof ApiError &&
            err.statusCode === 401 &&
            err.message === "No matching account"
          )) {
            throw err;
          }
        }

        if (me?.role === "CONSULTANT") {
          // A CONSULTANT must never fall through to the client/organization
          // toggle below (it would render tenant fields off stale signup
          // metadata) — either it completes consultant onboarding here, or
          // it's already done and belongs on its dashboard, not this page.
          if (
            me.tenantId &&
            me.tenant &&
            me.consultantOnboarding &&
            !me.consultantOnboarding.completed
          ) {
            const { data: profile } = await apiCall<{
              data: {
                fullName: string;
                subSpecialization: string | null;
                bio: string | null;
                timezone: string;
                languagesSpoken: string[];
              };
            }>(`/api/tenants/${me.tenantId}/consultants/${me.consultantOnboarding.consultantId}`, {
              token: session.accessToken,
              headers: { "X-Tenant-Slug": me.tenant.slug },
            });
            setMode("consultant");
            setModeLocked(true);
            setConsultantContext({
              tenantId: me.tenantId,
              tenantSlug: me.tenant.slug,
              consultantId: me.consultantOnboarding.consultantId,
            });
            setSubSpecialization(profile.subSpecialization ?? "");
            setBio(profile.bio ?? "");
            setTimezone(profile.timezone);
            setLanguagesSpoken(profile.languagesSpoken);
            setChecking(false);
            return;
          }

          router.replace(destinationFor(me));
          return;
        }

        const { data } = await supabase.auth.getUser();
        const meta = data.user?.user_metadata ?? {};
        const suggestedName = (meta.full_name || meta.name || "") as string;
        setFullName(suggestedName);

        const intent = consumeSignupIntent();
        if (intent) {
          setMode(intent.mode);
          setModeLocked(true);
          if (intent.displayName) setDisplayName(intent.displayName);
          if (intent.slug) {
            setSlug(intent.slug);
            setSlugEdited(true);
          }
          if (intent.address) setAddress(intent.address);
        } else if (meta.signup_mode === "individual" || meta.signup_mode === "organization") {
          // sessionStorage intent doesn't survive a confirmation link opened in
          // a new tab, or a sign-in redirect here for an unprovisioned account
          // (signin-form.tsx) — auth metadata set at signup time (options.data)
          // is the durable fallback since it's attached to the user, not the tab.
          setMode(meta.signup_mode);
          setModeLocked(true);
          if (meta.org_display_name) setDisplayName(meta.org_display_name as string);
          if (meta.org_slug) {
            setSlug(meta.org_slug as string);
            setSlugEdited(true);
          }
          if (meta.org_address) setAddress(meta.org_address as string);
        }

        setChecking(false);
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Something went wrong. Please try signing in again."
        );
        setChecking(false);
      });
  }, [router]);

  const handleDisplayNameChange = (value: string) => {
    setDisplayName(value);
    if (!slugEdited) setSlug(slugify(value));
  };

  function toggleLanguage(value: string) {
    setLanguagesSpoken((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessToken) return;
    if (mode === "individual") {
      if (!fullName || !phone) return;
    } else if (mode === "organization") {
      if (!displayName || !slug || !phone) return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (mode === "individual") {
        await api.post(
          "/api/auth/register-profile",
          {
            fullName,
            phone,
            ...(dob && { dob }),
            preferredLanguage,
            timezone,
            ...(emergencyContactName && { emergencyContactName }),
            ...(emergencyContactPhone && { emergencyContactPhone }),
          },
          accessToken
        );
      } else if (mode === "organization") {
        await api.post(
          "/api/auth/register-tenant",
          { slug, displayName, phone, ...(address && { address }) },
          accessToken
        );
      } else if (consultantContext) {
        await apiCall(
          `/api/tenants/${consultantContext.tenantId}/consultants/${consultantContext.consultantId}`,
          {
            method: "PATCH",
            body: {
              timezone,
              languagesSpoken,
              ...(subSpecialization && { subSpecialization }),
              ...(bio && { bio }),
              onboardingCompleted: true,
            },
            token: accessToken,
            headers: { "X-Tenant-Slug": consultantContext.tenantSlug },
          }
        );
      }
      const { data: me } = await api.get<{ data: MeResponse }>("/api/auth/me", accessToken);
      markTourAutostartPending();
      router.push(destinationFor(me));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish setting up your account");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Setting things up…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {mode === "consultant" ? "A few details for your practice" : "A few more details"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "consultant"
            ? "Confirm your consultant profile before you start taking bookings."
            : "Finish setting up your Ayushman account."}
        </p>

        {!modeLocked && (
          <div className="mt-4 inline-flex rounded-full border border-border bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                setMode("individual");
                setError(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                mode === "individual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Client
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("organization");
                setError(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                mode === "organization"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Organization
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "individual" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone number</Label>
                <PhoneInput id="phone" value={phone} onChange={(value) => setPhone(value ?? "")} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of birth (optional)</Label>
                <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>Preferred language</Label>
                <Select
                  value={preferredLanguage}
                  onValueChange={(v) => v && setPreferredLanguage(v)}
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

              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <TimezoneSelectField value={timezone} onChange={setTimezone} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactName">Emergency contact name (optional)</Label>
                <Input
                  id="emergencyContactName"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="Ex:John Doe"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="emergencyContactPhone">Emergency contact phone (optional)</Label>
                <PhoneInput
                  id="emergencyContactPhone"
                  value={emergencyContactPhone}
                  onChange={(value) => setEmergencyContactPhone(value ?? "")}
                />
              </div>
            </>
          )}

          {mode === "organization" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Practice name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => handleDisplayNameChange(e.target.value)}
                  placeholder="Ex:Apollo Heart Centre"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">Workspace URL</Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(true);
                  }}
                  placeholder="Ex:apollo-heart-centre"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="orgPhone">Phone number</Label>
                <PhoneInput
                  id="orgPhone"
                  value={phone}
                  onChange={(value) => setPhone(value ?? "")}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address">Address (optional)</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ex:123 MG Road, Bengaluru, India"
                />
              </div>
            </>
          )}

          {mode === "consultant" && (
            <>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <TimezoneSelectField value={timezone} onChange={setTimezone} />
                <p className="text-xs text-muted-foreground">
                  Your availability slots are read against this timezone.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subSpecialization">Sub-specialization (optional)</Label>
                <Input
                  id="subSpecialization"
                  value={subSpecialization}
                  onChange={(e) => setSubSpecialization(e.target.value)}
                  placeholder="e.g. Sports Medicine"
                />
              </div>

              <div className="space-y-1.5">
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

              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio (optional)</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short professional summary"
                />
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
