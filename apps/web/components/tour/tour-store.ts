import { create } from "zustand";

import type { TourRole } from "./types";

const STORAGE_KEY = "ayushman-tour-completed";

function readCompletedRoles(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCompletedRoles(roles: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(roles));
}

interface TourState {
  isActive: boolean;
  activeStep: number;
  activeRole: TourRole | null;
  pausedAt: string | null; // route the tour is waiting to navigate to
  completedRoles: string[];

  start: (role: TourRole) => void;
  next: (stepCount: number) => void;
  prev: () => void;
  skip: () => void;
  pauseForNavigation: (route: string) => void;
  resume: () => void;
  complete: () => void;
  resetRole: (role: TourRole) => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  isActive: false,
  activeStep: 0,
  activeRole: null,
  pausedAt: null,
  completedRoles: readCompletedRoles(),

  start: (role) => set({ isActive: true, activeStep: 0, activeRole: role, pausedAt: null }),

  next: (stepCount) => {
    const { activeStep } = get();
    if (activeStep >= stepCount - 1) {
      get().complete();
      return;
    }
    set({ activeStep: activeStep + 1, pausedAt: null });
  },

  prev: () => set((state) => ({ activeStep: Math.max(0, state.activeStep - 1), pausedAt: null })),

  skip: () => set({ isActive: false, activeStep: 0, activeRole: null, pausedAt: null }),

  pauseForNavigation: (route) => set({ pausedAt: route }),

  resume: () => set({ pausedAt: null }),

  complete: () => {
    const { activeRole, completedRoles } = get();
    const updated =
      activeRole && !completedRoles.includes(activeRole)
        ? [...completedRoles, activeRole]
        : completedRoles;
    writeCompletedRoles(updated);
    set({
      isActive: false,
      activeStep: 0,
      activeRole: null,
      pausedAt: null,
      completedRoles: updated,
    });
  },

  resetRole: (role) => {
    const updated = get().completedRoles.filter((r) => r !== role);
    writeCompletedRoles(updated);
    set({ completedRoles: updated });
  },
}));
