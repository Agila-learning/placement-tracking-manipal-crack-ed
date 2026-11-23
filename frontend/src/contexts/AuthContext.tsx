import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { authApi } from '../api/endpoints';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    localStorage.removeItem('fic_token');
    localStorage.removeItem('fic_login_date');
    localStorage.removeItem('fic_login_time');
    setToken(null);
    setUser(null);
  }, []);

  const bootstrapAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('fic_token');
    const storedLoginDate = localStorage.getItem('fic_login_date');
    const storedLoginTime = Number(localStorage.getItem('fic_login_time') || 0);
    const todayDate = new Date().toISOString().slice(0, 10);

    // Auto logout if login date was from a previous day or exceeded 24 hours
    const isDailyExpired = !storedLoginDate || storedLoginDate !== todayDate || (Date.now() - storedLoginTime > 24 * 60 * 60 * 1000);

    if (!storedToken || isDailyExpired) {
      localStorage.removeItem('fic_token');
      localStorage.removeItem('fic_login_date');
      localStorage.removeItem('fic_login_time');
      setToken(null);
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      setToken(storedToken);
      const res = await authApi.me();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        localStorage.removeItem('fic_token');
        localStorage.removeItem('fic_login_date');
        localStorage.removeItem('fic_login_time');
        setToken(null);
      }
    } catch {
      localStorage.removeItem('fic_token');
      localStorage.removeItem('fic_login_date');
      localStorage.removeItem('fic_login_time');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  // Periodic and on-focus check for daily automatic logout
  useEffect(() => {
    const checkDailyExpiry = () => {
      const currentToken = localStorage.getItem('fic_token');
      if (!currentToken) return;

      const storedLoginDate = localStorage.getItem('fic_login_date');
      const storedLoginTime = Number(localStorage.getItem('fic_login_time') || 0);
      const todayDate = new Date().toISOString().slice(0, 10);

      if (!storedLoginDate || storedLoginDate !== todayDate || (Date.now() - storedLoginTime > 24 * 60 * 60 * 1000)) {
        logout();
      }
    };

    const interval = setInterval(checkDailyExpiry, 30000);
    window.addEventListener('focus', checkDailyExpiry);
    document.addEventListener('visibilitychange', checkDailyExpiry);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDailyExpiry);
      document.removeEventListener('visibilitychange', checkDailyExpiry);
    };
  }, [logout]);

  const login = async (identifier: string, password: string) => {
    const res = await authApi.login(identifier, password);
    if (res.success && res.data) {
      const todayDate = new Date().toISOString().slice(0, 10);
      localStorage.setItem('fic_token', res.data.token);
      localStorage.setItem('fic_login_date', todayDate);
      localStorage.setItem('fic_login_time', String(Date.now()));
      setToken(res.data.token);
      setUser(res.data.user);
    }
  };

  const hasRole = (...roles: string[]) => {
    return !!user && roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated: !!user, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

