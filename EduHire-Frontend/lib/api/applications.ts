import { apiClient } from '../api-client';
import { ApplicationState, Availability, AvailableTimings, MaritalStatus, Subject, TeacherPost, TypeOfPractice } from '../shared/enums';

export interface Application {
  _id: string;
  jobId: string;
  schoolId: string;
  seekerId: string;
  state: ApplicationState;
  coverNote?: string;
  shortlistedAt?: string;
  paymentDueBy?: string;
  paidAt?: string;
  schoolRevealed: boolean;
  decisionReason?: string;
  createdAt: string;
  job?: {
    _id: string;
    title: string;
    city: string;
    state: string;
    role: string;
    department: string;
  };
  school?: {
    _id: string;
    name: string;
    logoUrl: string | null;
    city: string;
    state: string;
    address?: string;
    pincode?: string;
    description?: string;
    website?: string;
    isVerified?: boolean;
    campusFacilities?: string;
    noOfClassrooms?: number;
    noOfLabsOrSpecialRooms?: number;
    phone?: string;
    email?: string;
  };
  seeker?: {
    _id: string;
    email: string;
    phone?: string;
    seekerProfile?: {
      fullName: string;
      headline?: string | null;
      bio?: string | null;
      skills?: string[];
      resumeUrl?: string | null;
      city?: string | null;
      state?: string | null;
      expertise?: Subject[];
      degrees?: string[];
      availability?: Availability | null;
      age?: number | null;
      gender?: string | null;
      maritalStatus?: MaritalStatus | null;
      whatsappNumber?: string | null;
      pincode?: string | null;
      currentSchool?: string | null;
      employmentType?: TypeOfPractice | null;
      academics?: TeacherPost | null;
      salaryRange?: string | null;
      isRegisteredWithBoard?: boolean | null;
      boardRegistrationName?: string | null;
      desiredCities?: string[];
      experienceYears?: number | null;
      availableTimings?: AvailableTimings[];
      interestedToCover?: Subject[];
      indemnityInsurance?: boolean | null;
    };
  };
}

export const applicationsApi = {
  apply: (jobId: string, coverNote?: string) =>
    apiClient.post<Application>(`/jobs/${jobId}/apply`, { coverNote }),

  myApplications: () =>
    apiClient.get<Application[]>('/applications/my'),

  jobApplicants: (jobId: string) =>
    apiClient.get<Application[]>(`/jobs/${jobId}/applicants`),

  shortlist: (jobId: string, applicationId: string) =>
    apiClient.post<Application>(`/jobs/${jobId}/applicants/${applicationId}/shortlist`),

  markWon: (jobId: string, applicationId: string, reason?: string) =>
    apiClient.post(`/jobs/${jobId}/applicants/${applicationId}/won`, { reason }),

  markClosed: (jobId: string, applicationId: string, reason?: string) =>
    apiClient.post(`/jobs/${jobId}/applicants/${applicationId}/close`, { reason }),

  recruiterChats: () =>
    apiClient.get<Application[]>('/applications/recruiter-chats'),
};
