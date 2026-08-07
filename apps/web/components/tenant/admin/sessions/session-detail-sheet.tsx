"use client";

import { format } from "date-fns";
import Link from "next/link";
import { Pencil, RotateCcw, Trash2, ChevronRight } from "lucide-react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { SessionEvent } from "@/components/tenant/consultant/sessions/session-data";
import { useTenantSlug } from "@/lib/tenant/slug-context";

export function SessionDetailSheet({
  event,
  onOpenChange,
}: {
  event: SessionEvent | null;
  onOpenChange: (open: boolean) => void;
}) {
  const slug = useTenantSlug();

  return (
    <Sheet open={event !== null} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        {event && (
          <>
            <SheetHeader className="pr-16">
              <SheetTitle>{event.title.replace(" - ", " - ")}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                {format(event.start, "EEE, dd MMM")} &middot; {format(event.start, "h:mm a")}{" "}
                &ndash; {format(event.end, "h:mm a")} &middot; Doesn&apos;t repeat
              </p>
            </SheetHeader>

            <div className="flex items-center gap-1 border-b border-border px-4 pb-3">
              <Button variant="ghost" size="icon-sm" aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Reschedule">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete"
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Attendees</h3>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                      {event.consultantName
                        ? event.consultantName
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()
                        : "AA"}
                    </span>
                    <span className="text-foreground">{event.consultantName ?? "You"}</span>
                    {event.consultantName && (
                      <Badge variant="outline" className="text-muted-foreground">
                        Consultant
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border p-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                        {event.clientName
                          .split(" ")
                          .map((p) => p[0])
                          .join("")}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-primary">
                            {event.clientName}
                          </span>
                          <Badge variant="outline" className="text-muted-foreground">
                            {event.clientStatus}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span>{event.clientCode}</span>
                          <Badge
                            variant="outline"
                            className={
                              event.paymentStatus === "Paid"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-400"
                                : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400"
                            }
                          >
                            {event.paymentStatus}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge className="bg-primary text-primary-foreground">
                        {event.appointmentStatus}
                      </Badge>
                      <Link href={`/${slug}/tenant/admin/cases/${event.caseId}`}>
                        <button
                          type="button"
                          className="flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                        >
                          View
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Services</h3>
                <div className="flex items-center justify-between rounded-lg border-l-4 border-l-primary bg-muted/40 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{event.serviceName}</p>
                    <p className="text-xs text-muted-foreground">{event.serviceDuration}</p>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{event.servicePrice}</p>
                </div>
              </div>

              <div>
                <h3 className="mb-1 text-sm font-semibold text-foreground">Description</h3>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            </div>

            <SheetFooter className="border-t border-border">
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-semibold text-foreground">Total</span>
                <span className="text-muted-foreground">
                  {event.serviceDuration} &middot;{" "}
                  <span className="font-semibold text-foreground">{event.servicePrice}</span>
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1">
                  Create note
                </Button>
                <Button className="flex-1">Create invoice</Button>
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
