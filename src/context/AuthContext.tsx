import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { LoginResponse } from '../api/j2ee/types';

interface AuthContextType {
  user: LoginResponse | null;
  login: (userData: LoginResponse, rememberMe?: boolean) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'j2ee_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LoginResponse) : null;
    } catch {
      return null;
    }
  });

  const login = (userData: LoginResponse, rememberMe = false) => {
    setUser(userData);
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const isAdmin = user?.roles?.includes('ADMIN') ?? false;



  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
