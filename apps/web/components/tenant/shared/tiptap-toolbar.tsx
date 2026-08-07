"use client";

import { cn } from "@/lib/utils";

export function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        active && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}

export function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />;
}
