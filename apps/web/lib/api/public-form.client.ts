import type { RJSFSchema, UiSchema } from "@rjsf/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface PublicFormHeader {
  organizationName: string;
  consultantName: string;
  contactNumber: string;
}

export interface PublicForm {
  status: "PENDING" | "SUBMITTED" | "EXPIRED";
  formName: string;
  header: PublicFormHeader;
  jsonSchema: RJSFSchema;
  uiSchema: UiSchema;
  answers: Record<string, unknown>;
}

// No auth — the token itself is the security boundary (form-submissions.router.ts's
// publicFormSubmissionsRouter), so this works whether or not the client is
// signed into the portal.
export async function getPublicForm(token: string): Promise<PublicForm> {
  const res = await fetch(`${API_BASE_URL}/api/forms/${token}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? "This form could not be found.");
  }
  const { data } = await res.json();
  return data as PublicForm;
}

export async function submitPublicForm(
  token: string,
  answers: Record<string, unknown>
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/forms/${token}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(answers),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message ?? "Couldn't submit the form. Please try again.");
  }
}
