import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

// Required E.164 phone number, e.g. "+919876543210".
export const phoneSchema = z
  .string()
  .min(1)
  .max(20)
  .refine(isValidPhoneNumber, { message: "Enter a valid phone number" });

// Optional E.164 phone number — empty string/undefined both pass.
export const optionalPhoneSchema = z
  .string()
  .max(20)
  .refine((value) => value === "" || isValidPhoneNumber(value), {
    message: "Enter a valid phone number",
  })
  .optional();
