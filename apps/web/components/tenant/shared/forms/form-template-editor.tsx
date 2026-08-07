"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import { GripVertical, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rjsfWidgets, rjsfTemplates } from "@/components/tenant/shared/forms/rjsf-theme";
import {
  FIELD_TYPE_LABEL,
  FIELD_TYPE_OPTIONS,
  compileFormSchema,
  decompileFormSchema,
  slugifyKey,
  type BuilderField,
  type BuilderFieldType,
} from "@/lib/forms/builder-schema";
import type { FormTemplate, FormTemplateScope } from "@/lib/api/form-templates.server";
import { createFormTemplate, updateFormTemplate } from "@/lib/api/form-templates.client";

const SCOPE_OPTIONS: { value: FormTemplateScope; label: string }[] = [
  { value: "PERSONAL", label: "Only me" },
  { value: "TENANT", label: "Everyone at org" },
  { value: "COMMUNITY", label: "Everyone on platform" },
];

const OPTIONS_FIELD_TYPES: BuilderFieldType[] = ["SELECT", "MULTI_SELECT"];
const CONDITIONABLE_TYPES: BuilderFieldType[] = ["SHORT_TEXT", "NUMBER", "SELECT", "CHECKBOX"];
const SUB_FIELD_TYPES: BuilderFieldType[] = [
  "SHORT_TEXT",
  "LONG_TEXT",
  "NUMBER",
  "DATE",
  "CHECKBOX",
];

const DEFAULT_FIELDS: BuilderField[] = [
  { key: "fullName", title: "Full name", type: "SHORT_TEXT", required: true },
  { key: "email", title: "Email", type: "SHORT_TEXT", required: true },
  { key: "phone", title: "Phone", type: "SHORT_TEXT", required: true },
  { key: "dob", title: "Date of birth", type: "DATE", required: false },
];

function newField(type: BuilderFieldType, existingKeys: Set<string>): BuilderField {
  const title = FIELD_TYPE_LABEL[type];
  const field: BuilderField = {
    key: slugifyKey(title, existingKeys),
    title,
    type,
    required: false,
  };
  if (OPTIONS_FIELD_TYPES.includes(type)) field.options = ["Option 1", "Option 2"];
  if (type === "GROUP") {
    field.groupFields = [{ key: "item", title: "Item", type: "SHORT_TEXT", required: false }];
  }
  return field;
}

