"use client";

import { BookOpen, Inbox, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 5.04c1.62 0 3.06.56 4.2 1.64l3.12-3.12C17.44 1.8 14.94.75 12 .75 7.55.75 3.72 3.3 1.85 7.02l3.66 2.84C6.4 7.14 8.97 5.04 12 5.04z"
      />
      <path
        fill="#4285F4"
        d="M23.25 12.27c0-.93-.08-1.6-.26-2.3H12v4.35h6.44c-.13 1.08-.83 2.7-2.39 3.79l3.57 2.77c2.14-1.97 3.63-4.88 3.63-8.61z"
      />
      <path
        fill="#FBBC05"
        d="M5.52 14.14a6.98 6.98 0 0 1-.38-2.14c0-.75.14-1.47.36-2.14L1.85 7.02A11.21 11.21 0 0 0 .75 12c0 1.8.43 3.5 1.1 4.98l3.67-2.84z"
      />
      <path
        fill="#34A853"
        d="M12 23.25c3.04 0 5.59-1 7.45-2.72l-3.57-2.77c-.95.66-2.23 1.13-3.88 1.13-3.03 0-5.6-2.1-6.5-4.9l-3.65 2.84c1.86 3.72 5.7 6.42 10.15 6.42z"
      />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <rect x="1" y="1" width="10.5" height="10.5" fill="#F25022" />
      <rect x="12.5" y="1" width="10.5" height="10.5" fill="#7FBA00" />
      <rect x="1" y="12.5" width="10.5" height="10.5" fill="#00A4EF" />
      <rect x="12.5" y="12.5" width="10.5" height="10.5" fill="#FFB900" />
    </svg>
  );
}

export function ConnectInboxDialog({
  open,
  onOpenChange,
  onConnect,
  connecting = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (provider: "google") => void;
  connecting?: boolean;
}) {
  const providers = [
    {
      id: "google" as const,
      name: "Google",
      description: "Add a Gmail account or Google group list",
      logo: <GoogleLogo />,
      disabled: false,
    },
    {
      id: "microsoft" as const,
      name: "Microsoft",
      description: "Coming soon",
      logo: <MicrosoftLogo />,
      disabled: true,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Connect inbox
          </DialogTitle>
          <DialogDescription>
            Connect your apps to seamlessly send, receive, and track all your communications in one
            centralized place.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Mail className="h-4 w-4" />
            Email
          </span>
          <div className="grid grid-cols-2 gap-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex flex-col gap-2 rounded-lg border border-border p-3"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {provider.logo}
                  {provider.name}
                </span>
                <p className="flex-1 text-xs text-muted-foreground">{provider.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-primary"
                  disabled={provider.disabled || (provider.id === "google" && connecting)}
                  onClick={() => provider.id === "google" && onConnect(provider.id)}
                >
                  {provider.id === "google" && connecting ? "Connecting…" : "Connect"}
                </Button>
              </div>
            ))}
          </div>
          <a
            href="#"
            className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <BookOpen className="h-4 w-4" />
            Guide to set up inbox account
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
