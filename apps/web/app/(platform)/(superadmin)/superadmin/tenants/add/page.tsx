"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  CircleCheck,
  CreditCard,
  Globe,
  Image as ImageIcon,
  Info,
  UploadCloud,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth/context";
import { createTenant, type CreateTenantInput } from "@/lib/hooks";

export default function AddTenantPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [slug, setSlug] = useState("apollo-heart");
  const [customDomain, setCustomDomain] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [planTier, setPlanTier] = useState<CreateTenantInput["planTier"]>("PRO");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await createTenant({ slug, displayName, adminEmail, planTier }, token);
      router.push("/superadmin/tenants");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/tenants" className="hover:text-foreground">
            Tenants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">New Tenant Provisioning</span>
        </div>
        <h2 className="mt-1 text-2xl font-bold text-foreground">Provision New Practice</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define the identity, domain infrastructure, and administrative ownership for the new
          medical practice.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Practice Identity</CardTitle>
          </div>
          <CardDescription>
            Official naming and branding assets for the tenant profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="practice-name">Practice Name *</Label>
              <Input
                id="practice-name"
                placeholder="e.g. Apollo Heart Centre"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="legal-entity-name">Legal Entity Name (Optional)</Label>
              <Input id="legal-entity-name" placeholder="e.g. Apollo Hospitals Enterprise Ltd." />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Logo Upload</Label>
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input py-8 text-center">
              <UploadCloud className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Drag and drop or <span className="text-primary">click to browse</span>
              </p>
              <p className="text-xs text-muted-foreground">
                SVG, PNG, JPG (Max 2MB). Recommended 512x512px.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Infrastructure &amp; Domain</CardTitle>
          </div>
          <CardDescription>Configure how the practice will be accessed globally.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tenant-slug">Tenant Slug</Label>
            <div className="flex items-stretch overflow-hidden rounded-lg border border-input">
              <Input
                id="tenant-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                className="h-9 rounded-none border-0"
              />
              <span className="flex shrink-0 items-center bg-muted px-3 text-sm text-muted-foreground">
                .ayushman.app
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-500">
              <CircleCheck className="h-3.5 w-3.5" />
              Slug is available for registration.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Custom Domain</p>
              <p className="text-xs text-muted-foreground">
                Enable a white-labeled domain for this tenant.
              </p>
            </div>
            <Switch checked={customDomain} onCheckedChange={setCustomDomain} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Administrative Ownership</CardTitle>
          </div>
          <CardDescription>Contact details for the initial TENANT_ADMIN account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-name">Admin Full Name</Label>
              <Input id="admin-name" placeholder="e.g. Dr. Sarah Chen" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-email">Admin Email Address</Label>
              <Input
                id="admin-email"
                type="email"
                placeholder="sarah.chen@apollo.com"
                value={adminEmail}
                onChange={(event) => setAdminEmail(event.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This user will receive the primary invitation link.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <CardTitle>Plan &amp; Commercials</CardTitle>
          </div>
          <CardDescription>Select the subscription tier and payment structure.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Service Plan Tier</Label>
              <Select
                value={planTier}
                onValueChange={(value) => setPlanTier(value as CreateTenantInput["planTier"])}
              >
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STANDARD">Standard</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Billing Cycle</Label>
              <Select defaultValue="annual">
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual (Save 15%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-date">Payment Date</Label>
              <Input id="payment-date" type="date" className="h-9" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 ring-1 ring-foreground/10">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">Ready to Provision?</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tenant creation triggers provisioning of dedicated cloud infrastructure, database
            schema, and an automated welcome email to the specified admin. This process typically
            completes within 90 seconds.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="sticky bottom-0 -mx-6 flex items-center justify-between border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
        <Link href="/superadmin/tenants">
          <Button variant="outline">Cancel</Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleCreate}
            disabled={submitting || !slug || !displayName || !adminEmail}
          >
            {submitting ? "Creating…" : "Create Tenant"}
          </Button>
        </div>
      </div>
    </div>
  );
}
