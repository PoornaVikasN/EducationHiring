import { apiClient } from '../api-client';
import { JobStatus, JobType } from '../shared/enums';

export interface Job {
  _id: string;
  type: JobType;
  status: JobStatus;
  hospitalId: string;
  title: string;
  description: string;
  requirements: string[];
  city: string;
  state: string;
  department: string;
  role: string;
  experienceMin: number;
  experienceMax: number;
  salaryMin: number;
  salaryMax: number;
  expiresAt: string | null;
  isBoosted: boolean;
  jobTimingStart?: string | null;
  jobTimingEnd?: string | null;
  noOfCasesPerMonth?: number | null;
  departmentRequirements?: string[];
  specializations?: string[];
  requiredDegree?: string | null;
  openPositions?: number;
  filledPositions?: number;
  jobDocumentUrl?: string | null;
  createdAt: string;
  hospital?: {
    _id: string;
    name: string;
    logoUrl: string | null;
    city: string;
    state: string;
    verified: boolean;
  };
}

export interface JobsQuery {
  page?: number;
  limit?: number;
  type?: JobType;
  status?: JobStatus;
  city?: string;
  search?: string;
  department?: string;
  role?: string;
  expertise?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedJobs {
  data: Job[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateJobPayload {
  type: JobType;
  title: string;
  description: string;
  requirements: string[];
  city: string;
  state: string;
  department: string;
  role: string;
  experienceMin: number;
  experienceMax: number;
  salaryMin: number;
  salaryMax: number;
  jobTimingStart?: string;
  jobTimingEnd?: string;
  noOfCasesPerMonth?: number;
  departmentRequirements?: string[];
  specializations?: string[];
  requiredDegree?: string;
  openPositions?: number;
  jobDocumentUrl?: string;
  latitude?: number;
  longitude?: number;
}

export const jobsApi = {
  list: (params?: JobsQuery) =>
    apiClient.get<PaginatedJobs>('/jobs', { params }),

  getById: (id: string) =>
    apiClient.get<Job>(`/jobs/${id}`),

  getMyById: (id: string) =>
    apiClient.get<Job>(`/jobs/recruiter/${id}`),

  create: (data: CreateJobPayload) =>
    apiClient.post<Job>('/jobs', data),

  myJobs: (params?: JobsQuery) =>
    apiClient.get<PaginatedJobs>('/jobs/recruiter/my-jobs', { params }),

  update: (id: string, data: Partial<CreateJobPayload>) =>
    apiClient.patch<Job>(`/jobs/${id}`, data),

  remove: (id: string) =>
    apiClient.delete(`/jobs/${id}`),

  adminList: (params?: JobsQuery) =>
    apiClient.get<PaginatedJobs>('/jobs/admin/all', { params }),

  adminDisable: (id: string) =>
    apiClient.patch(`/jobs/admin/${id}/disable`),
};
