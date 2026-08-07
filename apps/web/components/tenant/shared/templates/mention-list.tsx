"use client";

import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";

import type { MergeField } from "@/lib/constants/merge-fields";
import { cn } from "@/lib/utils";

export interface MentionListProps {
  items: MergeField[];
  command: (item: { id: string; label: string }) => void;
}

export interface MentionListHandle {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

// The popup rendered by mention-suggestion.ts's slash-command config
// (Sprint 5.5.2 item 3) — keyboard nav is imperative because the suggestion
// plugin owns the editor's key events, not React's.
export const MentionList = forwardRef<MentionListHandle, MentionListProps>(function MentionList(
  { items, command },
  ref
) {
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  function select(index: number) {
    const item = items[index];
    if (item) command({ id: item.id, label: item.label });
  }

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }) {
      if (event.key === "ArrowDown") {
        setSelected((prev) => (prev + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((prev) => (prev - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        select(selected);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="mention-suggestion-popup">
        <p className="px-2 py-1.5 text-sm text-muted-foreground">No merge fields found</p>
      </div>
    );
  }

  return (
    <div className="mention-suggestion-popup">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => select(index)}
          className={cn(
            "flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm",
            index === selected ? "bg-muted" : "hover:bg-muted"
          )}
        >
          <span className="font-medium text-foreground">{item.label}</span>
          <span className="text-xs text-muted-foreground">{item.id}</span>
        </button>
      ))}
    </div>
  );
});
