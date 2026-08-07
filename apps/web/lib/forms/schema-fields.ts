import type { RJSFSchema, UiSchema } from "@rjsf/utils";

// Shared by every read-only "what did this form ask" view (intake-form-submissions.tsx,
// both documentation-client.tsx pages) so they don't each re-derive field order/labels
// from a FormTemplate's JSON Schema. Builder + fill pages use react-jsonschema-form
// directly; these are answer summaries, not another form renderer.

type PropertyMap = Record<string, { title?: string; type?: string }>;

export interface SchemaFieldSummary {
  key: string;
  label: string;
  type: string;
}

// Conditional fields (Sprint 5.5.3's "show Q5 only if Q3=Yes") are declared only
// inside an allOf[].then.properties clause, never in the root `properties`, so a
// plain Object.keys(jsonSchema.properties) would silently drop them — merge both.
// A JSON Schema boolean property (`false`, meaning "never valid") never appears
// in a builder-generated schema, so property entries are cast to the simple
// { title, type } shape actually written by builder-schema.ts's compiler.
export function listSchemaFields(
  jsonSchema: RJSFSchema | null | undefined,
  uiSchema: UiSchema | null | undefined
): SchemaFieldSummary[] {
  if (!jsonSchema) return [];
  const props: PropertyMap = { ...((jsonSchema.properties as PropertyMap | undefined) ?? {}) };
  for (const clause of (jsonSchema.allOf as { then?: { properties?: PropertyMap } }[]) ?? []) {
    Object.assign(props, clause.then?.properties ?? {});
  }

  const declaredOrder = ((uiSchema?.["ui:order"] as string[] | undefined) ?? []).filter(
    (key) => key !== "*" && props[key]
  );
  const remaining = Object.keys(props).filter((key) => !declaredOrder.includes(key));
  const orderedKeys = [...declaredOrder, ...remaining];

  return orderedKeys.map((key) => ({
    key,
    label: props[key]?.title ?? key,
    type: props[key]?.type === "array" ? "list" : (props[key]?.type ?? "text"),
  }));
}

// Renders a single answer value (string/number/boolean/array) as display text —
// answers from an array (multi-select/repeatable group) render as comma-joined.
export function formatAnswer(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) {
    return value.length === 0
      ? "—"
      : value
          .map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item)))
          .join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
