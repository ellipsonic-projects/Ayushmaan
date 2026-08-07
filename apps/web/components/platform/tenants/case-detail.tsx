"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Briefcase, ChevronRight, Trash2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import type { PlatformCaseDetail } from "@/lib/api/platform-cases.server";
import {
  updatePlatformTenantCase,
  deletePlatformTenantCase,
} from "@/lib/api/platform-cases.client";
import { CaseInteractionsList } from "@/components/platform/tenants/case-interactions-list";
import type { PlatformInteraction } from "@/lib/api/platform-interactions.server";

const CATEGORY_LABEL: Record<string, string> = {
  MEDICAL: "Medical",
  LEGAL: "Legal",
  IT: "IT",
  PHYSIOTHERAPY: "Physiotherapy",
  HOMEOPATHY: "Homeopathy",
  ASTROLOGY: "Astrology",
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400",
  ON_HOLD:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  CLOSED:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
};

export function CaseDetail({
  tenantId,
  tenantSlug,
  tenantName,
  caseDetail,
}: {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  caseDetail: PlatformCaseDetail;
}) {
  const router = useRouter();
  const [requirements, setRequirements] = useState(caseDetail.requirements ?? "");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function handleDiscard() {
    setRequirements(caseDetail.requirements ?? "");
    setDirty(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updatePlatformTenantCase(tenantId, tenantSlug, caseDetail.id, { requirements });
      setDirty(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deletePlatformTenantCase(tenantId, tenantSlug, caseDetail.id);
      router.push(`/superadmin/tenants/${tenantId}/cases`);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/superadmin/tenants" className="hover:text-foreground">
            Tenants
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/superadmin/tenants/${tenantId}`} className="hover:text-foreground">
            {tenantName}
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link href={`/superadmin/tenants/${tenantId}/cases`} className="hover:text-foreground">
            Cases
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{caseDetail.matterKey ?? caseDetail.id}</span>
        </div>
        <div className="mt-1 flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="h-4 w-4" />
          </span>
          <h2 className="text-2xl font-bold text-foreground">
            {caseDetail.matterKey ?? "Case Detail"}
          </h2>
          <Badge variant="outline" className={STATUS_STYLE[caseDetail.status]}>
            {caseDetail.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Case Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Client
            </p>
            <p className="text-sm text-foreground">{caseDetail.client.fullName}</p>
            <p className="text-xs text-muted-foreground">{caseDetail.client.user.email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Consultant
            </p>
            <p className="text-sm text-foreground">{caseDetail.consultant.fullName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Category
            </p>
            <p className="text-sm text-foreground">
              {CATEGORY_LABEL[caseDetail.category] ?? caseDetail.category}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tags
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {caseDetail.tags.length > 0 ? (
                caseDetail.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Requirements
          </CardTitle>
          <CardDescription>Free-text case requirements, editable by Super Admin.</CardDescription>
        </CardHeader>
        <CardContent>
          <textarea
            rows={4}
            value={requirements}
            onChange={(e) => {
              setRequirements(e.target.value);
              setDirty(true);
            }}
            className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {dirty ? "You have unsaved changes." : "All changes are saved."}
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
        </CardContent>
      </Card>

      <CaseInteractionsList
        interactions={caseDetail.interactions.map((i): PlatformInteraction => ({
          ...i,
          caseId: caseDetail.id,
          type: i.type as PlatformInteraction["type"],
        }))}
        tenantId={tenantId}
        tenantSlug={tenantSlug}
        caseId={caseDetail.id}
      />

      <Card className="border-l-4 border-l-destructive/60">
        <CardHeader>
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Delete this case</p>
            <p className="text-xs text-muted-foreground">
              Removes the case from active listings. This can be reversed by platform support if
              needed.
            </p>
          </div>
          <Button variant="destructive" className="gap-1.5" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete Case
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this case?</DialogTitle>
            <DialogDescription>
              {caseDetail.matterKey ?? "This case"} will be removed. This can be reversed by
              platform support if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" disabled={deleting} />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
