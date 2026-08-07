import ISO6391 from "iso-639-1";

// Every language picker in the app sources its options from here so the
// stored value is always an ISO 639-1 code (e.g. "en"), not a full name —
// some older records still hold full names from before this was centralized.
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = ISO6391.getAllCodes()
  .map((code) => ({ value: code, label: ISO6391.getName(code) }))
  .sort((a, b) => a.label.localeCompare(b.label));

export function getLanguageLabel(code: string): string {
  return ISO6391.getName(code) || code;
}
