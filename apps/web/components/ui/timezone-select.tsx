"use client";

import TimezoneSelect, { type ITimezoneOption } from "react-timezone-select";

import { cn } from "@/lib/utils";

// Thin wrapper so every timezone picker in the app (client/consultant
// profiles) shares one IANA-aware, searchable control instead of a
// hardcoded handful of <SelectItem> options.
export function TimezoneSelectField({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (timezone: string) => void;
  className?: string;
}) {
  return (
    <TimezoneSelect
      value={value}
      onChange={(tz: ITimezoneOption) => onChange(tz.value)}
      className={cn("text-sm", className)}
      unstyled
      classNames={{
        control: () =>
          "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs",
        menu: () =>
          "mt-1 rounded-md border border-border bg-popover text-popover-foreground shadow-md",
        menuList: () => "max-h-64 overflow-auto p-1",
        option: ({ isFocused, isSelected }) =>
          cn(
            "cursor-pointer rounded-sm px-2 py-1.5",
            isSelected
              ? "bg-primary text-primary-foreground"
              : isFocused
                ? "bg-accent text-accent-foreground"
                : ""
          ),
        input: () => "text-foreground",
        singleValue: () => "text-foreground",
        placeholder: () => "text-muted-foreground",
        indicatorSeparator: () => "hidden",
        dropdownIndicator: () => "text-muted-foreground px-1",
      }}
    />
  );
}
