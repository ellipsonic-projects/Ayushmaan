"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { FontFamily, TextStyle } from "@tiptap/extension-text-style";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  CirclePlus,
  Highlighter,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Mail,
  Maximize2,
  Minus,
  Paperclip,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolbarButton, ToolbarDivider } from "@/components/tenant/shared/tiptap-toolbar";
import { cn } from "@/lib/utils";

const fonts = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"];

function InitialsAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary",
        className
      )}
    >
      {initials}
    </span>
  );
}

export function ComposeEmailDialog({
  open,
  onOpenChange,
  fromName,
  fromEmail,
  workspaceName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromName: string;
  fromEmail: string;
  workspaceName: string;
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [dirty, setDirty] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily,
      Highlight,
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content:
      `<p></p><p>--</p><p><strong>${fromName}</strong><br>${workspaceName}</p>` +
      `<p><small>Sent from Ayushman</small></p>`,
    editorProps: {
      attributes: {
        class: "min-h-[38svh] px-1 py-2 text-sm outline-none text-foreground",
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
  const canSend = to.trim().length > 0;

  function setParagraphStyle(value: string) {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (value === "p") chain.setParagraph().run();
    else chain.toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
  }

  function addImage() {
    if (!editor) return;
    const url = window.prompt("Image URL");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }

  function resetAndClose() {
    setTo("");
    setCc("");
    setBcc("");
    setShowCc(false);
    setShowBcc(false);
    setSubject("");
    setDirty(false);
    onOpenChange(false);
  }

  const recipientRow =
    "flex items-center gap-2 border-b border-border py-2 text-sm";
  const recipientInput =
    "flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[85svh] max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
      >
        {/* Window title bar */}
        <div className="flex h-11 shrink-0 items-center gap-3 bg-foreground px-4 text-background">
          <DialogTitle className="flex flex-1 items-center gap-2 text-sm font-medium text-background">
            <Mail className="h-4 w-4" />
            Compose email
          </DialogTitle>
          <button
            type="button"
            aria-label="Minimize"
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-background/10"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Expand"
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-background/10"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <DialogClose
            aria-label="Close compose window"
            className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-background/10"
          >
            <X className="h-4 w-4" />
          </DialogClose>
        </div>

        {/* Recipients */}
        <div className="shrink-0 px-5">
          <div className={recipientRow}>
            <span className="text-muted-foreground">From</span>
            <InitialsAvatar name={fromName} />
            <span className="font-semibold text-foreground">{fromName}</span>
            <span className="text-muted-foreground">{fromEmail}</span>
          </div>
          <div className="border-b border-border py-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">To</span>
              <input
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setDirty(true);
                }}
                aria-label="To"
                className={recipientInput}
              />
              {!showCc && (
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="font-medium text-primary hover:underline"
                >
                  Cc
                </button>
              )}
              {!showBcc && (
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="font-medium text-primary hover:underline"
                >
                  Bcc
                </button>
              )}
            </div>
            {!canSend && (
              <p className="mt-1 text-xs text-destructive">This is required</p>
            )}
          </div>
          {showCc && (
            <div className={recipientRow}>
              <span className="text-muted-foreground">Cc</span>
              <input
                value={cc}
                onChange={(event) => setCc(event.target.value)}
                aria-label="Cc"
                className={recipientInput}
              />
            </div>
          )}
          {showBcc && (
            <div className={recipientRow}>
              <span className="text-muted-foreground">Bcc</span>
              <input
                value={bcc}
                onChange={(event) => setBcc(event.target.value)}
                aria-label="Bcc"
                className={recipientInput}
              />
            </div>
          )}
          <div className={recipientRow}>
            <span className="text-muted-foreground">Subject:</span>
            <input
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setDirty(true);
              }}
              aria-label="Subject"
              className={recipientInput}
            />
          </div>
        </div>

        {/* Formatting toolbar */}
        <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-border px-4 py-1.5">
          <ToolbarButton label="Insert block">
            <CirclePlus className="h-4 w-4 text-primary" />
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
          <ToolbarDivider />
          <ToolbarButton label="Insert image" onClick={addImage}>
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        {/* Body */}
        <div
          className="min-h-0 flex-1 cursor-text overflow-y-auto px-4 py-2"
          onClick={() => editor?.chain().focus().run()}
        >
          <EditorContent editor={editor} />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">
          <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={resetAndClose}>
            Discard
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Attach files">
            <Paperclip className="h-4 w-4" />
          </Button>
          <div className="flex flex-1 items-center justify-end gap-2">
            {dirty && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                Unsaved changes
              </Badge>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <div className="flex items-center">
              <Button
                disabled={!canSend}
                onClick={resetAndClose}
                className="rounded-r-none"
              >
                Send &amp; close
              </Button>
              <Button
                disabled={!canSend}
                aria-label="More send options"
                size="icon"
                className="rounded-l-none border-l border-primary-foreground/20"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
