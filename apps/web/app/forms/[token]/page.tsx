"use client";

import { use, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import RjsfForm from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { rjsfWidgets, rjsfTemplates } from "@/components/tenant/shared/forms/rjsf-theme";
import { getPublicForm, submitPublicForm, type PublicForm } from "@/lib/api/public-form.client";

export default function PublicFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);

  const [form, setForm] = useState<PublicForm | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    getPublicForm(token)
      .then((data) => {
        setForm(data);
        if (data.status === "SUBMITTED") setSubmitted(true);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, [token]);

  async function handleSubmit(formData: Record<string, unknown>) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitPublicForm(token, formData);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        {loadError ? (
          <CardContent className="py-8 text-center text-sm text-destructive">
            {loadError}
          </CardContent>
        ) : !form ? (
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Loading...
          </CardContent>
        ) : submitted ? (
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <p className="text-base font-medium text-foreground">Thank you!</p>
            <p className="text-sm text-muted-foreground">
              Your response to &quot;{form.formName}&quot; has been submitted.
            </p>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <p className="text-sm font-semibold text-foreground">
                {form.header.organizationName}
              </p>
              <p className="text-sm text-muted-foreground">{form.header.consultantName}</p>
              <p className="text-sm text-muted-foreground">{form.header.contactNumber}</p>
              <CardTitle>{form.formName}</CardTitle>
              <CardDescription>Please fill out the details below.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <RjsfForm
                schema={form.jsonSchema}
                uiSchema={{ ...form.uiSchema, "ui:submitButtonOptions": { submitText: "Submit" } }}
                validator={validator}
                widgets={rjsfWidgets}
                templates={rjsfTemplates}
                formData={form.answers}
                disabled={submitting}
                onSubmit={(event) =>
                  handleSubmit((event.formData as Record<string, unknown>) ?? {})
                }
              />
              {submitError && <p className="text-xs text-destructive">{submitError}</p>}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
