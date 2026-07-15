"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { updateCaseRequirements } from "@/lib/api/case-detail.client";

export function CaseRequirements({
  caseId,
  requirements,
}: {
  caseId: string;
  requirements: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(requirements ?? "");
  const [saved, setSaved] = useState(requirements);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateCaseRequirements(caseId, draft.trim());
      setSaved(draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          Client Requirements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Describe what this client needs..."
              rows={4}
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="w-fit" onClick={handleSave} disabled={saving}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-fit"
                onClick={() => {
                  setDraft(saved ?? "");
                  setEditing(false);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {saved || "No requirements captured yet."}
            </p>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setEditing(true)}>
              {saved ? "Edit" : "Add requirements"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
