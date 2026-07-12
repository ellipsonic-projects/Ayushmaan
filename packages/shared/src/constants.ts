export const CONSULTANT_CATEGORIES = [
  "MEDICAL",
  "LEGAL",
  "IT",
  "PHYSIOTHERAPY",
  "HOMEOPATHY",
  "ASTROLOGY",
] as const;

export const REQUIRED_DOCS_BY_CATEGORY: Record<string, string[]> = {
  MEDICAL: ["MEDICAL_LICENSE", "GOVERNMENT_ID"],
  LEGAL: ["BAR_REGISTRATION", "GOVERNMENT_ID"],
  IT: ["GOVERNMENT_ID"],
  PHYSIOTHERAPY: ["GOVERNMENT_ID"],
  HOMEOPATHY: ["GOVERNMENT_ID"],
  ASTROLOGY: ["GOVERNMENT_ID"],
};

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_LANGUAGE = "en";

// Booking constraints
export const BOOKING_CUTOFF_HOURS = 24;
export const MIN_SLOT_DURATION_MINS = 15;
export const MAX_SLOT_DURATION_MINS = 480; // 8 hours

// Appointment statuses
export const APPOINTMENT_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "RESCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

// Session recording
export const MAX_AUDIO_SIZE_MB = 500;
export const SUPPORTED_AUDIO_FORMATS = ["audio/wav", "audio/mp3", "audio/m4a", "audio/ogg"];

// Document upload
export const MAX_DOCUMENT_SIZE_MB = 50;
export const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
];

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Phone numbers must be E.164 (leading +, country code, no spaces/dashes) for
// Supabase Auth phone verification to accept them.
export const E164_PHONE_REGEX = /^\+[1-9]\d{6,14}$/;
