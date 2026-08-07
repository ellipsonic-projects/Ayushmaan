"use client";

import { useState } from "react";
import { Tag as TagIcon, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { updateCaseTags } from "@/lib/api/case-detail.client";

// Consultant's own CRM segmentation (schema §3.11 `cases.tags[]`) — private,
// never shared tenant-wide. Full-replace PATCH on every add/remove.
export function CaseTagsManager({ caseId, tags: initialTags }: { caseId: string; tags: string[] }) {
  const [tags, setTags] = useState(initialTags);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  async function persist(next: string[]) {
    setSaving(true);
    try {
      await updateCaseTags(caseId, next);
      setTags(next);
    } finally {
      setSaving(false);
    }
  }

  function handleAdd() {
    const value = draft.trim();
    if (!value || tags.includes(value)) {
      setDraft("");
      return;
    }
    setDraft("");
    void persist([...tags, value]);
  }

  function handleRemove(tag: string) {
    void persist(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <TagIcon className="h-3.5 w-3.5" />
        Tags
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="outline" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => handleRemove(tag)}
              disabled={saving}
              aria-label={`Remove tag ${tag}`}
              className="rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleAdd();
          }
        }}
        placeholder="Add a tag and press Enter"
        disabled={saving}
        className="h-8 text-sm"
      />
    </div>
  );
}
