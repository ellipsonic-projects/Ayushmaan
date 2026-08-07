"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ClipboardList, MoreVertical, Plus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormTemplate, FormTemplateScope } from "@/lib/api/form-templates.server";
import { deleteFormTemplate } from "@/lib/api/form-templates.client";
import { listSchemaFields } from "@/lib/forms/schema-fields";

const SCOPE_TAB: Record<FormTemplateScope, "my" | "organization" | "community"> = {
  PERSONAL: "my",
  TENANT: "organization",
  COMMUNITY: "community",
};

const SCOPE_BADGE_LABEL: Record<FormTemplateScope, string> = {
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

export function FormsBoard({ initialTemplates }: { initialTemplates: FormTemplate[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const [templates, setTemplates] = useState(initialTemplates);

  function openEditor(templateId?: string) {
    const base = pathname.replace(/\/$/, "");
    router.push(templateId ? `${base}/${templateId}` : `${base}/new`);
  }

  async function removeTemplate(id: string) {
    setTemplates((prev) => prev.filter((template) => template.id !== id));
    try {
      await deleteFormTemplate(id);
    } catch {
      // Re-fetch on next navigation reconciles a rare failed delete.
    }
  }

  const grouped: Record<"my" | "organization" | "community", FormTemplate[]> = {
    my: [],
    organization: [],
    community: [],
  };
  for (const template of templates) {
    grouped[SCOPE_TAB[template.scope]].push(template);
  }

  function renderGrid(rows: FormTemplate[]) {
    if (rows.length === 0) {
      return (
        <p className="py-10 text-center text-sm text-muted-foreground">No intake forms here yet.</p>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((template) => (
          <Card
            key={template.id}
            size="sm"
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => openEditor(template.id)}
          >
            <CardContent className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <ClipboardList className="h-4 w-4 text-muted-foreground" />
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
                        onClick={() => removeTemplate(template.id)}
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
                  {(() => {
                    const count = listSchemaFields(template.jsonSchema, template.uiSchema).length;
                    return `${count} field${count === 1 ? "" : "s"}`;
                  })()}{" "}
                  · Edited {formatEditedOn(template.updatedAt)}
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
                <Badge variant="outline">{SCOPE_BADGE_LABEL[template.scope]}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Tabs defaultValue="my" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Intake Forms</h2>
          <Button size="sm" className="gap-1.5" onClick={() => openEditor()}>
            <Plus className="h-4 w-4" />
            New form
          </Button>
        </div>
        <TabsList variant="line" className="border-b border-border pb-1">
          <TabsTrigger value="my">My forms</TabsTrigger>
          <TabsTrigger value="organization">Organization forms</TabsTrigger>
          <TabsTrigger value="community">Community forms</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="my">{renderGrid(grouped.my)}</TabsContent>
      <TabsContent value="organization">{renderGrid(grouped.organization)}</TabsContent>
      <TabsContent value="community">{renderGrid(grouped.community)}</TabsContent>
    </Tabs>
  );
}
