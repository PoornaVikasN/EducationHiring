'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { setAccessToken } from './api-client';
import { authApi, SafeUser } from './api/auth';

interface AuthContextValue {
  user: SafeUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (token: string, user: SafeUser) => void;
  logout: () => Promise<void>;
  updateUser: (user: SafeUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [accessToken, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: clear stale localStorage keys from old implementation (auth is cookie-based now)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_role');
    }
  }, []);

  // On mount: try to restore session from the httpOnly refresh cookie
  useEffect(() => {
    authApi
      .refresh()
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        setToken(data.accessToken);
        return authApi.getMe();
      })
      .then(({ data }) => setUser(data))
      .catch(() => {
        // No valid session — stay logged out
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback((token: string, userData: SafeUser) => {
    setAccessToken(token);
    setToken(token);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setAccessToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((userData: SafeUser) => {
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
