export function TenantAdminFooter() {
  return (
    <footer className="flex h-10 shrink-0 items-center justify-between border-t border-border bg-card px-6 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        Clinic Status: Open
      </div>
      <span>© 2024 Ayushman. Clinic Admin Console v1.0</span>
    </footer>
  );
}
