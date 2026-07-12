"use client";

import { useState } from "react";
import { Headset, MessageCircle, BookOpen, Quote, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "Book a product expert call", icon: Headset },
  { label: "Chat with our team", icon: MessageCircle },
  { label: "Learn the basics", icon: BookOpen },
];

export function HelpSidebar() {
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {!dismissed && (
        <Card size="sm">
          <CardContent className="relative flex flex-col items-center gap-3 pt-2 text-center">
            <button
              type="button"
              aria-label="Dismiss testimonial"
              onClick={() => setDismissed(true)}
              className="absolute right-0 top-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-lg font-semibold text-muted-foreground">
              GM
            </span>
            <Quote className="h-4 w-4 text-primary" />
            <p className="text-sm text-foreground">
              Not having to copy and paste events from my practice software, to my work Google
              account, to my personal calendar has been amazing.
            </p>
            <div>
              <p className="text-sm font-semibold text-foreground">Gillian Makowski</p>
              <p className="text-xs text-muted-foreground">Independent Consultant</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Need a hand?</h3>
        <div className="flex flex-col gap-2">
          {actions.map(({ label, icon: Icon }) => (
            <Button key={label} variant="outline" className="w-full justify-start gap-2.5">
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