export function FormTemplateEditor({ template }: { template?: FormTemplate }) {
  const router = useRouter();
  const pathname = usePathname();
  // Mounted at .../templates/forms/new and .../templates/forms/[formId] —
  // both cancel/save should land back on the shared Templates board, not
  // the /forms segment itself.
  const templatesHref = pathname.replace(/\/forms(\/.*)?$/, "");

  const [name, setName] = useState(template?.name ?? "");
  const [scope, setScope] = useState<FormTemplateScope>(template?.scope ?? "PERSONAL");
  const [fields, setFields] = useState<BuilderField[]>(
    template ? decompileFormSchema(template.jsonSchema, template.uiSchema) : DEFAULT_FIELDS
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField(index: number, patch: Partial<BuilderField>) {
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function addField(type: BuilderFieldType) {
    const existing = new Set(fields.map((f) => f.key));
    setFields((prev) => [...prev, newField(type, existing)]);
  }

  function removeField(index: number) {
    const removedKey = fields[index]?.key;
    setFields((prev) =>
      prev
        .filter((_, i) => i !== index)
        // A removed field can't stay referenced by another field's condition.
        .map((f) => (f.condition?.field === removedKey ? { ...f, condition: null } : f))
    );
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function updateGroupSubField(index: number, subIndex: number, patch: Partial<BuilderField>) {
    setFields((prev) =>
      prev.map((f, i) =>
        i === index
          ? {
              ...f,
              groupFields: (f.groupFields ?? []).map((sf, si) =>
                si === subIndex ? { ...sf, ...patch } : sf
              ),
            }
          : f
      )
    );
  }

  function addGroupSubField(index: number) {
    setFields((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        const existing = new Set((f.groupFields ?? []).map((sf) => sf.key));
        return {
          ...f,
          groupFields: [...(f.groupFields ?? []), newField("SHORT_TEXT", existing)],
        };
      })
    );
  }

  function removeGroupSubField(index: number, subIndex: number) {
    setFields((prev) =>
      prev.map((f, i) =>
        i === index
          ? { ...f, groupFields: (f.groupFields ?? []).filter((_, si) => si !== subIndex) }
          : f
      )
    );
  }

  const { jsonSchema, uiSchema } = useMemo(() => compileFormSchema(fields), [fields]);
  const previewUiSchema = useMemo(
    () => ({ ...uiSchema, "ui:submitButtonOptions": { norender: true } }),
    [uiSchema]
  );

  async function handleSave() {
    if (!name.trim() || fields.length === 0) {
      setError("Give the form a name and at least one field.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (template) {
        await updateFormTemplate(template.id, { name: name.trim(), scope, jsonSchema, uiSchema });
      } else {
        await createFormTemplate({ name: name.trim(), scope, jsonSchema, uiSchema });
      }
      router.push(templatesHref);
    } catch {
      setError("Couldn't save the form. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const conditionCandidates = (currentIndex: number) =>
    fields.filter((f, i) => i !== currentIndex && CONDITIONABLE_TYPES.includes(f.type));

  return (
    <div data-tour="consultant-form-builder" className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">
          {template ? "Edit intake form" : "New intake form"}
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push(templatesHref)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="form-name">Form name</Label>
          <Input
            id="form-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="New client intake"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Who can use this form</Label>
          <Select value={scope} onValueChange={(value) => setScope(value as FormTemplateScope)}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: palette + field list */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="mr-1">Add field</Label>
            {FIELD_TYPE_OPTIONS.map((type) => (
              <Button
                key={type}
                variant="outline"
                size="xs"
                className="gap-1"
                onClick={() => addField(type)}
              >
                <Plus className="h-3 w-3" />
                {FIELD_TYPE_LABEL[type]}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {fields.map((field, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <GripVertical className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                  <Input
                    value={field.title}
                    placeholder="Label"
                    className="sm:flex-1"
                    onChange={(event) => updateField(index, { title: event.target.value })}
                  />
                  <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {FIELD_TYPE_LABEL[field.type]}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={field.required}
                      onCheckedChange={(checked) => updateField(index, { required: checked })}
                    />
                    <Label className="text-xs text-muted-foreground">Required</Label>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveField(index, -1)}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(index, 1)}
                      disabled={index === fields.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {OPTIONS_FIELD_TYPES.includes(field.type) && (
                  <div className="flex flex-col gap-1.5 pl-6">
                    <Label className="text-xs text-muted-foreground">
                      Options (comma-separated)
                    </Label>
                    <Input
                      value={(field.options ?? []).join(", ")}
                      onChange={(event) =>
                        updateField(index, {
                          options: event.target.value
                            .split(",")
                            .map((o) => o.trim())
                            .filter(Boolean),
                        })
                      }
                    />
                  </div>
                )}

                {field.type === "GROUP" && (
                  <div className="flex flex-col gap-2 border-t border-border pt-2 pl-6">
                    <Label className="text-xs text-muted-foreground">
                      Fields repeated per item
                    </Label>
                    {(field.groupFields ?? []).map((sub, subIndex) => (
                      <div key={subIndex} className="flex items-center gap-2">
                        <Input
                          value={sub.title}
                          className="flex-1"
                          onChange={(event) =>
                            updateGroupSubField(index, subIndex, { title: event.target.value })
                          }
                        />
                        <Select
                          value={sub.type}
                          onValueChange={(value) =>
                            updateGroupSubField(index, subIndex, {
                              type: value as BuilderFieldType,
                            })
                          }
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUB_FIELD_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>
                                {FIELD_TYPE_LABEL[t]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          type="button"
                          onClick={() => removeGroupSubField(index, subIndex)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="xs"
                      className="w-fit gap-1"
                      onClick={() => addGroupSubField(index)}
                    >
                      <Plus className="h-3 w-3" />
                      Add sub-field
                    </Button>
                  </div>
                )}

                {CONDITIONABLE_TYPES.includes(field.type) === false ? null : (
                  <div className="flex flex-col gap-1.5 border-t border-border pt-2 pl-6">
                    <Label className="text-xs text-muted-foreground">
                      Only show this field if…
                    </Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={field.condition?.field ?? "__none"}
                        onValueChange={(value) =>
                          updateField(index, {
                            condition:
                              !value || value === "__none"
                                ? null
                                : { field: value, equals: field.condition?.equals ?? "" },
                          })
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">Always show</SelectItem>
                          {conditionCandidates(index).map((candidate) => (
                            <SelectItem key={candidate.key} value={candidate.key}>
                              {candidate.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {field.condition && (
                        <>
                          <span className="text-xs text-muted-foreground">equals</span>
                          <Input
                            className="w-40"
                            value={field.condition.equals}
                            placeholder="value"
                            onChange={(event) =>
                              updateField(index, {
                                condition: {
                                  field: field.condition!.field,
                                  equals: event.target.value,
                                },
                              })
                            }
                          />
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
            {fields.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Add a field from the palette above to get started.
              </p>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Right: live preview, same rjsf theme the public fill page uses */}
        <div className="flex flex-col gap-2">
          <Label>Preview</Label>
          <div className="rounded-lg border border-border p-4">
            <Form
              schema={jsonSchema}
              uiSchema={previewUiSchema}
              validator={validator}
              widgets={rjsfWidgets}
              templates={rjsfTemplates}
              formData={{}}
              onChange={() => {}}
              onSubmit={() => {}}
            >
              <div />
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}
