import { AlertTriangle } from "lucide-react";

export function ClientsHeader() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Client Relationship Management</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time overview of your consultant practice ecosystem.
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 sm:max-w-xs">
        <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5 text-destructive" />
        <div>
          <p className="text-sm font-semibold text-destructive">High Capacity Warning</p>
          <p className="text-xs text-destructive/80">Overload risk detected (88% utilization)</p>
        </div>
      </div>
    </div>
  );
}
