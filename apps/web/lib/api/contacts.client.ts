"use client";

import { authedFetch } from "@/lib/api/authed-fetch";
import type { Contact, ContactType } from "@/lib/api/contacts.server";

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
