import { apiClient } from '../api-client';
import { Subject, VerificationStatus } from '../shared/enums';

export interface School {
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
  noOfClassrooms?: number | null;
  campusFacilities: string[];
  noOfLabsOrSpecialRooms?: number | null;
  photos?: string[];
  scopeOfServices?: string | null;
  schoolStrength?: number | null;
  studentCapacity?: number | null;
  accreditations?: string[];
  departments?: Subject[];
  verificationStatus?: VerificationStatus;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateSchoolPayload {
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
  noOfClassrooms?: number;
  campusFacilities?: string[];
  noOfLabsOrSpecialRooms?: number;
  photos?: string[];
  scopeOfServices?: string;
  schoolStrength?: number;
  studentCapacity?: number;
  accreditations?: string[];
  departments?: Subject[];
  latitude?: number;
  longitude?: number;
}

export const schoolsApi = {
  create: (data: CreateSchoolPayload) =>
    apiClient.post<School>('/schools', data),

  getMine: () =>
    apiClient.get<School>('/schools/mine'),

  getById: (id: string) =>
    apiClient.get<School>(`/schools/${id}`),

  update: (id: string, data: Partial<CreateSchoolPayload>) =>
    apiClient.patch<School>(`/schools/${id}`, data),
};
