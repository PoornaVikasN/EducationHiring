import axios, { InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// Bare origin (no /api suffix) for Socket.IO connections — the backend's global 'api' prefix
// (app.setGlobalPrefix('api') in main.ts) only applies to REST controllers, not WebSocket
// gateway namespaces, so a socket must connect to `${SOCKET_ORIGIN}/chat`, never
// `${API_BASE_URL}/chat`. Derived from the same env var as the REST client so there is only
// one source of truth for "where's the backend" — a second, separately-named env var
// (NEXT_PUBLIC_API_BASE_URL) used to back this and had silently drifted to an /api-suffixed
// value, which made every chat socket connect to a namespace that doesn't exist.
export const SOCKET_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

// In-memory access token — never persisted to localStorage/sessionStorage
let currentToken: string | null = null;
let isRefreshing = false;
let refreshQueue: ((token: string | null) => void)[] = [];

export function setAccessToken(token: string | null): void {
  currentToken = token;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  // X-Requested-With is part of the CSRF defense on cookie-auth endpoints (refresh/logout);
  // setting it as a default also makes all credentialed requests trigger CORS preflight.
  headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
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
        {
          withCredentials: true,
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        },
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
