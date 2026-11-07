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

  const bootstrapAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('fic_token');
    if (!storedToken) {
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
        setToken(null);
      }
    } catch {
      localStorage.removeItem('fic_token');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrapAuth();
  }, [bootstrapAuth]);

  const login = async (identifier: string, password: string) => {
    const res = await authApi.login(identifier, password);
    if (res.success && res.data) {
      localStorage.setItem('fic_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
    localStorage.removeItem('fic_token');
    setToken(null);
    setUser(null);
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

