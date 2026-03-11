import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { LoginResponse } from '../api/j2ee/types';

interface AuthContextType {
  user: LoginResponse | null;
  login: (userData: LoginResponse, rememberMe?: boolean) => void;
  logout: () => void;
  isAdmin: boolean;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'j2ee_user';
const TOKEN_KEY = 'j2ee_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LoginResponse) : null;
    } catch {
      return null;
    }
  });

  const getToken = (): string | null => {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  };

  const login = (userData: LoginResponse, rememberMe = false) => {
    setUser(userData);
    const token = userData.token || '';
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  };

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;



  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
