import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { getOwnClientProfile } from "@/lib/api/clients.server";
import { getNotificationPreferences } from "@/lib/api/notification-preferences.server";

export default async function ClientNotificationsPage() {
  const client = await getOwnClientProfile();
  const scopeCase = client?.cases[0] ?? null;
  const preferences = scopeCase
    ? await getNotificationPreferences(scopeCase.tenantId, scopeCase.tenant.slug)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you want to hear about appointments, tasks, and more
        </p>
      </div>

      {scopeCase ? (
        <NotificationPreferencesForm
          tenantId={scopeCase.tenantId}
          tenantSlug={scopeCase.tenant.slug}
          preferences={preferences}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Book your first appointment to unlock notification preferences.
        </p>
      )}
    </div>
  );
}
