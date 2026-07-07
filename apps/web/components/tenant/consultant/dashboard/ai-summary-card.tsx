"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const mockSummary = `Across your active caseload, 3 clients need attention this week: Global Logistics Corp is awaiting your Q3 distribution review, MedTech Solutions' merger roadmap session is high priority, and Nexus Labs has an overdue NDA submission. Overall client sentiment is stable, with two upcoming renewals in the next 30 days.`;

export function AiSummaryCard() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  function handleGenerate() {
    setOpen(true);
    setLoading(true);
    setSummary(null);
    setTimeout(() => {
      setSummary(mockSummary);
      setLoading(false);
    }, 1200);
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            AI Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Get an AI-generated overview of your clients, tasks, and priorities for today.
          </p>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleGenerate}>
            <Sparkles className="h-4 w-4" />
            Generate Summary
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              AI Summary
            </DialogTitle>
            <DialogDescription>
              Generated from your current clients, tasks, and appointments.
            </DialogDescription>
          </DialogHeader>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating summary...
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-foreground">{summary}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
