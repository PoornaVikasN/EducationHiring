import { apiClient } from '../api-client';
import { Role, UserStatus } from '../shared/enums';

export interface AdminSeekerProfile {
  fullName?: string;
  headline?: string | null;
  bio?: string | null;
  skills?: string[];
  resumeUrl?: string | null;
  city?: string | null;
  state?: string | null;
  availability?: string | null;
  experienceYears?: number | null;
  age?: number | null;
  gender?: string | null;
  maritalStatus?: string | null;
  degrees?: string[];
  whatsappNumber?: string | null;
  pincode?: string | null;
  placeOfPractice?: string | null;
  typeOfPractice?: string | null;
  expertise?: string[];
  academics?: string | null;
  salaryRange?: string | null;
  availableTimings?: string[];
  interestedToCover?: string[];
  indemnityInsurance?: boolean | null;
  isRegisteredInCouncil?: boolean | null;
  medicalCouncilName?: string | null;
  desiredCities?: string[];
  desiredJobTypes?: string[];
  certUrls?: string[];
}

export interface AdminUser {
  _id: string;
  email?: string;
  phone?: string;
  role: string;
  status: UserStatus;
  isActive?: boolean;
  emailVerified: boolean;
  createdAt: string;
  seekerProfile?: AdminSeekerProfile;
  recruiterProfile?: { fullName?: string; hospitalId?: string | null; hospitalName?: string | null };
}

export interface AdminHospital {
  _id: string;
  name: string;
  registrationNumber?: string;
  logoUrl?: string | null;
  address?: string;
  city: string;
  state: string;
  pincode?: string;
  phone: string;
  email: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string | null;
  website?: string | null;
  noOfOperationTheatres?: number | null;
  hospitalInfra?: string[];
  noOfCabinsAndBeds?: number | null;
  photos?: string[];
  scopeOfServices?: string | null;
  hospitalStrength?: number | null;
  noOfBeds?: number | null;
  accreditations?: string[];
  departments?: string[];
  isVerified: boolean;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalSeekers: number;
  totalRecruiters: number;
  totalHospitals: number;
  activeJobs: number;
  sosActiveJobs: number;
  fullTimeActiveJobs: number;
  pendingHospitals: number;
  filledJobs: number;
  totalRevenuePaise: number;
  monthlyRevenuePaise: number;
}

export interface AuditLog {
  _id: string;
  adminEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PaginatedAdminUsers {
  data: AdminUser[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PaginatedAdminHospitals {
  data: AdminHospital[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export type DisputeStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';
export type DisputeKind = 'PAYMENT_REFUND' | 'APPLICATION_DISPUTE' | 'OTHER';

export interface Dispute {
  _id: string;
  raisedBy: { _id: string; email?: string; phone?: string; role: string; seekerProfile?: { fullName?: string }; recruiterProfile?: { fullName?: string } };
  kind: DisputeKind;
  subject: string;
  description: string;
  referenceId?: string;
  status: DisputeStatus;
  adminNote?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface PaginatedDisputes {
  data: Dispute[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateAdminUserPayload {
  role: Role.JOB_SEEKER | Role.RECRUITER | Role.ADMIN;
  email: string;
  phone: string;
  fullName?: string;
  password: string;
}

export interface SettingConfig {
  _id: string;
  key: string;
  label: string;
  description: string;
  valueNumber: number;
  minValue: number;
}

export interface PricingConfig {
  _id: string;
  key: string;
  label: string;
  description: string;
  valueNumber: number;
  minValue: number;
  type: 'price' | 'api_key';
}

export interface ApiKeyStatus {
  key: string;
  label: string;
  service: string;
  isSet: boolean;
}

export interface PaymentRecord {
  _id: string;
  kind: string;
  status: string;
  amountPaise: number;
  userId: string;
  entityId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  user?: { email?: string; fullName?: string };
  createdAt: string;
}

export interface PaginatedAdminPayments {
  data: PaymentRecord[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const adminApi = {
  stats: () =>
    apiClient.get<AdminStats>('/admin/stats'),

  createUser: (data: CreateAdminUserPayload) =>
    apiClient.post<{ message: string }>('/admin/users', data),

  listUsers: (page = 1, limit = 20, search?: string, role?: string, isActive?: boolean, city?: string, joinedFrom?: string, joinedTo?: string) =>
    apiClient.get<PaginatedAdminUsers>('/admin/users', { params: { page, limit, search, role, isActive, city, joinedFrom, joinedTo } }),

  suspendUser: (id: string) =>
    apiClient.patch(`/admin/users/${id}/suspend`),

  activateUser: (id: string) =>
    apiClient.patch(`/admin/users/${id}/activate`),

  listHospitals: (page = 1, limit = 20, verified?: boolean, search?: string, registeredFrom?: string, registeredTo?: string) =>
    apiClient.get<PaginatedAdminHospitals>('/admin/hospitals', { params: { page, limit, verified, search, registeredFrom, registeredTo } }),

  verifyHospital: (id: string) =>
    apiClient.patch(`/admin/hospitals/${id}/verify`),

  rejectHospital: (id: string) =>
    apiClient.patch(`/admin/hospitals/${id}/reject`),

  listDisputes: (page = 1, limit = 20, status?: DisputeStatus) =>
    apiClient.get<PaginatedDisputes>('/disputes', { params: { page, limit, status } }),

  reviewDispute: (id: string) =>
    apiClient.patch(`/disputes/${id}/review`),

  resolveDispute: (id: string, adminNote: string) =>
    apiClient.patch(`/disputes/${id}/resolve`, { adminNote }),

  rejectDispute: (id: string, adminNote: string) =>
    apiClient.patch(`/disputes/${id}/reject`, { adminNote }),

  listAdminPayments: (page = 1, limit = 20, kind?: string, status?: string, dateFrom?: string, dateTo?: string) =>
    apiClient.get<PaginatedAdminPayments>('/payments/admin', { params: { page, limit, kind, status, dateFrom, dateTo } }),

  getPricing: () =>
    apiClient.get<PricingConfig[]>('/admin/config/pricing'),

  updatePrice: (key: string, valueNumber: number) =>
    apiClient.patch(`/admin/config/pricing/${key}`, { valueNumber }),

  getApiKeyStatuses: () =>
    apiClient.get<ApiKeyStatus[]>('/admin/config/env'),

  setApiKey: (key: string, value: string) =>
    apiClient.patch(`/admin/config/env/${key}`, { value }),

  getSettings: () =>
    apiClient.get<SettingConfig[]>('/admin/config/settings'),

  updateSetting: (key: string, value: number) =>
    apiClient.patch(`/admin/config/settings/${key}`, { value }),

  getConfigStatus: () =>
    apiClient.get<Record<string, boolean>>('/admin/config/status'),

  listAuditLogs: (page = 1, limit = 20, entityType?: string) =>
    apiClient.get<PaginatedAuditLogs>('/admin/audit', { params: { page, limit, entityType } }),
};
