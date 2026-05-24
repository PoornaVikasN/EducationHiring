import { apiClient } from '../api-client';
import { Role } from '../shared/enums';

export interface SafeUser {
  id: string;
  role: Role;
  email?: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  seekerProfile: unknown;
  recruiterProfile: unknown;
  seekerSosSubscribedUntil?: string | null;
  alertSosJobs?: boolean;
  alertFtJobs?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
  isLinked?: boolean;
}

export const authApi = {
  register: (data: { email: string; phone: string; password: string; role: Role; fullName: string }) =>
    apiClient.post<{ message: string }>('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  googleAuth: (data: { accessToken: string; role: Role }) =>
    apiClient.post<AuthResponse>('/auth/google', data),

  sendOtp: (email: string) =>
    apiClient.post<{ message: string }>('/auth/otp/send', { email }),

  verifyOtp: (data: { email: string; code: string }) =>
    apiClient.post<AuthResponse>('/auth/otp/verify', data),

  refresh: () =>
    apiClient.post<{ accessToken: string }>('/auth/refresh'),

  forgotPassword: (email: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (data: { email: string; otp: string; password: string }) =>
    apiClient.post<{ message: string }>('/auth/reset-password', data),

  logout: () =>
    apiClient.post<{ message: string }>('/auth/logout'),

  getMe: () =>
    apiClient.get<SafeUser>('/users/me'),
};
