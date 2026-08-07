import { NotificationPreferencesForm } from "@/components/notifications/notification-preferences-form";
import { getOwnNotificationPreferences } from "@/lib/api/notification-preferences.server";

export default async function AdminNotificationsPage() {
  const scope = await getOwnNotificationPreferences();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how you want to hear about consultants, tasks, and more
        </p>
      </div>

      {scope ? (
        <NotificationPreferencesForm
          tenantId={scope.tenantId}
          tenantSlug={scope.tenantSlug}
          preferences={scope.preferences}
        />
      ) : (
        <p className="text-sm text-muted-foreground">Unable to load your preferences.</p>
      )}
    </div>
  );
}
