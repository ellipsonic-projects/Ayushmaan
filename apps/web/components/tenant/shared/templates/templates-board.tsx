"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileText, Folder, MoreVertical, Plus } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type TemplateCard = {
  id: string;
  name: string;
  type: string;
  editedOn: string;
  author: string;
  active: boolean;
};

const folders = [{ id: "intake", name: "Intake", count: 0 }];

const initialTemplates: TemplateCard[] = [
  { id: "soap-note", name: "SOAP Note", type: "Forms", editedOn: "Jul 6, 2026", author: "AA", active: true },
  { id: "testimonial-release", name: "Testimonial Release Form", type: "Forms", editedOn: "Jul 6, 2026", author: "AA", active: true },
  { id: "release-of-info", name: "Release of Information Form", type: "Forms", editedOn: "Jul 6, 2026", author: "AA", active: true },
  { id: "hand-profile", name: "Hand Profile", type: "Forms", editedOn: "Jul 6, 2026", author: "AA", active: true },
  { id: "insurance-info", name: "Insurance information form", type: "Forms", editedOn: "Jul 6, 2026", author: "AA", active: true },
  { id: "credit-card-auth", name: "Credit Card Authorization", type: "Forms", editedOn: "Jul 6, 2026", author: "AA", active: true },
];

export function TemplatesBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const [templates, setTemplates] = useState(initialTemplates);

  function openEditor(templateId?: string) {
    const base = pathname.replace(/\/$/, "");
    router.push(templateId ? `${base}/new?from=${templateId}` : `${base}/new`);
  }

  function toggleActive(id: string) {
    setTemplates((prev) =>
      prev.map((template) =>
        template.id === id ? { ...template, active: !template.active } : template
      )
    );
  }

  function removeTemplate(id: string) {
    setTemplates((prev) => prev.filter((template) => template.id !== id));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Templates</h2>
        <Button size="sm" className="gap-1.5" onClick={() => openEditor()}>
          <Plus className="h-4 w-4" />
          New template
        </Button>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Folders</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {folders.map((folder) => (
            <Card key={folder.id} size="sm">
              <CardContent className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Folder className="h-4 w-4 text-muted-foreground" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{folder.name}</p>
                  <p className="text-xs text-muted-foreground">{folder.count} Files</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <button
            type="button"
            aria-label="New folder"
            className="flex min-h-16 items-center justify-center rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Templates</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card
              key={template.id}
              size="sm"
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openEditor(template.id)}
            >
              <CardContent className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </span>
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
                        onClick={() => toggleActive(template.id)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        {template.active ? "Disable" : "Enable"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeTemplate(template.id)}
                        className="w-full rounded-md px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                      >
                        Delete
                      </button>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <p className="truncate text-sm font-medium text-foreground">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {template.type} &middot; Edited {template.editedOn}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {template.author.slice(0, 2).toUpperCase()}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(!template.active && "text-muted-foreground")}
                  >
                    {template.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
