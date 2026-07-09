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
  currentSchool?: string | null;
  employmentType?: string | null;
  expertise?: string[];
  academics?: string | null;
  salaryRange?: string | null;
  availableTimings?: string[];
  interestedToCover?: string[];
  indemnityInsurance?: boolean | null;
  isRegisteredWithBoard?: boolean | null;
  boardRegistrationName?: string | null;
  desiredCities?: string[];
  certUrls?: string[];
}

export interface AdminUser {
  _id: string;
  email?: string;
  phone?: string;
  role: string;
  status: UserStatus;
  isActive?: boolean;
  deletedAt?: string | null;
  emailVerified: boolean;
  createdAt: string;
  seekerProfile?: AdminSeekerProfile;
  recruiterProfile?: { fullName?: string; schoolId?: string | null; schoolName?: string | null };
}

export interface AdminSchool {
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
  noOfClassrooms?: number | null;
  campusFacilities?: string[];
  noOfLabsOrSpecialRooms?: number | null;
  photos?: string[];
  scopeOfServices?: string | null;
  schoolStrength?: number | null;
  studentCapacity?: number | null;
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
  totalSchools: number;
  activeJobs: number;
  pendingSchools: number;
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

export interface PaginatedAdminSchools {
  data: AdminSchool[];
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
  role: Role.TEACHER | Role.RECRUITER | Role.ADMIN;
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

export interface EmailTemplateChannels {
  seekerEmail: boolean;
  seekerInApp: boolean;
  recruiterEmail: boolean;
  recruiterInApp: boolean;
}

export interface EmailTemplate {
  _id: string;
  key: string;
  name: string;
  trigger: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
  isActive: boolean;
  isSystem: boolean;
  channels: EmailTemplateChannels;
  inAppSeekerTitle: string | null;
  inAppSeekerBody: string | null;
  inAppRecruiterTitle: string | null;
  inAppRecruiterBody: string | null;
  updatedAt: string;
}

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalPage {
  _id: string;
  key: string;
  title: string;
  lastUpdatedLabel: string;
  sections: LegalSection[];
  updatedAt: string;
}

export const adminApi = {
  stats: () =>
    apiClient.get<AdminStats>('/admin/stats'),

  createUser: (data: CreateAdminUserPayload) =>
    apiClient.post<{ message: string }>('/admin/users', data),

  listUsers: (page = 1, limit = 20, search?: string, role?: string, isActive?: boolean, city?: string, joinedFrom?: string, joinedTo?: string, includeDeleted?: boolean) =>
    apiClient.get<PaginatedAdminUsers>('/admin/users', { params: { page, limit, search, role, isActive, city, joinedFrom, joinedTo, includeDeleted } }),

  suspendUser: (id: string) =>
    apiClient.patch(`/admin/users/${id}/suspend`),

  activateUser: (id: string) =>
    apiClient.patch(`/admin/users/${id}/activate`),

  deleteUser: (id: string) =>
    apiClient.delete(`/admin/users/${id}`),

  restoreUser: (id: string) =>
    apiClient.patch(`/admin/users/${id}/restore`),

  listSchools: (page = 1, limit = 20, verified?: boolean, search?: string, registeredFrom?: string, registeredTo?: string) =>
    apiClient.get<PaginatedAdminSchools>('/admin/schools', { params: { page, limit, verified, search, registeredFrom, registeredTo } }),

  verifySchool: (id: string) =>
    apiClient.patch(`/admin/schools/${id}/verify`),

  rejectSchool: (id: string) =>
    apiClient.patch(`/admin/schools/${id}/reject`),

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

  getEmailTemplates: () =>
    apiClient.get<EmailTemplate[]>('/admin/config/email-templates'),

  updateEmailTemplate: (key: string, data: Partial<Pick<EmailTemplate, 'subject' | 'body' | 'description' | 'isActive' | 'channels' | 'inAppSeekerTitle' | 'inAppSeekerBody' | 'inAppRecruiterTitle' | 'inAppRecruiterBody'>>) =>
    apiClient.patch<EmailTemplate>(`/admin/config/email-templates/${key}`, data),

  createEmailTemplate: (data: Omit<EmailTemplate, '_id' | 'isSystem' | 'updatedAt'>) =>
    apiClient.post<EmailTemplate>('/admin/config/email-templates', data),

  deleteEmailTemplate: (key: string) =>
    apiClient.delete(`/admin/config/email-templates/${key}`),

  getLegalPages: () =>
    apiClient.get<LegalPage[]>('/admin/config/legal-pages'),

  updateLegalPage: (key: string, data: Partial<Pick<LegalPage, 'title' | 'lastUpdatedLabel' | 'sections'>>) =>
    apiClient.patch<LegalPage>(`/admin/config/legal-pages/${key}`, data),
};
