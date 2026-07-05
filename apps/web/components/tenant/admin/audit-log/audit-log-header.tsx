export function AuditLogHeader() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">Audit Log</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Your tenant&apos;s escalated-access history — every time you viewed a
        Consultant&apos;s private clinical/legal notes, it&apos;s recorded here.
      </p>
    </div>
  );
}
