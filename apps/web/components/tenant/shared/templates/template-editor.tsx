"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import { TableKit } from "@tiptap/extension-table";
import { FontFamily, TextStyle } from "@tiptap/extension-text-style";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  FileText,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  MoreVertical,
  Redo2,
  Table as TableIcon,
  Tag,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToolbarButton, ToolbarDivider } from "@/components/tenant/shared/tiptap-toolbar";
import { mentionSuggestion } from "@/components/tenant/shared/templates/mention-suggestion";
import { cn } from "@/lib/utils";
import type { TemplateScope, WorkflowTemplate } from "@/lib/api/workflow-templates.server";
import {
  createWorkflowTemplate,
  updateWorkflowTemplate,
  type TemplateTenantParam,
  type WorkflowTemplateInput,
} from "@/lib/api/workflow-templates.client";

// A deliberate, visible three-option control (Sprint 5.5.2 item 5) — not a
// hidden default, since it changes who can see the content.
const SCOPE_OPTIONS: { value: TemplateScope; label: string }[] = [
  { value: "PERSONAL", label: "Only me" },
  { value: "TENANT", label: "Everyone at org" },
  { value: "COMMUNITY", label: "Everyone on platform" },
];

const fonts = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"];

type SaveState = "idle" | "saving" | "saved" | "error";

