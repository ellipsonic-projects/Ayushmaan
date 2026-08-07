// Renders a workflow_templates.content Tiptap document against a
// workflow_runs.context object into HTML for the EMAIL channel.
//
// Deliberately hand-rolled rather than depending on any @tiptap/* package
// here — apps/api never renders the editor itself, only walks the JSON
// @tiptap/react (Sprint 5.5.2) produces.

import { resolvePath } from "../lib/workflow-merge-fields";

interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: TiptapMark[];
  text?: string;
  content?: TiptapNode[];
}

export type TemplateChannel = "EMAIL";

// Resolves a `mention` node's merge field (e.g. "client.name",
// "appointment.time") as a dot-path into workflow_runs.context. Missing data
// resolves to an empty string rather than throwing — a run shouldn't fail to
// send because one field in a template wasn't populated in context.
function resolveMergeField(context: Record<string, unknown>, fieldId: string): string {
  const value = resolvePath(context, fieldId);
  return value === null || value === undefined ? "" : String(value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HTML_TAG_BY_MARK: Record<string, string> = {
  bold: "strong",
  italic: "em",
  underline: "u",
};

function renderMarksHtml(marks: TiptapMark[] | undefined, inner: string): string {
  if (!marks?.length) return inner;
  return marks.reduce((html, mark) => {
    if (mark.type === "link" && typeof mark.attrs?.href === "string") {
      return `<a href="${escapeHtml(mark.attrs.href)}">${html}</a>`;
    }
    const tag = HTML_TAG_BY_MARK[mark.type];
    return tag ? `<${tag}>${html}</${tag}>` : html;
  }, inner);
}

function renderChildrenHtml(
  nodes: TiptapNode[] | undefined,
  context: Record<string, unknown>
): string {
  return (nodes ?? []).map((node) => renderNodeHtml(node, context)).join("");
}

function renderNodeHtml(node: TiptapNode, context: Record<string, unknown>): string {
  switch (node.type) {
    case "text":
      return renderMarksHtml(node.marks, escapeHtml(node.text ?? ""));
    case "mention":
      return escapeHtml(resolveMergeField(context, String(node.attrs?.id ?? "")));
    case "hardBreak":
      return "<br/>";
    case "paragraph":
      return `<p>${renderChildrenHtml(node.content, context)}</p>`;
    case "heading": {
      const level = Number(node.attrs?.level ?? 1);
      return `<h${level}>${renderChildrenHtml(node.content, context)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderChildrenHtml(node.content, context)}</ul>`;
    case "orderedList":
      return `<ol>${renderChildrenHtml(node.content, context)}</ol>`;
    case "listItem":
      return `<li>${renderChildrenHtml(node.content, context)}</li>`;
    default:
      return renderChildrenHtml(node.content, context);
  }
}

const BLOCK_NODE_TYPES = new Set(["paragraph", "heading", "listItem"]);

function renderNodeText(node: TiptapNode, context: Record<string, unknown>): string {
  switch (node.type) {
    case "text":
      return node.text ?? "";
    case "mention":
      return resolveMergeField(context, String(node.attrs?.id ?? ""));
    case "hardBreak":
      return "\n";
    default: {
      const inner = (node.content ?? []).map((child) => renderNodeText(child, context)).join("");
      return BLOCK_NODE_TYPES.has(node.type) ? `${inner}\n` : inner;
    }
  }
}

export function renderTemplate(
  content: unknown,
  context: Record<string, unknown>,
  channel: TemplateChannel
): string {
  const doc = content as TiptapNode;
  if (channel === "EMAIL") {
    return renderChildrenHtml(doc?.content, context);
  }
  return (doc?.content ?? [])
    .map((node) => renderNodeText(node, context))
    .join("")
    .replace(/\n+$/, "");
}
