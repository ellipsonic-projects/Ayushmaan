"use client";

// Thin adapter mapping react-jsonschema-form's widget slots onto the app's
// existing shadcn/Tailwind primitives — rjsf ships official themes for
// Bootstrap/Material/Antd/Chakra/Fluent/Semantic but not shadcn, so this is a
// one-time adapter, not a fork. Used by both the builder's live preview
// (form-template-editor.tsx) and the public fill page ([token]/page.tsx).

import type { RegistryWidgetsType, WidgetProps } from "@rjsf/utils";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30";

function TextWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  placeholder,
  onChange,
  onBlur,
  onFocus,
  type,
}: WidgetProps) {
  return (
    <Input
      id={id}
      type={type === "number" ? "text" : (type ?? "text")}
      required={required}
      disabled={disabled || readonly}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
      onBlur={onBlur && ((e) => onBlur(id, e.target.value))}
      onFocus={onFocus && ((e) => onFocus(id, e.target.value))}
    />
  );
}

function TextareaWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  placeholder,
  onChange,
  options,
}: WidgetProps) {
  return (
    <Textarea
      id={id}
      required={required}
      disabled={disabled || readonly}
      placeholder={placeholder}
      rows={(options?.rows as number) ?? 4}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
    />
  );
}

function UpDownWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  placeholder,
  onChange,
}: WidgetProps) {
  return (
    <Input
      id={id}
      type="number"
      required={required}
      disabled={disabled || readonly}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
    />
  );
}

function DateWidget({ id, value, required, disabled, readonly, onChange }: WidgetProps) {
  return (
    <Input
      id={id}
      type="date"
      required={required}
      disabled={disabled || readonly}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
    />
  );
}

function SelectWidget({
  id,
  value,
  required,
  disabled,
  readonly,
  onChange,
  options,
  multiple,
}: WidgetProps) {
  const enumOptions = (options.enumOptions ?? []) as { value: string; label: string }[];
  return (
    <select
      id={id}
      className={selectClassName}
      required={required}
      disabled={disabled || readonly}
      multiple={multiple}
      value={value ?? (multiple ? [] : "")}
      onChange={(e) => {
        if (multiple) {
          const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
          onChange(selected);
          return;
        }
        onChange(e.target.value === "" ? undefined : e.target.value);
      }}
    >
      {!multiple && <option value="">Select…</option>}
      {enumOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// Boolean fields (the "checkbox" field type in the builder palette).
function CheckboxWidget({ id, value, disabled, readonly, onChange, label }: WidgetProps) {
  return (
    <div className="flex items-center gap-2">
      <Switch
        id={id}
        checked={Boolean(value)}
        disabled={disabled || readonly}
        onCheckedChange={(checked) => onChange(checked)}
      />
      {label && <span className="text-sm text-foreground">{label}</span>}
    </div>
  );
}

// Multi-select fields — an array of enum strings, rendered as a checkbox group
// rather than SelectWidget's native <select multiple>, matching the "checkbox
// group" UX the builder's field-type palette advertises.
function CheckboxesWidget({ id, value, disabled, readonly, onChange, options }: WidgetProps) {
  const enumOptions = (options.enumOptions ?? []) as { value: string; label: string }[];
  const selected: string[] = Array.isArray(value) ? value : [];

  function toggle(optionValue: string, checked: boolean) {
    onChange(checked ? [...selected, optionValue] : selected.filter((v) => v !== optionValue));
  }

  return (
    <div id={id} className="flex flex-col gap-2">
      {enumOptions.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border border-input accent-primary"
            checked={selected.includes(opt.value)}
            disabled={disabled || readonly}
            onChange={(e) => toggle(opt.value, e.target.checked)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}

// Captures a file as a base64 data: URL — rjsf's standard `format: "data-url"`
// convention. No Supabase Storage integration here: this widget is scoped to
// the form builder/renderer only, not document storage (that's Phase 4's
// separate documents pipeline).
function FileWidget({ id, required, disabled, readonly, onChange, multiple }: WidgetProps) {
  function readFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      onChange(multiple ? [] : undefined);
      return;
    }
    const readers = Array.from(fileList).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(
              `data:${file.type};name=${encodeURIComponent(file.name)};base64,${(reader.result as string).split(",")[1]}`
            );
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    );
    Promise.all(readers).then((results) => onChange(multiple ? results : results[0]));
  }

  return (
    <input
      id={id}
      type="file"
      required={required}
      disabled={disabled || readonly}
      multiple={multiple}
      className={cn(
        "block w-full text-sm text-foreground file:mr-2.5 file:rounded-lg file:border file:border-input file:bg-transparent file:px-2.5 file:py-1 file:text-sm file:font-medium file:text-foreground"
      )}
      onChange={(e) => readFiles(e.target.files)}
    />
  );
}

export const rjsfWidgets: RegistryWidgetsType = {
  TextWidget,
  TextareaWidget,
  UpDownWidget,
  DateWidget,
  SelectWidget,
  CheckboxWidget,
  CheckboxesWidget,
  FileWidget,
  EmailWidget: TextWidget,
};
