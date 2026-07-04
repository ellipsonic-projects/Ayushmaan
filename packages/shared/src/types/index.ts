// User & Auth Types
export enum UserRole {
  CLIENT = 'CLIENT',
  CONSULTANT = 'CONSULTANT',
  TENANT_ADMIN = 'TENANT_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BANNED = 'BANNED',
  DELETED = 'DELETED'
}

export interface User {
  id: string;
  supabaseAuthUserId: string | null;
  email: string;
  phone: string | null;
  phoneVerified: boolean;
  emailVerified: boolean;
  role: UserRole;
  accountStatus: AccountStatus;
  isActive: boolean;
  tenantId: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Consultant Profile Types
export enum ConsultantCategory {
  MEDICAL = 'MEDICAL',
  LEGAL = 'LEGAL',
  IT = 'IT',
  PHYSIOTHERAPY = 'PHYSIOTHERAPY',
  HOMEOPATHY = 'HOMEOPATHY',
  ASTROLOGY = 'ASTROLOGY'
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export enum PaymentTimingPref {
  PAY_ON_BOOKING = 'PAY_ON_BOOKING',
  PAY_AFTER_SESSION = 'PAY_AFTER_SESSION'
}

export enum VerificationDocType {
  MEDICAL_LICENSE = 'MEDICAL_LICENSE',
  BAR_REGISTRATION = 'BAR_REGISTRATION',
  DEGREE_CERTIFICATE = 'DEGREE_CERTIFICATE',
  GOVERNMENT_ID = 'GOVERNMENT_ID',
  PROFESSIONAL_CERTIFICATE = 'PROFESSIONAL_CERTIFICATE',
  OTHER = 'OTHER'
}

export interface ConsultantProfile {
  id: string;
  userId: string;
  fullName: string;
  category: ConsultantCategory;
  subSpecialization: string | null;
  bio: string | null;
  qualifications: string[];
  yearsOfExperience: number | null;
  consultationFee: number;
  currency: string;
  languagesSpoken: string[];
  timezone: string;
  verificationStatus: VerificationStatus;
  ratingAvg: number;
  ratingCount: number;
  isAcceptingNewClients: boolean;
  autoApproveBookings: boolean;
  paymentTiming: PaymentTimingPref;
  payoutAccountDetails: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsultantVerificationDocument {
  id: string;
  consultantId: string;
  documentType: VerificationDocType;
  fileUrl: string;
  fileName: string;
  issuingAuthority: string | null;
  issuedDate: Date | null;
  expiryDate: Date | null;
  createdAt: Date;
}

// Client Profile Types
export interface ClientProfile {
  id: string;
  userId: string;
  fullName: string;
  dob: Date | null;
  isMinor: boolean;
  gender: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  timezone: string;
  preferredLanguage: string;
  profilePhotoUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Appointment & Booking Types
export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESCHEDULED = 'RESCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW'
}

export interface Appointment {
  id: string;
  caseId: string;
  consultantId: string;
  clientId: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  notes: string | null;
  meetingUrl: string | null;
  recordingUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AvailabilitySlot {
  id: string;
  consultantId: string;
  dayOfWeek: number | null;
  specificDate: Date | null;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  isRecurring: boolean;
  bufferBeforeMins: number;
  bufferAfterMins: number;
  createdAt: Date;
}

// Case & Session Types
export enum CaseStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CLOSED = 'CLOSED'
}

export interface Case {
  id: string;
  consultantId: string;
  clientId: string;
  status: CaseStatus;
  caseCategory: ConsultantCategory;
  notes: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export enum InteractionType {
  APPOINTMENT = 'APPOINTMENT',
  PHONE_CALL = 'PHONE_CALL',
  MESSAGE = 'MESSAGE',
  NOTE = 'NOTE'
}

export interface Interaction {
  id: string;
  caseId: string;
  type: InteractionType;
  transcriptText: string | null;
  notesText: string | null;
  audioUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// Commitment & Task Types
export enum CommitmentStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  OVERDUE = 'OVERDUE'
}

export interface Commitment {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  status: CommitmentStatus;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  caseId: string;
  title: string;
  description: string | null;
  status: CommitmentStatus;
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP'
}

export interface Notification {
  id: string;
  userId: string;
  caseId: string | null;
  appointmentId: string | null;
  title: string;
  message: string;
  channels: NotificationChannel[];
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