export function TemplateEditor({
  initialTemplate,
  viewerRole = "CONSULTANT",
  tenant,
}: {
  initialTemplate?: WorkflowTemplate;
  // A SUPER_ADMIN carries no ConsultantProfile — every template they author
  // is forced to COMMUNITY scope, mirroring workflow-templates.router.ts's
  // POST handler. Mirrors WorkflowsBoard's viewerRole.
  viewerRole?: "CONSULTANT" | "TENANT_ADMIN" | "SUPER_ADMIN";
  // Explicit tenant context for the SUPER_ADMIN "Templates" page, which has
  // no home tenant of its own; omitted elsewhere.
  tenant?: TemplateTenantParam;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isSuperAdmin = viewerRole === "SUPER_ADMIN";

  // Row not owned by the caller (reachable only via a direct URL, since
  // templates-board.tsx already hides the edit affordance) — read-only,
  // workflow_templates_update_policy would reject any save attempt anyway.
  const readOnly = Boolean(initialTemplate && !initialTemplate.isOwn);

  const [name, setName] = useState(initialTemplate?.name ?? "");
  const [scope, setScope] = useState<TemplateScope>(
    initialTemplate?.scope ?? (isSuperAdmin ? "COMMUNITY" : "PERSONAL")
  );
  const [subject, setSubject] = useState(initialTemplate?.subject ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");

  const templateIdRef = useRef(initialTemplate?.id ?? null);
  // Mutated directly by each field's own change handler below (never read
  // during render) so saveNow() always sees the latest values without
  // re-subscribing the editor's blur listener on every keystroke.
  const fieldsRef = useRef({ name, scope, subject });
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      editable: !readOnly,
      content: initialTemplate?.content,
      extensions: [
        StarterKit,
        TextStyle,
        FontFamily,
        Highlight,
        Image,
        Link.configure({ openOnClick: false }),
        Mention.configure({
          suggestion: mentionSuggestion,
          renderHTML: ({ node }) => [
            "span",
            { class: "mention", "data-type": "mention", "data-id": node.attrs.id },
            `{{${node.attrs.label ?? node.attrs.id}}}`,
          ],
          renderText: ({ node }) => `{{${node.attrs.id}}}`,
        }),
        TableKit.configure({ table: { resizable: true } }),
        TextAlign.configure({ types: ["heading", "paragraph"] }),
        Placeholder.configure({
          placeholder: "Start writing, or type / to insert a merge field like a client's name.",
        }),
      ],
      editorProps: {
        attributes: {
          class: "tiptap-template min-h-[70svh] p-10 text-sm outline-none text-foreground",
        },
      },
      onUpdate: () => scheduleSave(),
    },
    [readOnly]
  );

  const saveNow = useCallback(async () => {
    if (!editor || readOnly) return;
    const fields = fieldsRef.current;
    if (!fields.name.trim()) return;

    setSaveState("saving");
    const payload: WorkflowTemplateInput = {
      name: fields.name.trim(),
      channel: "EMAIL",
      scope: fields.scope,
      subject: fields.subject.trim() || undefined,
      content: editor.getJSON(),
    };

    try {
      if (templateIdRef.current) {
        await updateWorkflowTemplate(templateIdRef.current, payload, tenant);
      } else {
        const created = await createWorkflowTemplate(payload, tenant);
        templateIdRef.current = created.id;
        const basePath = pathname.replace(/\/[^/]+$/, "");
        router.replace(`${basePath}/${created.id}`);
      }
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [editor, readOnly, pathname, router, tenant]);

  function scheduleSave() {
    if (readOnly) return;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(saveNow, 800);
  }

  function saveImmediately() {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveNow();
  }

  // Offline-safe like the interaction-note draft buffer (lib/offline-drafts.ts)
  // in spirit — a failed save just leaves saveState as "error" rather than
  // losing the edit, since the content stays live in the editor and the next
  // successful autosave (on the next keystroke/blur) will retry it.
  useEffect(() => {
    if (!editor) return;
    editor.on("blur", saveImmediately);
    return () => {
      editor.off("blur", saveImmediately);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  function handleScopeChange(value: TemplateScope) {
    setScope(value);
    fieldsRef.current.scope = value;
    saveImmediately();
  }

  const paragraphValue = editor?.isActive("heading", { level: 1 })
    ? "h1"
    : editor?.isActive("heading", { level: 2 })
      ? "h2"
      : editor?.isActive("heading", { level: 3 })
        ? "h3"
        : "p";

  const fontValue = editor?.getAttributes("textStyle").fontFamily ?? "Arial";

  function setParagraphStyle(value: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "p") chain.setParagraph().run();
    else chain.toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
  }

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
  }

  function addImage() {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  function insertMergeField() {
    editor?.chain().focus().insertContent("/").run();
  }

  return (
    <div data-tour="admin-template-editor" className="flex min-h-svh flex-col bg-muted/40">
      {/* Window title bar */}
      <div className="flex h-11 shrink-0 items-center gap-3 bg-foreground px-3 text-background">
        <button
          type="button"
          aria-label="Close editor"
          onClick={() => router.back()}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-background/10"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4" />
          {name.trim() || "Untitled template"}
        </span>
      </div>

      {readOnly && (
        <div className="border-b border-border bg-amber-50 px-6 py-2 text-sm text-amber-700 dark:bg-amber-950 dark:text-amber-400">
          You don&apos;t own this template — it&apos;s read-only.
        </div>
      )}

      {/* Title, channel/scope selectors and actions */}
      <div className="flex flex-col gap-3 px-6 pt-5 pb-3">
        <div className="flex items-start justify-between gap-4">
          <input
            value={name}
            disabled={readOnly}
            onChange={(event) => {
              setName(event.target.value);
              fieldsRef.current.name = event.target.value;
              scheduleSave();
            }}
            onBlur={saveImmediately}
            placeholder="Untitled template"
            aria-label="Template name"
            className="w-full min-w-0 flex-1 bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/60 disabled:text-muted-foreground"
          />
          <div className="flex shrink-0 items-center gap-2">
            {saveState === "saving" && (
              <Badge variant="outline" className="text-muted-foreground">
                Saving…
              </Badge>
            )}
            {saveState === "saved" && (
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
              >
                Saved
              </Badge>
            )}
            {saveState === "error" && (
              <Badge
                variant="outline"
                className="border-destructive/40 bg-destructive/10 text-destructive"
              >
                Couldn&apos;t save
              </Badge>
            )}
            {!readOnly && (
              <Button size="sm" onClick={saveImmediately}>
                Save template
              </Button>
            )}
            <Popover>
              <PopoverTrigger
                aria-label="More actions"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <MoreVertical className="h-4 w-4" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-44 p-1">
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => editor?.commands.clearContent(true)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  Clear content
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
                >
                  Discard
                </button>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isSuperAdmin ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Visible to</span>
              <span className="text-xs text-muted-foreground">
                Everyone on platform (Community)
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Visible to</span>
              <div className="flex rounded-md border border-border p-0.5">
                {SCOPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    disabled={readOnly}
                    onClick={() => handleScopeChange(option.value)}
                    className={cn(
                      "rounded px-2 py-1 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
                      scope === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            value={subject}
            disabled={readOnly}
            onChange={(event) => {
              setSubject(event.target.value);
              fieldsRef.current.subject = event.target.value;
              scheduleSave();
            }}
            onBlur={saveImmediately}
            placeholder="Email subject"
            aria-label="Email subject"
            className="h-8 min-w-40 flex-1 rounded-md border border-input bg-transparent px-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-y border-border bg-background px-4 py-1.5">
        <div className="flex flex-1 flex-wrap items-center justify-center gap-0.5">
          <ToolbarButton label="Undo" onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <Select
            value={paragraphValue}
            onValueChange={(value) => value && setParagraphStyle(value)}
          >
            <SelectTrigger size="sm" className="w-16 border-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p">P</SelectItem>
              <SelectItem value="h1">H1</SelectItem>
              <SelectItem value="h2">H2</SelectItem>
              <SelectItem value="h3">H3</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={fontValue}
            onValueChange={(value) => value && editor?.chain().focus().setFontFamily(value).run()}
          >
            <SelectTrigger size="sm" className="w-24 border-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {fonts.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToolbarDivider />

          <ToolbarButton
            label="Bold"
            active={editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Italic"
            active={editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Underline"
            active={editor?.isActive("underline")}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Highlight"
            active={editor?.isActive("highlight")}
            onClick={() => editor?.chain().focus().toggleHighlight().run()}
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label="Bulleted list"
            active={editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Numbered list"
            active={editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label="Align left"
            active={editor?.isActive({ textAlign: "left" })}
            onClick={() => editor?.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Align center"
            active={editor?.isActive({ textAlign: "center" })}
            onClick={() => editor?.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Align right"
            active={editor?.isActive({ textAlign: "right" })}
            onClick={() => editor?.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Justify"
            active={editor?.isActive({ textAlign: "justify" })}
            onClick={() => editor?.chain().focus().setTextAlign("justify").run()}
          >
            <AlignJustify className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            label="Insert table"
            active={editor?.isActive("table")}
            onClick={() =>
              editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
          >
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Insert image" onClick={addImage}>
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Insert link" active={editor?.isActive("link")} onClick={setLink}>
            <Link2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Insert merge field" onClick={insertMergeField}>
            <Tag className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex min-h-0 flex-1 justify-center overflow-y-auto px-4 py-8">
        <div
          className="h-fit w-full max-w-2xl cursor-text rounded-lg border border-border bg-background shadow-sm"
          onClick={() => editor?.chain().focus().run()}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}
