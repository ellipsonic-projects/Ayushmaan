"use client";

import { useState } from "react";

import { ClientProfileDetails } from "@/components/tenant/client/settings/profile-details";
import { ClientProfileForm } from "@/components/tenant/client/settings/settings-form";
import type { OwnClientProfile } from "@/lib/api/clients.server";

export function ClientProfileSection({
  client,
  scopeTenantId,
  scopeTenantSlug,
}: {
  client: OwnClientProfile;
  scopeTenantId: string;
  scopeTenantSlug: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <ClientProfileForm
        client={client}
        scopeTenantId={scopeTenantId}
        scopeTenantSlug={scopeTenantSlug}
        onDone={() => setEditing(false)}
      />
    );
  }

  return <ClientProfileDetails client={client} onEdit={() => setEditing(true)} />;
}
