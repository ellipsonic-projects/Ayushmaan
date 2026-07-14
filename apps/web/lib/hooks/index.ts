// Authentication
export { useAuth } from "@/lib/auth/context";

// Consultants
export {
  useConsultants,
  useConsultant,
  useConsultantAvailability,
  useConsultantCredentials,
  useConsultantReviews,
} from "./useConsultants";

// Appointments
export {
  useAppointments,
  useAppointment,
  createAppointment,
  cancelAppointment,
} from "./useAppointments";

// Availability
export {
  useAvailability,
  useBlackoutDates,
  useMyAvailability,
  useMyBlackoutDates,
  createAvailability,
  deleteAvailability,
  addBlackoutDate,
  getAvailableSlots,
} from "./useAvailability";

// Tenants (platform console)
export {
  useTenants,
  createTenant,
  useTenantCustomLayoutStatus,
  uploadTenantCustomLayout,
  removeTenantCustomLayout,
} from "./useTenants";
export type {
  Tenant,
  TenantsQuery,
  CreateTenantInput,
  TenantCustomLayoutStatus,
} from "./useTenants";

// Tenant public site (branding + landing-page content)
export {
  usePublicTenantSite,
  useTenantSite,
  updateTenantSite,
  uploadTenantLogo,
  requestCustomLayout,
} from "./useTenantSite";
export type {
  TenantSite,
  PublicTenantSite,
  TenantThemeConfig,
  TenantSiteContent,
} from "./useTenantSite";

// Current identity
export { useMe } from "./useMe";
