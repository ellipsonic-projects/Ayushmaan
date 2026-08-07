"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronRight, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { createPlatformTenantConsultant } from "@/lib/api/platform-consultants.client";

// consultant_category enum — schema_ayushman_v3.md §3.8
const CATEGORIES = [
  { value: "MEDICAL", label: "Medical" },
  { value: "LEGAL", label: "Legal" },
  { value: "IT", label: "IT" },
  { value: "PHYSIOTHERAPY", label: "Physiotherapy" },
  { value: "HOMEOPATHY", label: "Homeopathy" },
  { value: "ASTROLOGY", label: "Astrology" },
];

export function ConsultantDirectoryHeader({
  tenantId,
  tenantSlug,
  tenantName,
  totalConsultants,
}: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  totalConsultants: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = email.trim().length > 0 && fullName.trim().length > 0 && category.length > 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await createPlatformTenantConsultant(tenantId, tenantSlug, {
        email: email.trim(),
        fullName: fullName.trim(),
        category,
      });
      setOpen(false);
      setEmail("");
      setFullName("");
      setCategory("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to onboard consultant");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/tenants" className="hover:text-foreground">
            Tenants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/tenants/${tenantId}`} className="hover:text-foreground">
            {tenantName}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Consultants Directory</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="h-4 w-4" />
          </span>
          <h2 className="text-2xl font-bold text-foreground">Tenant Consultants Directory</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Managing {totalConsultants.toLocaleString()} licensed professionals for {tenantName}.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button className="gap-1.5" onClick={() => setOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Onboard Consultant
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Onboard Consultant</DialogTitle>
              <DialogDescription>
                Creates their login and sends an invite email for {tenantName}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboard-full-name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="onboard-full-name"
                  placeholder="Aditi Rao"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="h-9"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="onboard-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="onboard-email"
                  type="email"
                  placeholder="aditi.rao@practice.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-9"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>
                  Category <span className="text-destructive">*</span>
                </Label>
                <Select value={category} onValueChange={(value) => setCategory(value ?? "")}>
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
            <DialogFooter>
              <DialogClose
                render={<Button type="button" variant="outline" disabled={submitting} />}
              >
                Cancel
              </DialogClose>
              <Button type="submit" disabled={!isValid || submitting} className="gap-1.5">
                {submitting ? "Sending Invite..." : "Invite Consultant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
