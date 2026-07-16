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
export { useTenants, createTenant } from "./useTenants";
export type { Tenant, TenantsQuery, CreateTenantInput } from "./useTenants";

// Dashboard (platform console)
export { usePlatformDashboardStats, useRecentGrievances } from "./usePlatformDashboard";
export type {
  PlatformDashboardStats,
  PlatformGrievance,
  GrievanceSeverity,
  GrievanceStatus,
  GrievanceCategory,
} from "./usePlatformDashboard";
