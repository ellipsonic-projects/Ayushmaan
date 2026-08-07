import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions } from "@tiptap/suggestion";

import { MERGE_FIELDS } from "@/lib/constants/merge-fields";
import { MentionList, type MentionListHandle } from "./mention-list";

// Slash-command (`/`) merge-field insertion (Sprint 5.5.2 item 3), matching
// the mention UX Carepatron uses for template variables. `command` has to be
// supplied here rather than left to Mention's own default — `.configure()`
// replaces the whole `suggestion` object rather than deep-merging it.
export const mentionSuggestion: Omit<SuggestionOptions, "editor"> = {
  char: "/",
  items: ({ query }) => {
    const q = query.toLowerCase();
    return MERGE_FIELDS.filter(
      (field) => field.label.toLowerCase().includes(q) || field.id.toLowerCase().includes(q)
    ).slice(0, 8);
  },
  command: ({ editor, range, props }) => {
    editor
      .chain()
      .focus()
      .insertContentAt(range, [
        { type: "mention", attrs: props },
        { type: "text", text: " " },
      ])
      .run();
  },
  render: () => {
    let component: ReactRenderer<MentionListHandle> | undefined;
    let unmount: (() => void) | undefined;

    return {
      onStart: (props) => {
        component = new ReactRenderer(MentionList, { props, editor: props.editor });
        unmount = props.mount(component.element as HTMLElement);
      },
      onUpdate: (props) => {
        component?.updateProps(props);
      },
      onKeyDown: (props) => {
        if (props.event.key === "Escape") {
          unmount?.();
          return true;
        }
        return component?.ref?.onKeyDown(props) ?? false;
      },
      onExit: () => {
        unmount?.();
        component?.destroy();
      },
    };
  },
};
