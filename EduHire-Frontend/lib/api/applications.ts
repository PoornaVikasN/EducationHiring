import { apiClient } from '../api-client';
import { Academics, ApplicationState, Availability, AvailableTimings, JobType, MaritalStatus, TypeOfPractice } from '../shared/enums';

export interface Application {
  _id: string;
  jobId: string;
  hospitalId: string;
  seekerId: string;
  state: ApplicationState;
  coverNote?: string;
  shortlistedAt?: string;
  paymentDueBy?: string;
  paidAt?: string;
  hospitalRevealed: boolean;
  decisionReason?: string;
  createdAt: string;
  job?: {
    _id: string;
    title: string;
    type: JobType;
    city: string;
    state: string;
    role: string;
    department: string;
  };
  hospital?: {
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
    hospitalInfra?: string;
    noOfOperationTheatres?: number;
    noOfCabinsAndBeds?: number;
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
      expertise?: string[];
      degrees?: string[];
      availability?: Availability | null;
      age?: number | null;
      gender?: string | null;
      maritalStatus?: MaritalStatus | null;
      whatsappNumber?: string | null;
      pincode?: string | null;
      placeOfPractice?: string | null;
      typeOfPractice?: TypeOfPractice | null;
      academics?: Academics | null;
      salaryRange?: string | null;
      isRegisteredInCouncil?: boolean | null;
      medicalCouncilName?: string | null;
      desiredCities?: string[];
      experienceYears?: number | null;
      availableTimings?: AvailableTimings[];
      interestedToCover?: string[];
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
