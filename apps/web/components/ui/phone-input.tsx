"use client";

import * as React from "react";
import RPNInput, {
  getCountryCallingCode,
  isValidPhoneNumber,
  type Country,
  type Value,
} from "react-phone-number-input";

import { cn } from "@/lib/utils";

const inputClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40";

interface CountrySelectOption {
  value?: Country;
  label: string;
  divider?: boolean;
}

const CountrySelect = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select"> & {
    iconComponent?: React.ComponentType<{ country: Country }>;
    options?: CountrySelectOption[];
  }
>(({ className, iconComponent, options, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "h-8 shrink-0 rounded-lg border border-input bg-transparent px-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
      className
    )}
    {...props}
  >
    {options
      ?.filter((option): option is CountrySelectOption & { value: Country } => !!option.value)
      .map((option) => (
        <option key={option.value} value={option.value}>
          {option.value} +{getCountryCallingCode(option.value)}
        </option>
      ))}
  </select>
));
CountrySelect.displayName = "CountrySelect";

const PhoneNumberInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => (
    <input ref={ref} type="tel" className={cn(inputClassName, className)} {...props} />
  )
);
PhoneNumberInput.displayName = "PhoneNumberInput";

export interface PhoneInputProps {
  id?: string;
  value?: string | undefined;
  onChange?: (value: string | undefined) => void;
  /** Uncontrolled mode: seeds internal state instead of requiring value/onChange from the parent. */
  defaultValue?: string;
  defaultCountry?: Country;
  placeholder?: string;
  className?: string;
  /** Applied to both the country select and the number input, e.g. to match a form's field height. */
  inputClassName?: string;
  /** Shows a "not a valid phone number" hint once the field has a value that doesn't parse. */
  showValidation?: boolean;
}

function PhoneInput({
  id,
  value,
  onChange,
  defaultValue,
  defaultCountry = "IN",
  placeholder,
  className,
  inputClassName,
  showValidation = true,
}: PhoneInputProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = (isControlled ? value : internalValue) as Value | undefined;
  const isInvalid = showValidation && !!currentValue && !isValidPhoneNumber(currentValue);

  return (
    <div className="flex flex-col gap-1">
      <RPNInput
        id={id}
        className={cn("flex items-center gap-1.5", className)}
        international
        defaultCountry={defaultCountry}
        countrySelectProps={{ className: inputClassName }}
        numberInputProps={{ className: inputClassName, "aria-invalid": isInvalid }}
        countrySelectComponent={CountrySelect}
        inputComponent={PhoneNumberInput}
        placeholder={placeholder}
        value={currentValue}
        onChange={isControlled ? onChange! : setInternalValue}
      />
      {isInvalid && <p className="text-xs text-destructive">Enter a valid phone number.</p>}
    </div>
  );
}

export { PhoneInput };
