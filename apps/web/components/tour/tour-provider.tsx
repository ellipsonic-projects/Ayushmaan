"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import type { TourRole, TourStep } from "./types";
import { useTourStore } from "./tour-store";
import { TourOverlay } from "./tour-overlay";
import { TourTooltip } from "./tour-tooltip";
import { consumeTourAutostartPending } from "@/lib/auth/tour-autostart";

interface TourContextValue {
  role: TourRole;
  basePath: string;
  steps: TourStep[];
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTourContext() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTourContext must be used within a TourProvider");
  return ctx;
}

function matchesRoute(pathname: string, basePath: string, pattern: string) {
  const full = `${basePath}${pattern}`.replace(/:[^/]+/g, "[^/]+");
  return new RegExp(`^${full}(/.*)?$`).test(pathname);
}

// Tracks the on-screen position of the step's target element, re-measuring
// on every animation frame so it follows scroll/resize/layout changes while
// the tour is active. Returns null if the element isn't currently mounted.
export function useTourTargetRect(selector: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    let frame: number;
    const measure = () => {
      const el = selector ? document.querySelector(selector) : null;
      setRect(el ? el.getBoundingClientRect() : null);
      frame = requestAnimationFrame(measure);
    };
    frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [selector]);

  return rect;
}

export function TourProvider({
  role,
  basePath,
  steps,
  children,
}: {
  role: TourRole;
  basePath: string;
  steps: TourStep[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const isActive = useTourStore((s) => s.isActive);
  const activeRole = useTourStore((s) => s.activeRole);
  const activeStep = useTourStore((s) => s.activeStep);
  const pausedAt = useTourStore((s) => s.pausedAt);
  const start = useTourStore((s) => s.start);
  const pauseForNavigation = useTourStore((s) => s.pauseForNavigation);
  const resume = useTourStore((s) => s.resume);

  const showTour = isActive && activeRole === role;
  const step = showTour ? steps[activeStep] : undefined;

  // Auto-start fires exactly once: right after the account is provisioned
  // for the very first time (see lib/auth/tour-autostart.ts). Every later
  // visit — including re-logging in — only starts the tour through the
  // sidebar's "Take a Tour" button.
  useEffect(() => {
    if (!consumeTourAutostartPending()) return;
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) return;
    const timer = setTimeout(() => start(role), 1000);
    return () => clearTimeout(timer);
    // Auto-start check only runs once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showTour || !step) return;
    if (!step.route) {
      if (pausedAt) resume();
      return;
    }
    const onRoute = matchesRoute(pathname, basePath, step.route);
    if (onRoute) {
      if (pausedAt) resume();
    } else if (pausedAt !== step.route) {
      pauseForNavigation(step.route);
    }
  }, [showTour, step, pathname, basePath, pausedAt, pauseForNavigation, resume]);

  const rect = useTourTargetRect(showTour ? (step?.target ?? null) : null);

  return (
    <TourContext.Provider value={{ role, basePath, steps }}>
      {children}
      {showTour && step ? (
        <>
          <TourOverlay rect={rect} />
          <TourTooltip step={step} rect={rect} stepIndex={activeStep} stepCount={steps.length} />
        </>
      ) : null}
    </TourContext.Provider>
  );
}
