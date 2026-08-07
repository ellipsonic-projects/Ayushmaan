"use client";

export type ConsultantInviteCodeStatus = "ACTIVE" | "USED" | "REVOKED";

export interface ConsultantInviteCode {
  id: string;
  code: string;
  status: ConsultantInviteCodeStatus;
  expiresAt: string;
  createdAt: string;
}

import { authedFetch } from "@/lib/api/authed-fetch";

export async function generateConsultantInviteCode(): Promise<ConsultantInviteCode> {
  const { data } = await authedFetch("/consultant-invite-codes", { method: "POST" });
  return data as ConsultantInviteCode;
}

export async function getConsultantInviteCodes(): Promise<ConsultantInviteCode[]> {
  const { data } = await authedFetch("/consultant-invite-codes", { method: "GET" });
  return data as ConsultantInviteCode[];
}

export async function revokeConsultantInviteCode(id: string): Promise<void> {
  await authedFetch(`/consultant-invite-codes/${id}/revoke`, { method: "POST" });
}
