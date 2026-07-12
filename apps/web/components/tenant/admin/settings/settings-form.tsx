"use client";

import { useState } from "react";
import {
  Building2,
  Landmark,
  ShieldCheck,
  UploadCloud,
  Copy,
  Check,
  ImageIcon,
} from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// TenantSettings — schema §1.3: brandingColors, defaultCurrency, etc.
const CURRENCIES = ["INR", "USD"] as const;
type Currency = (typeof CURRENCIES)[number];

export function SettingsForm() {
  const [companyName, setCompanyName] = useState("Meridian Consulting Group");
  const [contactEmail, setContactEmail] = useState("admin@meridianconsulting.com");
  const [address, setAddress] = useState(
    "Level 5, Business Bay Tower, Knowledge City, Hyderabad - 500081"
  );
  const [supportPhone, setSupportPhone] = useState("+91 1800 234 5678");
  const [baseSessionFee, setBaseSessionFee] = useState("1500");
  const [currency, setCurrency] = useState<Currency>("INR");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const tenantId = "ten_9F82K1-AYUSHMAN-PRO";

  function withDirty<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
    };
  }

  function handleCopyTenantId() {
    navigator.clipboard?.writeText(tenantId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDiscard() {
    setDirty(false);
  }

  function handleSave() {
    setSaving(true);
    // PATCH /api/tenants/:tenantId/settings — apps/api owns TenantSettings persistence
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
    }, 600);
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Card id="branding" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ImageIcon className="h-3.5 w-3.5" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Company Logo</Label>
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 text-center transition-colors hover:bg-muted/60">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Upload New</span>
              <span className="text-[11px] text-muted-foreground">PNG or SVG. Max 2MB.</span>
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Brand Banner</Label>
            <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input bg-muted/40 text-center transition-colors hover:bg-muted/60">
              <UploadCloud className="h-5 w-5 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Upload Landscape Banner</span>
              <span className="text-[11px] text-muted-foreground">
                Recommended size 1500&times;500px.
              </span>
              <input type="file" accept="image/*" className="hidden" />
            </label>
          </div>
        </CardContent>
      </Card>

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
              className="h-9"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="address">Physical Address</Label>
            <textarea
              id="address"
              rows={2}
              value={address}
              onChange={(e) => withDirty(setAddress)(e.target.value)}
              className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="support-phone">Support Phone</Label>
            <PhoneInput
              id="support-phone"
              value={supportPhone}
              onChange={(value) => withDirty(setSupportPhone)(value ?? "")}
              inputClassName="h-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card id="financial-configuration" className="scroll-mt-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Landmark className="h-3.5 w-3.5" />
            Financial Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">Stripe Integration</p>
                <p className="text-xs text-muted-foreground">
                  Payouts and client billing handled via Stripe.
                </p>
              </div>
            </div>
            <Button size="sm">Connect with Stripe</Button>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="base-session-fee">Base Session Fee</Label>
            <div className="flex items-center gap-2">
              <Input
                id="base-session-fee"
                type="number"
                min={0}
                value={baseSessionFee}
                onChange={(e) => withDirty(setBaseSessionFee)(e.target.value)}
                className="h-9 max-w-xs"
              />
              <div className="flex h-9 shrink-0 items-center rounded-lg border border-input p-0.5">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => withDirty(setCurrency)(c)}
                    className={cn(
                      "h-full rounded-md px-3 text-xs font-semibold transition-colors",
                      currency === c
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
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
              <Badge className="bg-blue-600 text-white dark:bg-blue-500">Enterprise Elite</Badge>
              <Badge
                variant="outline"
                className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
              >
                Active
              </Badge>
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
          <Button type="button" size="sm" disabled={!dirty || saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
