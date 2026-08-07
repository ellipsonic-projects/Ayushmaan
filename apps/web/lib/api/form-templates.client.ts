"use client";

import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import { authedFetch } from "@/lib/api/authed-fetch";
import type { FormTemplateScope, FormTemplate } from "@/lib/api/form-templates.server";

export interface FormTemplateInput {
  name: string;
  scope: FormTemplateScope;
  jsonSchema: RJSFSchema;
  uiSchema: UiSchema;
}

// Used by the workflow canvas's SEND_INTAKE_FORM config panel to offer a
// form-template picker, same shape as listWorkflowTemplates.
export async function listFormTemplates(): Promise<FormTemplate[]> {
  const { data } = await authedFetch(`/form-templates`, { method: "GET" });
  return data;
}

export async function createFormTemplate(input: FormTemplateInput): Promise<FormTemplate> {
  const { data } = await authedFetch(`/form-templates`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function updateFormTemplate(
  templateId: string,
  updates: Partial<FormTemplateInput>
): Promise<FormTemplate> {
  const { data } = await authedFetch(`/form-templates/${templateId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data;
}

export async function deleteFormTemplate(templateId: string): Promise<void> {
  await authedFetch(`/form-templates/${templateId}`, { method: "DELETE" });
}
