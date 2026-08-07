"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalPhoneSchema = exports.phoneSchema = void 0;
const libphonenumber_js_1 = require("libphonenumber-js");
const zod_1 = require("zod");
// Required E.164 phone number, e.g. "+919876543210".
exports.phoneSchema = zod_1.z
    .string()
    .min(1)
    .max(20)
    .refine(libphonenumber_js_1.isValidPhoneNumber, { message: "Enter a valid phone number" });
// Optional E.164 phone number — empty string/undefined both pass.
exports.optionalPhoneSchema = zod_1.z
    .string()
    .max(20)
    .refine((value) => value === "" || (0, libphonenumber_js_1.isValidPhoneNumber)(value), {
    message: "Enter a valid phone number",
})
    .optional();
//# sourceMappingURL=phone.js.map