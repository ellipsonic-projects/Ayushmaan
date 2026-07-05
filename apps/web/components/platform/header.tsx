import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

export function PlatformHeader({
  title = "Global Control Plane - Overview",
}: {
  title?: string;
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6">
      <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      <div className="relative w-72">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search system logs, tenants..."
          className="h-9 pl-9"
        />
      </div>
    </header>
  );
}
