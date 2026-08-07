"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_CHARS = 500;

export function MessageComposer({
  title,
  onTitleChange,
  body,
  onBodyChange,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  body: string;
  onBodyChange: (value: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          3. Message Composer
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Subject / Heading</Label>
          <Input
            placeholder="Enter broadcast headline..."
            className="h-9"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Content Body</Label>
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Draft your detailed message here."
            rows={5}
            className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <div className="flex items-center justify-end">
            <span className="text-xs text-muted-foreground">
              Characters: {body.length} / {MAX_CHARS}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
