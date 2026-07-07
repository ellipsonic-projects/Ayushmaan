export function TenantAdminFooter() {
  return (
    <footer className="flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-border bg-card px-4 py-2 text-xs text-muted-foreground sm:px-6">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
        Clinic Status: Open
      </div>
      <span className="hidden sm:inline">© 2024 Ayushman. Clinic Admin Console v1.0</span>
    </footer>
  );
}
