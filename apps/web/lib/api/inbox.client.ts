"use client";

import { supabase } from "@/lib/supabase/client";
import type { InboxConnection } from "@/lib/api/inbox.server";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// /api/inbox is role-agnostic (see apps/api's inbox.router.ts) — each user
// connects their own Gmail, so no tenant resolution is needed here.
async function authedFetch(path: string, init?: RequestInit) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  const res = await fetch(`${API_BASE_URL}/api/inbox${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res;
}

export interface ThreadSummary {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  unread: boolean;
}

export interface ThreadMessage {
  id: string;
  from: string;
  to: string;
  date: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailInput {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
}

export async function getInboxConnectUrl(): Promise<string> {
  const res = await authedFetch("/connect-url");
  const { data } = await res.json();
  return data.url as string;
}

export async function disconnectInbox(): Promise<void> {
  await authedFetch("/connection", { method: "DELETE" });
}

export async function listInboxThreads(): Promise<ThreadSummary[]> {
  const res = await authedFetch("/threads");
  const { data } = await res.json();
  return data as ThreadSummary[];
}

export async function getInboxThread(threadId: string): Promise<ThreadMessage[]> {
  const res = await authedFetch(`/threads/${threadId}`);
  const { data } = await res.json();
  return data as ThreadMessage[];
}

export async function sendInboxEmail(input: SendEmailInput): Promise<void> {
  await authedFetch("/send", { method: "POST", body: JSON.stringify(input) });
}

export type { InboxConnection };
