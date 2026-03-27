import axios from 'axios';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'j2ee_token';
const USER_KEY = 'j2ee_user';
const REFRESH_KEY = 'j2ee_refresh_token';
const DEVICE_KEY = 'j2ee_device_id';
const AUTH_EVENT_KEY = 'j2ee_auth_event';

type RetryableConfig = {
  _retry?: boolean;
  headers?: Record<string, string>;
  url?: string;
};

const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

const getRefreshToken = () =>
  localStorage.getItem(REFRESH_KEY) || sessionStorage.getItem(REFRESH_KEY);

const getStorageScope = () =>
  localStorage.getItem(TOKEN_KEY) != null ? localStorage : sessionStorage;

const syncAuthEvent = (type: 'login' | 'refresh' | 'logout') => {
  localStorage.setItem(AUTH_EVENT_KEY, JSON.stringify({ type, ts: Date.now() }));
};

const clearAuth = () => {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_KEY);
  syncAuthEvent('logout');
};

const getOrCreateDeviceId = () => {
  const existing = localStorage.getItem(DEVICE_KEY);
  if (existing) return existing;
  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(DEVICE_KEY, generated);
  return generated;
};

const getDeviceName = () => {
  const userAgent = (typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown device').trim();
  return userAgent.slice(0, 255);
};

const persistTokens = (accessToken: string, refreshToken?: string) => {
  const storage = getStorageScope();
  storage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) {
    storage.setItem(REFRESH_KEY, refreshToken);
  }
  const otherStorage = storage === localStorage ? sessionStorage : localStorage;
  otherStorage.removeItem(TOKEN_KEY);
  otherStorage.removeItem(REFRESH_KEY);

  const userRaw = storage.getItem(USER_KEY);
  if (userRaw) {
    try {
      const parsed = JSON.parse(userRaw) as Record<string, unknown>;
      parsed.token = accessToken;
      if (refreshToken) {
        parsed.refreshToken = refreshToken;
      }
      storage.setItem(USER_KEY, JSON.stringify(parsed));
    } catch {
      // ignore corrupted auth payload
    }
  }
  syncAuthEvent('refresh');
};

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: tự động gắn JWT token vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  config.headers['X-Device-Id'] = getOrCreateDeviceId();
  config.headers['X-Device-Name'] = getDeviceName();
  return config;
});

// Interceptor: khi nhận 401 (token hết hạn / không hợp lệ) → xóa auth và về trang login
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error?.config || {}) as RetryableConfig;
    const requestUrl = String(error?.config?.url || '');
    const shouldIgnore401Logout =
      requestUrl.includes('/api/admin/sales') ||
      requestUrl.includes('/api/admin/vouchers') ||
      requestUrl.includes('/api/admin/reviews') ||
      requestUrl.includes('/api/sale-programs') ||
      requestUrl.includes('/api/vouchers') ||
      requestUrl.includes('/api/reviews');

    const skipRefresh =
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/register') ||
      requestUrl.includes('/api/auth/refresh') ||
      requestUrl.includes('/api/auth/verify-2fa') ||
      requestUrl.includes('/api/auth/google') ||
      requestUrl.includes('/api/auth/forgot-password') ||
      requestUrl.includes('/api/auth/reset-password');

    if (error?.response?.status === 401 && !skipRefresh && !originalRequest._retry) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        originalRequest._retry = true;
        try {
          const refreshResponse = await axios.post(
            `${BASE_URL}/api/auth/refresh`,
            { refreshToken },
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Device-Id': getOrCreateDeviceId(),
                'X-Device-Name': getDeviceName(),
              },
            }
          );

          const payload = refreshResponse?.data?.data || refreshResponse?.data;
          const newAccessToken = payload?.token as string | undefined;
          const newRefreshToken = payload?.refreshToken as string | undefined;

          if (newAccessToken) {
            persistTokens(newAccessToken, newRefreshToken);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return apiClient(originalRequest);
          }
        } catch {
          // fallback to logout handling below
        }
      }
    }

    if (error?.response?.status === 401 && !shouldIgnore401Logout) {
      clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const cartClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor cho cartClient
cartClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  config.headers['X-Device-Id'] = getOrCreateDeviceId();
  config.headers['X-Device-Name'] = getDeviceName();
  return config;
});

export default apiClient;
