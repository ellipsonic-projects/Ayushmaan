"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";

import { useAuth } from "@/lib/auth/context";
import { rootOrigin } from "@/lib/auth/destination";
import { CollapsibleLabel } from "@/components/sidebar/collapsible-label";

export function LogoutButton({
  variant = "icon",
  collapsible = false,
}: {
  variant?: "icon" | "row";
  collapsible?: boolean;
}) {
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      // A tenant subdomain (slug.localhost:3000) is a different origin from
      // the main domain, so this can't be a router.push — it needs a full
      // navigation to actually drop the slug.
      window.location.href = rootOrigin("/");
    }
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        disabled={loggingOut}
        onClick={handleLogout}
        className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        <CollapsibleLabel collapsible={collapsible}>Sign Out</CollapsibleLabel>
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Log out"
      title="Logout"
      disabled={loggingOut}
      onClick={handleLogout}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
