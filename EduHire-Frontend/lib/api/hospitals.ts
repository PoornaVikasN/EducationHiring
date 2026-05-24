import { apiClient } from '../api-client';
import { HospitalDepartment, VerificationStatus } from '../shared/enums';

export interface Hospital {
  _id: string;
  adminUserId: string;
  name: string;
  registrationNumber: string;
  logoUrl: string | null;
  description?: string | null;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail: string;
  website?: string | null;
  noOfOperationTheatres?: number | null;
  hospitalInfra: string[];
  noOfCabinsAndBeds?: number | null;
  photos?: string[];
  scopeOfServices?: string | null;
  hospitalStrength?: number | null;
  noOfBeds?: number | null;
  accreditations?: string[];
  departments?: HospitalDepartment[];
  verificationStatus?: VerificationStatus;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateHospitalPayload {
  name: string;
  registrationNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  noOfOperationTheatres?: number;
  hospitalInfra?: string[];
  noOfCabinsAndBeds?: number;
  photos?: string[];
  scopeOfServices?: string;
  hospitalStrength?: number;
  noOfBeds?: number;
  accreditations?: string[];
  departments?: HospitalDepartment[];
  latitude?: number;
  longitude?: number;
}

export const hospitalsApi = {
  create: (data: CreateHospitalPayload) =>
    apiClient.post<Hospital>('/hospitals', data),

  getMine: () =>
    apiClient.get<Hospital>('/hospitals/mine'),

  getById: (id: string) =>
    apiClient.get<Hospital>(`/hospitals/${id}`),

  update: (id: string, data: Partial<CreateHospitalPayload>) =>
    apiClient.patch<Hospital>(`/hospitals/${id}`, data),
};
