export function PlatformFooter() {
  return (
    <footer className="flex h-10 shrink-0 items-center justify-between border-t border-border bg-card px-6 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Region: US-East-1 (Primary)
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          API Version: 2.4.0-stable
        </span>
        <span>© 2024 AdminControl Platform. Authority & Trust Framework v1.2</span>
      </div>
    </footer>
  );
}
