import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { LoginResponse } from '../api/j2ee/types';

interface AuthContextType {
  user: LoginResponse | null;
  login: (userData: LoginResponse, rememberMe?: boolean) => void;
  logout: () => void;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
  canAccessAdmin: boolean;
  canManageUserRoles: boolean;
  canDeleteUsers: boolean;
  hasRole: (roleName: string) => boolean;
  canAssignRole: (roleName: string) => boolean;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'j2ee_user';
const TOKEN_KEY = 'j2ee_token';

const normalizeRole = (role: string) => role.replace(/^ROLE_/, '').toUpperCase();

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

  const roleSet = useMemo(() => {
    return new Set((user?.roles || []).map((role) => normalizeRole(role)));
  }, [user]);

  const hasRole = (roleName: string) => roleSet.has(normalizeRole(roleName));

  const isAdmin = hasRole('ADMIN');
  const isManager = hasRole('MANAGER');
  const isStaff = hasRole('STAFF');
  const canAccessAdmin = isAdmin || isManager || isStaff;
  const canManageUserRoles = isAdmin || isManager;
  const canDeleteUsers = isAdmin || isManager;

  const canAssignRole = (roleName: string) => {
    const normalizedRole = normalizeRole(roleName);
    if (isAdmin) return true;
    if (isManager) return normalizedRole === 'USER' || normalizedRole === 'STAFF';
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAdmin,
        isManager,
        isStaff,
        canAccessAdmin,
        canManageUserRoles,
        canDeleteUsers,
        hasRole,
        canAssignRole,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
