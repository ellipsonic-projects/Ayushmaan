// Authentication
export { useAuth } from '@/lib/auth/context';

// Consultants
export {
  useConsultants,
  useConsultant,
  useConsultantAvailability,
  useConsultantCredentials,
  useConsultantReviews,
} from './useConsultants';

// Appointments
export {
  useAppointments,
  useAppointment,
  createAppointment,
  cancelAppointment,
} from './useAppointments';

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
} from './useAvailability';
