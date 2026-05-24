import { apiClient } from '../api-client';
import { Academics, Availability, AvailableTimings, Gender, HospitalDepartment, MaritalStatus, SalaryRange, TypeOfPractice } from '../shared/enums';

export interface SeekerProfilePayload {
  fullName: string;
  headline?: string;
  dateOfBirth?: string;
  gender?: Gender;
  city?: string;
  state?: string;
  experienceYears?: number;
  availability?: Availability;
  bio?: string;
  resumeUrl?: string;
  certificateUrls?: string[];
  skills?: string[];
  age?: number;
  maritalStatus?: MaritalStatus;
  degrees?: string[];
  desiredCities?: string[];
  whatsappNumber?: string;
  pincode?: string;
  placeOfPractice?: string;
  typeOfPractice?: TypeOfPractice;
  expertise?: string[];
  academics?: Academics;
  salaryRange?: SalaryRange;
  availableTimings?: AvailableTimings[];
  interestedToCover?: string[];
  indemnityInsurance?: boolean;
  isRegisteredInCouncil?: boolean;
  medicalCouncilName?: string;
  latitude?: number;
  longitude?: number;
}

export interface UserSettingsPayload {
  alertSosJobs?: boolean;
  alertFtJobs?: boolean;
}

export interface HospitalProfilePayload {
  name: string;
  registrationNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  noOfOperationTheatres?: number;
  hospitalInfra?: string[];
  noOfCabinsAndBeds?: number;
  photos?: string[];
  scopeOfServices?: string;
  hospitalStrength?: number;
  noOfBeds?: number;
  accreditations?: string[];
  departments?: HospitalDepartment[];
}

export interface RecruiterProfilePayload {
  fullName: string;
  phone?: string;
  designation?: string;
}

export const usersApi = {
  updateSeekerProfile: (data: SeekerProfilePayload) =>
    apiClient.patch('/users/me/seeker-profile', data),

  updateRecruiterProfile: (data: RecruiterProfilePayload) =>
    apiClient.patch('/users/me/recruiter-profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.patch<{ message: string }>('/users/me/change-password', data),

  deactivate: () =>
    apiClient.delete<{ message: string }>('/users/me'),

  updateSettings: (data: UserSettingsPayload) =>
    apiClient.patch<{ message: string }>('/users/me/settings', data),

  sendWhatsAppOtp: () =>
    apiClient.post<{ message: string }>('/users/profile/whatsapp/send-otp'),

  verifyWhatsAppOtp: (code: string) =>
    apiClient.post<{ verified: boolean }>('/users/profile/whatsapp/verify-otp', { code }),
};
