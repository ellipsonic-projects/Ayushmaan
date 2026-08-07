"use client";

import { authedFetch } from "@/lib/api/authed-fetch";
import { supabase } from "@/lib/supabase/client";

// Step 1 of the session-recording upload (Sprint 4.2) — apps/api issues a
// signed Storage URL scoped to cases/{tenantSlug}/{caseId}/audio/..., never
// a raw bucket credential.
export async function requestAudioUploadUrl(
  caseId: string,
  fileName: string
): Promise<{ path: string; signedUrl: string; token: string }> {
  const { data } = await authedFetch(`/cases/${caseId}/interactions/audio-upload-url`, {
    method: "POST",
    body: JSON.stringify({ fileName }),
  });
  return data;
}

// Step 2 — direct upload to Supabase Storage using the signed token from
// step 1. Uses the browser's own (anon) Supabase client; the token embeds
// the authorization for this one object, so no service-role key ever
// reaches the browser.
export async function uploadSessionAudio(path: string, token: string, blob: Blob) {
  const { error } = await supabase.storage
    .from("case-documents")
    .uploadToSignedUrl(path, token, blob);
  if (error) throw error;
}
