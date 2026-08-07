import type { RJSFSchema, UiSchema } from "@rjsf/utils";

// Compiles the palette-driven field list the builder UI works with
// (form-template-editor.tsx) into the JSON Schema + UiSchema pair persisted
// on FormTemplate, and decompiles a saved template back into that field list
// for editing. Conditional visibility ("show Q5 only if Q3=Yes") is expressed
// as an `allOf: [{ if, then }]` entry whose `then.properties` is the ONLY
// place the conditional field is declared — rjsf only renders a property
// that's reachable from the root `properties`, so omitting it there and
// adding it solely inside `then` is what makes it appear/disappear.

export type BuilderFieldType =
  | "SHORT_TEXT"
  | "LONG_TEXT"
  | "NUMBER"
  | "DATE"
  | "SELECT"
  | "MULTI_SELECT"
  | "CHECKBOX"
  | "FILE"
  | "GROUP";

export const FIELD_TYPE_LABEL: Record<BuilderFieldType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  NUMBER: "Number",
  DATE: "Date",
  SELECT: "Select",
  MULTI_SELECT: "Multi-select",
  CHECKBOX: "Checkbox",
  FILE: "File upload",
  GROUP: "Repeatable group",
};

export const FIELD_TYPE_OPTIONS = Object.keys(FIELD_TYPE_LABEL) as BuilderFieldType[];

export interface BuilderCondition {
  field: string; // another top-level field's key
  equals: string;
}

export interface BuilderField {
  key: string;
  title: string;
  type: BuilderFieldType;
  required: boolean;
  options?: string[]; // SELECT / MULTI_SELECT choices
  condition?: BuilderCondition | null; // top-level fields only
  groupFields?: BuilderField[]; // GROUP items' sub-fields (no nesting beyond one level)
}

type JsonSchemaProperty = Record<string, unknown>;

function propertyFor(field: BuilderField): JsonSchemaProperty {
  switch (field.type) {
    case "SHORT_TEXT":
      return { type: "string", title: field.title };
    case "LONG_TEXT":
      return { type: "string", title: field.title };
    case "NUMBER":
      return { type: "number", title: field.title };
    case "DATE":
      return { type: "string", format: "date", title: field.title };
    case "SELECT":
      return { type: "string", title: field.title, enum: field.options ?? [] };
    case "MULTI_SELECT":
      return {
        type: "array",
        title: field.title,
        items: { type: "string", enum: field.options ?? [] },
        uniqueItems: true,
      };
    case "CHECKBOX":
      return { type: "boolean", title: field.title };
    case "FILE":
      return { type: "string", title: field.title, format: "data-url" };
    case "GROUP": {
      const sub = field.groupFields ?? [];
      return {
        type: "array",
        title: field.title,
        items: {
          type: "object",
          properties: Object.fromEntries(sub.map((f) => [f.key, propertyFor(f)])),
          required: sub.filter((f) => f.required).map((f) => f.key),
        },
      };
    }
  }
}

function widgetFor(type: BuilderFieldType): string | undefined {
  switch (type) {
    case "LONG_TEXT":
      return "textarea";
    case "NUMBER":
      return "updown";
    case "DATE":
      return "date";
    case "SELECT":
      return "select";
    case "MULTI_SELECT":
      return "checkboxes";
    case "CHECKBOX":
      return "checkbox";
    case "FILE":
      return "file";
    default:
      return undefined;
  }
}

function uiEntryFor(field: BuilderField): Record<string, unknown> | undefined {
  const widget = widgetFor(field.type);
  if (field.type === "GROUP") {
    const items = Object.fromEntries(
      (field.groupFields ?? []).flatMap((f) => {
        const w = widgetFor(f.type);
        return w ? [[f.key, { "ui:widget": w }]] : [];
      })
    );
    return Object.keys(items).length ? { items } : undefined;
  }
  return widget ? { "ui:widget": widget } : undefined;
}

export function compileFormSchema(fields: BuilderField[]): {
  jsonSchema: RJSFSchema;
  uiSchema: UiSchema;
} {
  const properties: Record<string, JsonSchemaProperty> = {};
  const required: string[] = [];
  const allOf: Record<string, unknown>[] = [];
  const uiSchema: Record<string, unknown> = { "ui:order": fields.map((f) => f.key) };

  for (const field of fields) {
    const prop = propertyFor(field);
    const uiEntry = uiEntryFor(field);
    if (uiEntry) uiSchema[field.key] = uiEntry;

    if (field.condition) {
      allOf.push({
        if: {
          properties: { [field.condition.field]: { const: field.condition.equals } },
          required: [field.condition.field],
        },
        then: {
          properties: { [field.key]: prop },
          ...(field.required ? { required: [field.key] } : {}),
        },
      });
    } else {
      properties[field.key] = prop;
      if (field.required) required.push(field.key);
    }
  }

  return {
    jsonSchema: {
      type: "object",
      properties,
      ...(required.length ? { required } : {}),
      ...(allOf.length ? { allOf } : {}),
    },
    uiSchema,
  };
}

