"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TourStep } from "./types";
import { useTourStore } from "./tour-store";

const GAP = 14;

function getPositionStyle(rect: DOMRect | null, placement: TourStep["placement"]): CSSProperties {
  if (!rect) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  switch (placement) {
    case "top":
      return {
        top: rect.top - GAP,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, -100%)",
      };
    case "left":
      return {
        top: rect.top + rect.height / 2,
        left: rect.left - GAP,
        transform: "translate(-100%, -50%)",
      };
    case "right":
      return {
        top: rect.top + rect.height / 2,
        left: rect.right + GAP,
        transform: "translate(0, -50%)",
      };
    case "bottom":
    default:
      return {
        top: rect.bottom + GAP,
        left: rect.left + rect.width / 2,
        transform: "translate(-50%, 0)",
      };
  }
}

export function TourTooltip({
  step,
  rect,
  stepIndex,
  stepCount,
}: {
  step: TourStep;
  rect: DOMRect | null;
  stepIndex: number;
  stepCount: number;
}) {
  const pausedAt = useTourStore((s) => s.pausedAt);
  const next = useTourStore((s) => s.next);
  const prev = useTourStore((s) => s.prev);
  const skip = useTourStore((s) => s.skip);

  const waitingForNavigation = pausedAt === step.route;

  return (
    <div
      className={cn(
        "fixed z-[101] w-full max-w-xs rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10"
      )}
      style={getPositionStyle(rect, step.placement)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold tracking-[-0.01em] text-foreground">{step.title}</p>
        <button
          type="button"
          aria-label="Skip tour"
          onClick={skip}
          className="-mr-1 -mt-1 shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{step.content}</p>

      {waitingForNavigation ? (
        <p className="mt-2 text-xs font-medium text-primary">Navigate to this page to continue.</p>
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          Step {stepIndex + 1} of {stepCount}
        </span>
        <div className="flex items-center gap-1.5">
          {stepIndex > 0 ? (
            <Button variant="outline" size="icon-sm" onClick={prev} aria-label="Previous step">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : null}
          <Button
            size="sm"
            disabled={waitingForNavigation}
            onClick={() => next(stepCount)}
            className="gap-1"
          >
            {stepIndex === stepCount - 1 ? "Finish" : "Next"}
            {stepIndex < stepCount - 1 ? <ChevronRight className="h-4 w-4" /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
