import axios, { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// In-memory access token — never persisted to localStorage/sessionStorage
let currentToken: string | null = null;
let isRefreshing = false;
let refreshQueue: ((token: string | null) => void)[] = [];

export function setAccessToken(token: string | null): void {
  currentToken = token;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
  withCredentials: true, // send refresh cookie on every request
});

// Attach access token
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

// Refresh-then-retry on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!original || error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Skip refresh loop for the refresh endpoint itself
    if (original.url?.includes('/auth/refresh') || original.url?.includes('/auth/logout')) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string | null>((resolve) => refreshQueue.push(resolve)).then(
        (token) => {
          if (!token) return Promise.reject(error);
          original.headers.Authorization = `Bearer ${token}`;
          original._retry = true;
          return apiClient(original);
        },
      );
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post<{ accessToken: string }>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      setAccessToken(data.accessToken);
      refreshQueue.forEach((cb) => cb(data.accessToken));
      refreshQueue = [];
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch {
      setAccessToken(null);
      refreshQueue.forEach((cb) => cb(null));
      refreshQueue = [];
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

export default apiClient;
