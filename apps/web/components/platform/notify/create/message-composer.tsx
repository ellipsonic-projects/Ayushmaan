"use client";

import { useState } from "react";
import { Bold, Italic, Link2, Image } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const MAX_CHARS = 200;

export function MessageComposer() {
  const [content, setContent] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          3. Message Composer
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Subject / Heading
          </Label>
          <Input placeholder="Enter broadcast headline..." className="h-9" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            Content Body
          </Label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Draft your detailed message here. Support for markdown syntax is enabled."
            rows={5}
            className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm">
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm">
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm">
                <Link2 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm">
                <Image className="h-3.5 w-3.5" />
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">
              Characters: {content.length} / {MAX_CHARS}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
