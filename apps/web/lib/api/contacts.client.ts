"use client";

import { supabase } from "@/lib/supabase/client";
import type { Contact, ContactType } from "@/lib/api/contacts.server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function authedFetch(path: string, init: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const authHeaders = { Authorization: `Bearer ${session.access_token}` };

  const meRes = await fetch(`${API_BASE_URL}/api/auth/me`, { headers: authHeaders });
  if (!meRes.ok) throw new Error("Failed to resolve tenant");
  const { data: me } = await meRes.json();
  if (!me?.tenantId) throw new Error("Failed to resolve tenant");

  const res = await fetch(`${API_BASE_URL}/api/tenants/${me.tenantId}${path}`, {
    ...init,
    headers: {
      ...authHeaders,
      "X-Tenant-Slug": me.tenant.slug,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export interface ContactInput {
  fullName: string;
  type?: ContactType;
  organization?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export async function createContact(input: ContactInput): Promise<Contact> {
  const { data } = await authedFetch(`/contacts`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updateContact(
  contactId: string,
  updates: Partial<ContactInput>
): Promise<Contact> {
  const { data } = await authedFetch(`/contacts/${contactId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data;
}

export async function deleteContact(contactId: string): Promise<void> {
  await authedFetch(`/contacts/${contactId}`, { method: "DELETE" });
}
