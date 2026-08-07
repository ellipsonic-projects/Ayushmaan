"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, Mail, MoreVertical, Plus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  TemplateChannel,
  TemplateScope,
  WorkflowTemplate,
} from "@/lib/api/workflow-templates.server";
import {
  deleteWorkflowTemplate,
  type TemplateTenantParam,
} from "@/lib/api/workflow-templates.client";
import type { FormTemplate } from "@/lib/api/form-templates.server";
import { deleteFormTemplate } from "@/lib/api/form-templates.client";

// A message template (Tiptap content, EMAIL) and an intake-form
// template (structured fields) are different backing models — different
// content shape, different editor — but the same authoring surface: one
// "Templates" library, one scope model, one workflow input. `kind`
// discriminates which editor route + delete call a row uses; everything
// else in this board treats them the same.
type TemplateRow =
  | { kind: "message"; id: string; template: WorkflowTemplate }
  | { kind: "form"; id: string; template: FormTemplate };

type DisplayChannel = TemplateChannel | "FORM";

const CHANNEL_ICON: Record<DisplayChannel, typeof Mail> = {
  EMAIL: Mail,
  FORM: ClipboardList,
};

const CHANNEL_LABEL: Record<DisplayChannel, string> = {
  EMAIL: "EMAIL",
  FORM: "FORM",
};

const SCOPE_TAB: Record<TemplateScope, "my" | "organization" | "community"> = {
  PERSONAL: "my",
  TENANT: "organization",
  COMMUNITY: "community",
};

const SCOPE_BADGE_LABEL: Record<TemplateScope, string> = {
  PERSONAL: "Only me",
  TENANT: "Everyone at org",
  COMMUNITY: "Everyone on platform",
};

function formatEditedOn(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function channelOf(row: TemplateRow): DisplayChannel {
  return row.kind === "message" ? row.template.channel : "FORM";
}

export function TemplatesBoard({
  initialTemplates,
  initialFormTemplates,
  viewerRole = "CONSULTANT",
  tenant,
}: {
  initialTemplates: WorkflowTemplate[];
  initialFormTemplates: FormTemplate[];
  // SUPER_ADMIN only ever authors COMMUNITY message templates (no
  // ConsultantProfile to own a PERSONAL/TENANT row, and form templates have
  // no COMMUNITY moderation path yet) — mirrors WorkflowsBoard's viewerRole.
  viewerRole?: "CONSULTANT" | "TENANT_ADMIN" | "SUPER_ADMIN";
  // Explicit tenant context for the SUPER_ADMIN "Templates" page, which has
  // no home tenant of its own; omitted elsewhere.
  tenant?: TemplateTenantParam;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [rows, setRows] = useState<TemplateRow[]>([
    ...initialTemplates.map((template): TemplateRow => ({
      kind: "message",
      id: template.id,
      template,
    })),
    ...initialFormTemplates.map((template): TemplateRow => ({
      kind: "form",
      id: template.id,
      template,
    })),
  ]);

  const base = pathname.replace(/\/$/, "");
  const isSuperAdmin = viewerRole === "SUPER_ADMIN";
  // Only a real (non-"platform") tenant object needs to be carried via query
  // params — the top-level SUPER_ADMIN "Templates" page's editor route
  // hardcodes tenant="platform" itself, since its templates are tenant_id
  // null and there's nothing to pass.
  const tenantQuery =
    tenant && typeof tenant === "object"
      ? `?tenantId=${encodeURIComponent(tenant.tenantId)}${
          tenant.tenantSlug ? `&tenantSlug=${encodeURIComponent(tenant.tenantSlug)}` : ""
        }`
      : "";

  function openEditor(row: TemplateRow) {
    router.push(
      (row.kind === "form" ? `${base}/forms/${row.id}` : `${base}/${row.id}`) + tenantQuery
    );
  }

  async function removeTemplate(row: TemplateRow) {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    try {
      if (row.kind === "form") await deleteFormTemplate(row.id);
      else await deleteWorkflowTemplate(row.id, tenant);
    } catch {
      // Re-fetch on the next navigation will reconcile if this failed silently;
      // restoring the row here would require the original index, which isn't
      // worth tracking for a rare failure case.
    }
  }

  const grouped: Record<"my" | "organization" | "community", TemplateRow[]> = {
    my: [],
    organization: [],
    community: [],
  };
  for (const row of rows) {
    grouped[SCOPE_TAB[row.template.scope]].push(row);
  }

  function renderGrid(items: TemplateRow[]) {
    if (items.length === 0) {
      return (
        <p className="py-10 text-center text-sm text-muted-foreground">No templates here yet.</p>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((row) => {
          const { template } = row;
          const channel = channelOf(row);
          const Icon = CHANNEL_ICON[channel];
          return (
            <Card
              key={row.id}
              size="sm"
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openEditor(row)}
            >
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </span>
                  {template.isOwn && (
                    <Popover>
                      <PopoverTrigger
                        aria-label={`More actions for ${template.name}`}
                        onClick={(event) => event.stopPropagation()}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        className="w-40 p-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => removeTemplate(row)}
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                        >
                          Delete
                        </button>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
                <div>
                  <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {CHANNEL_LABEL[channel]} &middot; Edited {formatEditedOn(template.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {!template.isOwn && template.consultant && (
                      <>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                          {template.consultant.fullName.slice(0, 2).toUpperCase()}
                        </span>
                        Shared by {template.consultant.fullName}
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {template.isOwn &&
                      template.scope === "COMMUNITY" &&
                      template.status !== "APPROVED" && (
                        <Badge
                          className={
                            template.status === "PENDING"
                              ? "border-amber-500 text-amber-600"
                              : "border-destructive text-destructive"
                          }
                          variant="outline"
                        >
                          {template.status === "PENDING" ? "Pending review" : "Rejected"}
                        </Badge>
                      )}
                    <Badge variant="outline">{SCOPE_BADGE_LABEL[template.scope]}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  const newTemplateMenu = (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New template
          </Button>
        }
      />
      <PopoverContent align="end" className="w-56 p-1">
        <button
          type="button"
          onClick={() => router.push(`${base}/new${tenantQuery}`)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
        >
          <Mail className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-medium text-foreground">Message template</p>
            <p className="text-xs text-muted-foreground">Email</p>
          </div>
        </button>
        {!isSuperAdmin && (
          <button
            type="button"
            onClick={() => router.push(`${base}/forms/new`)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
          >
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Intake form</p>
              <p className="text-xs text-muted-foreground">
                Fields a client fills out, used in workflows
              </p>
            </div>
          </button>
        )}
      </PopoverContent>
    </Popover>
  );

  // SUPER_ADMIN only ever creates/sees COMMUNITY message templates — the
  // My/Organization/Community tab split has nothing to split, so it renders
  // as a single flat grid instead (same simplification WorkflowsBoard makes
  // for its own SUPER_ADMIN view).
  if (isSuperAdmin) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Templates</h2>
          {newTemplateMenu}
        </div>
        {renderGrid(rows)}
      </div>
    );
  }

  return (
    <Tabs defaultValue="my" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Templates</h2>
          {newTemplateMenu}
        </div>
        <TabsList variant="line" className="border-b border-border pb-1">
          <TabsTrigger value="my">My templates</TabsTrigger>
          <TabsTrigger value="organization">Organization templates</TabsTrigger>
          <TabsTrigger value="community">Community templates</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="my">{renderGrid(grouped.my)}</TabsContent>
      <TabsContent value="organization">{renderGrid(grouped.organization)}</TabsContent>
      <TabsContent value="community">{renderGrid(grouped.community)}</TabsContent>
    </Tabs>
  );
}
