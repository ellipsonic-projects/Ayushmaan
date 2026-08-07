"use client";

import { authedFetch } from "@/lib/api/authed-fetch";

export async function acceptReferral(
  referralId: string
): Promise<{ id: string; newCase: { id: string } }> {
  const { data } = await authedFetch(`/consultant-referrals/${referralId}/accept`, {
    method: "POST",
  });
  return data;
}

export async function declineReferral(referralId: string, reason: string): Promise<void> {
  await authedFetch(`/consultant-referrals/${referralId}/decline`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