function fieldTypeFromProperty(prop: Record<string, unknown>): BuilderFieldType {
  if (prop.type === "boolean") return "CHECKBOX";
  if (prop.format === "data-url") return "FILE";
  if (prop.format === "date") return "DATE";
  if (prop.type === "array") {
    const items = prop.items as Record<string, unknown> | undefined;
    if (items?.type === "object") return "GROUP";
    return "MULTI_SELECT";
  }
  if (prop.type === "number") return "NUMBER";
  if (Array.isArray(prop.enum)) return "SELECT";
  return "SHORT_TEXT";
}

function decompileProperty(
  key: string,
  prop: Record<string, unknown>,
  required: boolean,
  uiEntry: Record<string, unknown> | undefined
): BuilderField {
  const type = uiEntry?.["ui:widget"] === "textarea" ? "LONG_TEXT" : fieldTypeFromProperty(prop);
  const field: BuilderField = {
    key,
    title: (prop.title as string) ?? key,
    type,
    required,
    options:
      (prop.enum as string[]) ??
      ((prop.items as Record<string, unknown>)?.enum as string[] | undefined),
  };
  if (type === "GROUP") {
    const items = prop.items as Record<string, unknown>;
    const subProps = (items.properties as Record<string, JsonSchemaProperty>) ?? {};
    const subRequired = new Set((items.required as string[]) ?? []);
    const subUi = (uiEntry?.items as Record<string, Record<string, unknown>>) ?? {};
    field.groupFields = Object.entries(subProps).map(([subKey, subProp]) =>
      decompileProperty(subKey, subProp, subRequired.has(subKey), subUi[subKey])
    );
  }
  return field;
}

export function decompileFormSchema(
  jsonSchema: Record<string, unknown> | null | undefined,
  uiSchema: Record<string, unknown> | null | undefined
): BuilderField[] {
  if (!jsonSchema) return [];
  const properties = (jsonSchema.properties as Record<string, JsonSchemaProperty>) ?? {};
  const requiredSet = new Set((jsonSchema.required as string[]) ?? []);
  const uiEntries = (uiSchema ?? {}) as Record<string, Record<string, unknown>>;

  const topLevel = Object.entries(properties).map(([key, prop]) =>
    decompileProperty(key, prop, requiredSet.has(key), uiEntries[key])
  );

  const conditional = ((jsonSchema.allOf as Record<string, unknown>[]) ?? []).map((clause) => {
    const ifClause = clause.if as { properties?: Record<string, { const?: string }> };
    const thenClause = clause.then as {
      properties?: Record<string, JsonSchemaProperty>;
      required?: string[];
    };
    const ifEntries = Object.entries(ifClause.properties ?? {});
    const thenEntries = Object.entries(thenClause.properties ?? {});
    if (thenEntries.length === 0) return null;
    const [key, prop] = thenEntries[0];
    const field = decompileProperty(
      key,
      prop,
      (thenClause.required ?? []).includes(key),
      uiEntries[key]
    );
    if (ifEntries.length > 0) {
      const [condField, condSchema] = ifEntries[0];
      field.condition = { field: condField, equals: condSchema?.const ?? "" };
    }
    return field;
  });

  const orderKeys = (uiSchema?.["ui:order"] as string[] | undefined) ?? [];
  const allFields = [...topLevel, ...conditional.filter((f): f is BuilderField => f !== null)];
  const byKey = new Map(allFields.map((f) => [f.key, f]));
  const ordered = orderKeys.map((k) => byKey.get(k)).filter((f): f is BuilderField => Boolean(f));
  const remaining = allFields.filter((f) => !orderKeys.includes(f.key));
  return [...ordered, ...remaining];
}

export function slugifyKey(label: string, existing: Set<string>): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[^a-zA-Z]+/, "")
    .replace(/[^a-zA-Z0-9]/g, "");
  const key = base || "field";
  if (!existing.has(key)) return key;
  let i = 2;
  while (existing.has(`${key}${i}`)) i += 1;
  return `${key}${i}`;
}
