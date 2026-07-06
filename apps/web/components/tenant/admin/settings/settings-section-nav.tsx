"use client";

import { useState } from "react";
import { ImageIcon, Building2, Landmark, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const sections: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "branding", label: "Branding", icon: ImageIcon },
  { id: "business-identity", label: "Business Identity", icon: Building2 },
  { id: "financial-configuration", label: "Financial", icon: Landmark },
  { id: "platform-oversight", label: "Platform Oversight", icon: ShieldCheck },
];

export function SettingsSectionNav() {
  const [active, setActive] = useState(sections[0].id);

  function handleClick(id: string) {
    setActive(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav className="flex gap-1 overflow-x-auto lg:sticky lg:top-6 lg:flex-col lg:overflow-visible">
      {sections.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => handleClick(id)}
          className={cn(
            "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            active === id && "bg-muted text-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </button>
      ))}
    </nav>
  );
}
