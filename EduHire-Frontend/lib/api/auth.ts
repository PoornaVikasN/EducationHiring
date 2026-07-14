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
  alertNewJobs: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: SafeUser;
  isLinked?: boolean;
}

export const authApi = {
  register: (data: { email: string; phone: string; password: string; role: Role; fullName: string; recaptchaToken?: string }) =>
    apiClient.post<{ message: string; devOtp?: string }>('/auth/register', data),

  login: (data: { email: string; password: string; recaptchaToken?: string }) =>
    apiClient.post<AuthResponse>('/auth/login', data),

  googleAuth: (data: { accessToken: string; role: Role }) =>
    apiClient.post<AuthResponse>('/auth/google', data),

  sendOtp: (email: string, recaptchaToken?: string) =>
    apiClient.post<{ message: string; devOtp?: string }>('/auth/otp/send', { email, recaptchaToken }),

  verifyOtp: (data: { email: string; code: string }) =>
    apiClient.post<AuthResponse>('/auth/otp/verify', data),

  refresh: () =>
    apiClient.post<{ accessToken: string }>('/auth/refresh'),

  forgotPassword: (email: string, recaptchaToken?: string) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', { email, recaptchaToken }),

  resetPassword: (data: { email: string; otp: string; password: string }) =>
    apiClient.post<{ message: string }>('/auth/reset-password', data),

  setPasswordViaActivation: (token: string, password: string) =>
    apiClient.post<{ message: string }>('/auth/activation/set-password', { token, password }),

  logout: () =>
    apiClient.post<{ message: string }>('/auth/logout'),

  getMe: () =>
    apiClient.get<SafeUser>('/users/me'),
};
