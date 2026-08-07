import { Pencil } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { OwnClientProfile } from "@/lib/api/clients.server";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

export function ClientProfileDetails({
  client,
  onEdit,
}: {
  client: OwnClientProfile;
  onEdit?: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal details shared with your care team</CardDescription>
          </div>
          {onEdit && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Edit profile"
              onClick={onEdit}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={client.fullName} />
          <Field label="Email" value={client.user.email} />
          <Field label="Date of birth" value={client.dob ? client.dob.slice(0, 10) : ""} />
          <Field label="Phone" value={client.user.phone ?? ""} />
          <Field label="Preferred language" value={client.preferredLanguage} />
          <Field label="Timezone" value={client.timezone} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emergency contact</CardTitle>
          <CardDescription>Who to reach in case of an emergency</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" value={client.emergencyContactName ?? ""} />
          <Field label="Phone" value={client.emergencyContactPhone ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
