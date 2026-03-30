import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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
const REFRESH_KEY = 'j2ee_refresh_token';
const AUTH_EVENT_KEY = 'j2ee_auth_event';
const PAYMENT_BACKUP_KEY = 'j2ee_payment_backup';

/**
 * Gọi trước khi redirect sang cổng thanh toán (VNPay/MoMo).
 * Backup sessionStorage auth vào localStorage tạm để tránh mất session
 * khi browser navigate qua domain ngoài rồi quay về.
 */
export function backupAuthForPaymentRedirect() {
  const user = sessionStorage.getItem(STORAGE_KEY);
  const token = sessionStorage.getItem(TOKEN_KEY);
  const refresh = sessionStorage.getItem(REFRESH_KEY);
  if (token && user) {
    localStorage.setItem(PAYMENT_BACKUP_KEY, JSON.stringify({
      user,
      token,
      refresh,
      expires: Date.now() + 30 * 60 * 1000, // hết hạn sau 30 phút
    }));
  }
}

const normalizeRole = (role: string) => role.replace(/^ROLE_/, '').toUpperCase();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse | null>(() => {
    try {
      // Khôi phục session bị mất sau khi redirect từ cổng thanh toán (VNPay/MoMo)
      const backupRaw = localStorage.getItem(PAYMENT_BACKUP_KEY);
      if (backupRaw) {
        const backup = JSON.parse(backupRaw) as { user: string; token: string; refresh: string; expires: number };
        if (backup.expires > Date.now() && backup.token) {
          // Restore về sessionStorage (đúng với trạng thái "không nhớ đăng nhập")
          sessionStorage.setItem(STORAGE_KEY, backup.user);
          sessionStorage.setItem(TOKEN_KEY, backup.token);
          sessionStorage.setItem(REFRESH_KEY, backup.refresh || '');
          // Xóa localStorage backup và các key chính (không nên lưu lâu dài)
          localStorage.removeItem(PAYMENT_BACKUP_KEY);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_KEY);
          return JSON.parse(backup.user) as LoginResponse;
        }
        localStorage.removeItem(PAYMENT_BACKUP_KEY);
      }
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
    const refreshToken = userData.refreshToken || '';
    if (rememberMe) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(REFRESH_KEY, refreshToken);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      sessionStorage.setItem(TOKEN_KEY, token);
      sessionStorage.setItem(REFRESH_KEY, refreshToken);
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
    localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ type: 'login', ts: Date.now() }));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_KEY);
    localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ type: 'logout', ts: Date.now() }));
  };

  useEffect(() => {
    const syncAuthState = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
        setUser(raw ? (JSON.parse(raw) as LoginResponse) : null);
      } catch {
        setUser(null);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key) return;
      if (
        event.key === STORAGE_KEY ||
        event.key === TOKEN_KEY ||
        event.key === REFRESH_KEY ||
        event.key === AUTH_EVENT_KEY
      ) {
        syncAuthState();
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
