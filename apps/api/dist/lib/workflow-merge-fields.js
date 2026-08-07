"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvePath = resolvePath;
exports.resolveMergeFields = resolveMergeFields;
// Same dot-path resolution template-render.service.ts uses for Tiptap
// `mention` nodes, generalized for arbitrary JSON payloads (CUSTOM_ACTION's
// config.payload, CREATE_TASK/CREATE_COMMITMENT's title/description) rather
// than only producing template body strings. A whole-string match like
// "{{appointment.id}}" resolves to the raw (non-string) value so a payload
// field like `caseId` can carry a real value, not just text; a value with
// surrounding text interpolates via string concatenation instead.
const WHOLE_TOKEN = /^\{\{([\w.]+)\}\}$/;
const TOKEN = /\{\{([\w.]+)\}\}/g;
function resolvePath(context, path) {
    return path
        .split(".")
        .reduce((acc, key) => acc && typeof acc === "object" ? acc[key] : undefined, context);
}
function resolveMergeFields(value, context) {
    if (typeof value === "string") {
        const wholeMatch = value.match(WHOLE_TOKEN);
        if (wholeMatch)
            return resolvePath(context, wholeMatch[1]);
        return value.replace(TOKEN, (_, path) => {
            const resolved = resolvePath(context, path);
            return resolved === null || resolved === undefined ? "" : String(resolved);
        });
    }
    if (Array.isArray(value)) {
        return value.map((item) => resolveMergeFields(item, context));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveMergeFields(item, context)]));
    }
    return value;
}
//# sourceMappingURL=workflow-merge-fields.js.map