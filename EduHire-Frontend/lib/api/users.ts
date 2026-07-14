import { apiClient } from '../api-client';
import { Availability, AvailableTimings, Gender, MaritalStatus, SalaryRange, Subject, TeacherPost, TypeOfPractice } from '../shared/enums';

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
  introVideoUrl?: string;
  certificateUrls?: string[];
  skills?: string[];
  age?: number;
  maritalStatus?: MaritalStatus;
  degrees?: string[];
  desiredCities?: string[];
  whatsappNumber?: string;
  pincode?: string;
  currentSchool?: string;
  employmentType?: TypeOfPractice;
  expertise?: Subject[];
  academics?: TeacherPost;
  salaryRange?: SalaryRange;
  availableTimings?: AvailableTimings[];
  interestedToCover?: Subject[];
  indemnityInsurance?: boolean;
  isRegisteredWithBoard?: boolean;
  boardRegistrationName?: string;
  latitude?: number;
  longitude?: number;
}

export interface UserSettingsPayload {
  alertNewJobs?: boolean;
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
