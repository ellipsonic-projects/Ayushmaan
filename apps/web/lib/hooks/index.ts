// Authentication
export { useAuth } from "@/lib/auth/context";

// Connectivity
export { useOnline } from "./useOnline";

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
export {
  usePlatformDashboardStats,
  useRecentGrievances,
  useGrievances,
} from "./usePlatformDashboard";
export type {
  PlatformDashboardStats,
  PlatformGrievance,
  GrievanceSeverity,
  GrievanceStatus,
  GrievanceCategory,
  GrievanceSubjectType,
  GrievancesQuery,
} from "./usePlatformDashboard";

// Audit log (platform console)
export { useAuditLog } from "./useAuditLog";
export type { AuditLogEntry, AuditLogQuery } from "./useAuditLog";

// Community template moderation (platform console)
export { useCommunityTemplateModeration } from "./useCommunityTemplateModeration";
export type { CommunityTemplateModerationRow } from "./useCommunityTemplateModeration";

// Notify / broadcasts (platform console)
export {
  useBroadcasts,
  useBroadcastStats,
  useAudienceEstimate,
  createBroadcast,
  getTenantClientsForAudience,
} from "./useBroadcasts";
export type {
  Broadcast,
  BroadcastUrgency,
  BroadcastScope,
  BroadcastTargetRole,
  BroadcastChannel,
  BroadcastStats,
  AudienceFilter,
  CreateBroadcastInput,
  AudienceClient,
} from "./useBroadcasts";
