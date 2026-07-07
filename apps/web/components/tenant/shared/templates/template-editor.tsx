"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
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
  PencilLine,
  Plus,
  Redo2,
  Send,
  Sparkles,
  SquarePlus,
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
import { cn } from "@/lib/utils";

const collections = [
  { value: "notes", label: "Notes" },
  { value: "forms", label: "Forms" },
  { value: "assessments", label: "Assessments" },
  { value: "plans-reports", label: "Plans & reports" },
  { value: "worksheets", label: "Worksheets & handouts" },
  { value: "guidelines", label: "Guidelines" },
];

const fonts = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"];

type AgentMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

const agentSuggestions = [
  "Draft a SOAP note structure",
  "Add a patient intake section",
  "Insert a consent paragraph",
  "Add a 3-column table",
];

export function TemplateEditor() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [collection, setCollection] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [agentOpen, setAgentOpen] = useState(true);
  const [agentInput, setAgentInput] = useState("");
  const [agentThinking, setAgentThinking] = useState(false);
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    {
      id: 0,
      role: "assistant",
      content:
        "Hi! I can help you build this template. Tell me what to add — e.g. “draft a SOAP note structure” or “add a patient intake section”.",
    },
  ]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      Highlight,
      Image,
      TableKit.configure({ table: { resizable: true } }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({
        placeholder:
          "Start writing or add basic blocks to capture client responses. Use slash commands (/) for quick actions.",
      }),
    ],
    editorProps: {
      attributes: {
        class: "tiptap-template min-h-[70svh] p-10 text-sm outline-none text-foreground",
      },
    },
    onUpdate: () => setDirty(true),
  });

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

  function handleSave() {
    // Persistence is not wired up yet; editor.getHTML() holds the template body.
    setDirty(false);
  }

  // Frontend-only agent: applies common template-building intents directly through
  // Tiptap commands. Swap the body of this function for an API call later.
  function runAgent(instruction: string): string {
    if (!editor) return "The editor isn't ready yet — try again in a second.";
    const lower = instruction.toLowerCase();
    const chain = editor.chain().focus("end");

    if (lower.includes("soap")) {
      chain
        .insertContent(
          "<h2>S: Subjective</h2><p>Client-reported symptoms, concerns and history.</p>" +
            "<h2>O: Objective</h2><p>Observable findings, measurements and test results.</p>" +
            "<h2>A: Assessment</h2><p>Clinical interpretation of subjective and objective data.</p>" +
            "<h2>P: Plan</h2><p>Next steps, interventions and follow-up schedule.</p>"
        )
        .run();
      return "Added a SOAP note structure with Subjective, Objective, Assessment and Plan sections.";
    }

    if (lower.includes("intake")) {
      chain
        .insertContent(
          "<h2>Patient intake</h2><ul><li>Full name</li><li>Date of birth</li><li>Contact details</li><li>Reason for visit</li><li>Current medications</li><li>Allergies</li></ul>"
        )
        .run();
      return "Added a patient intake section with the standard fields.";
    }

    if (lower.includes("consent")) {
      chain
        .insertContent(
          "<h2>Consent</h2><p>I consent to receive consultation services and understand that I may withdraw this consent at any time. I acknowledge that my personal health information will be handled confidentially in accordance with applicable regulations.</p>"
        )
        .run();
      return "Inserted a consent paragraph you can edit to match your practice.";
    }

    if (lower.includes("table")) {
      const cols = lower.includes("2") ? 2 : lower.includes("4") ? 4 : 3;
      chain.insertTable({ rows: 3, cols, withHeaderRow: true }).run();
      return `Inserted a table with ${cols} columns and a header row.`;
    }

    if (lower.includes("clear") || lower.includes("start over")) {
      editor.commands.clearContent(true);
      return "Cleared the template so you can start over.";
    }

    chain
      .insertContent(`<h2>${instruction}</h2><p>Describe this section here.</p>`)
      .run();
    return `Added a "${instruction}" section. The agent isn't connected to an AI backend yet, so I scaffolded it as a heading for now.`;
  }

  function sendToAgent(raw?: string) {
    const instruction = (raw ?? agentInput).trim();
    if (!instruction || agentThinking) return;
    setAgentInput("");
    setAgentThinking(true);
    setAgentMessages((prev) => [
      ...prev,
      { id: Date.now(), role: "user", content: instruction },
    ]);
    // Simulated latency so the interaction reads like an agent turn.
    window.setTimeout(() => {
      const reply = runAgent(instruction);
      setDirty(true);
      setAgentMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", content: reply },
      ]);
      setAgentThinking(false);
    }, 600);
  }

  return (
    <div className="flex min-h-svh flex-col bg-muted/40">
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
          {title.trim() || "Untitled template"}
        </span>
      </div>

      {/* Title, description and actions */}
      <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setDirty(true);
            }}
            placeholder="Untitled template"
            aria-label="Template title"
            className="w-full bg-transparent text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/60"
          />
          <input
            value={description}
            onChange={(event) => {
              setDescription(event.target.value);
              setDirty(true);
            }}
            placeholder="Template description"
            aria-label="Template description"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dirty && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
              Unsaved changes
            </Badge>
          )}
          <Button size="sm" onClick={handleSave}>
            Save template
          </Button>
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
                onClick={() => editor?.commands.clearContent(true)}
                className="w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
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

      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-y border-border bg-background px-4 py-1.5">
        <Select value={collection} onValueChange={(value) => value && setCollection(value)}>
          <SelectTrigger size="sm" className="w-44 border-none">
            <SelectValue placeholder="Choose collection" />
          </SelectTrigger>
          <SelectContent>
            {collections.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToolbarDivider />

        <div className="flex flex-1 flex-wrap items-center justify-center gap-0.5">
          <ToolbarButton label="Add block">
            <SquarePlus className="h-4 w-4 text-primary" />
          </ToolbarButton>
          <ToolbarButton label="Add field">
            <Plus className="h-4 w-4 text-primary" />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton label="Undo" onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton label="Redo" onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>

          <ToolbarDivider />

          <Select value={paragraphValue} onValueChange={(value) => value && setParagraphStyle(value)}>
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
          <ToolbarButton label="Insert tag">
            <Tag className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <ToolbarDivider />

        <button
          type="button"
          onClick={() => setAgentOpen((open) => !open)}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-md px-2 text-sm font-medium transition-colors",
            agentOpen
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" />
          AI Agent
        </button>
        <Badge className="gap-1 px-2 py-1">
          <PencilLine className="h-3 w-3" />
          Editor
        </Badge>
      </div>

      {/* Canvas + agent panel */}
      <div className="flex min-h-0 flex-1">
        <div className="flex flex-1 justify-center overflow-y-auto px-4 py-8">
          <div
            className="h-fit w-full max-w-2xl cursor-text rounded-lg border border-border bg-background shadow-sm"
            onClick={() => editor?.chain().focus().run()}
          >
            <EditorContent editor={editor} />
          </div>
        </div>

        {agentOpen && (
          <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                AI Agent
              </span>
              <button
                type="button"
                aria-label="Close AI agent"
                onClick={() => setAgentOpen(false)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
              {agentMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[90%] rounded-lg px-3 py-2 text-sm leading-5",
                    message.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-muted text-foreground"
                  )}
                >
                  {message.content}
                </div>
              ))}
              {agentThinking && (
                <div className="self-start rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Thinking&hellip;
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {agentSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => sendToAgent(suggestion)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                sendToAgent();
              }}
              className="flex items-center gap-2 border-t border-border px-4 py-3"
            >
              <input
                value={agentInput}
                onChange={(event) => setAgentInput(event.target.value)}
                placeholder="Ask the agent to edit the template…"
                aria-label="Message the AI agent"
                className="h-9 flex-1 rounded-lg border border-input bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <Button type="submit" size="sm" aria-label="Send" disabled={agentThinking}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </aside>
        )}
      </div>
    </div>
  );
}
