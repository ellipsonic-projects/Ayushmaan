// Same dot-path resolution template-render.service.ts uses for Tiptap
// `mention` nodes, generalized for arbitrary JSON payloads (CUSTOM_ACTION's
// config.payload, CREATE_TASK/CREATE_COMMITMENT's title/description) rather
// than only producing template body strings. A whole-string match like
// "{{appointment.id}}" resolves to the raw (non-string) value so a payload
// field like `caseId` can carry a real value, not just text; a value with
// surrounding text interpolates via string concatenation instead.
const WHOLE_TOKEN = /^\{\{([\w.]+)\}\}$/;
const TOKEN = /\{\{([\w.]+)\}\}/g;

export function resolvePath(context: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
      context
    );
}

export function resolveMergeFields<T>(value: T, context: Record<string, unknown>): T {
  if (typeof value === "string") {
    const wholeMatch = value.match(WHOLE_TOKEN);
    if (wholeMatch) return resolvePath(context, wholeMatch[1]) as T;
    return value.replace(TOKEN, (_, path) => {
      const resolved = resolvePath(context, path);
      return resolved === null || resolved === undefined ? "" : String(resolved);
    }) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => resolveMergeFields(item, context)) as unknown as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveMergeFields(item, context)])
    ) as T;
  }
  return value;
}
