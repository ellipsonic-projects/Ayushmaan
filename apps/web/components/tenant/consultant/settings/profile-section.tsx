"use client";

import { useState } from "react";

import { ConsultantProfileDetails } from "@/components/tenant/consultant/settings/profile-details";
import { ConsultantProfileForm } from "@/components/tenant/consultant/settings/profile-form";
import type { ConsultantProfile } from "@/lib/api/consultants.server";

export function ConsultantProfileSection({ consultant }: { consultant: ConsultantProfile }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return <ConsultantProfileForm consultant={consultant} onDone={() => setEditing(false)} />;
  }

  return <ConsultantProfileDetails consultant={consultant} onEdit={() => setEditing(true)} />;
}
