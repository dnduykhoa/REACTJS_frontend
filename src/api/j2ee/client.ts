import axios from 'axios';

const BASE_URL = import.meta.env.VITE_J2EE_API_URL || 'http://localhost:8080';
const TOKEN_KEY = 'j2ee_token';

const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

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
  return config;
});

// Interceptor: khi nhận 401 (token hết hạn / không hợp lệ) → xóa auth và về trang login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('j2ee_user');
      localStorage.removeItem('j2ee_token');
      sessionStorage.removeItem('j2ee_user');
      sessionStorage.removeItem('j2ee_token');
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
  return config;
});

export default apiClient;
