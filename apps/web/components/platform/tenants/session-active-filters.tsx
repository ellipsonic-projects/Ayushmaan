import { Button } from "@/components/ui/button";

export function SessionActiveFilters({ totalRecords }: { totalRecords: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>Active Filters: None</span>
        <Button variant="ghost" size="sm" className="text-primary">
          Clear
        </Button>
      </div>
      <span className="text-xs text-muted-foreground">
        Showing 1-10 of {totalRecords.toLocaleString()}
      </span>
    </div>
  );
}
