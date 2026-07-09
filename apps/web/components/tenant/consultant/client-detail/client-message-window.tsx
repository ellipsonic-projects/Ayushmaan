"use client";

import { useState } from "react";
import { MessageSquare, Maximize2, Minimize2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { InboxWorkspace } from "@/components/tenant/shared/inbox/inbox-workspace";
import { cn } from "@/lib/utils";

export function ClientMessageWindow({ clientName }: { clientName: string }) {
  const [open, setOpen] = useState(false);
  const [maximized, setMaximized] = useState(true);

  function handleOpen() {
    setOpen(true);
    setMaximized(true);
  }

  function handleClose() {
    setOpen(false);
    setMaximized(true);
  }

  function handleMaximize() {
    setMaximized((prev) => !prev);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <MessageSquare className="h-4 w-4" />
        Message
      </Button>

      {open && (
        <div
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-popover shadow-2xl transition-all duration-150",
            maximized ? "inset-6" : "bottom-6 right-6 h-[600px] w-[420px]"
          )}
        >
          <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-3">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
              Message {clientName}
            </p>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={maximized ? "Restore" : "Maximize"}
              onClick={handleMaximize}
            >
              {maximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <InboxWorkspace defaultView="chat" />
          </div>
        </div>
      )}
    </>
  );
}
