import apiClient from './client';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  TwoFactorResponse,
  Verify2FARequest,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  GoogleLoginRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  RefreshTokenRequest,
  TrustedDeviceResponse,
  UserProfileResponse,
} from './types';

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/api/auth/register', data),

  login: (data: LoginRequest) =>
    apiClient.post<ApiResponse<LoginResponse | TwoFactorResponse>>('/api/auth/login', data),

  verify2FA: (data: Verify2FARequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/api/auth/verify-2fa', data),

  refresh: (data: RefreshTokenRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/api/auth/refresh', data),

  logout: (data?: RefreshTokenRequest) =>
    apiClient.post<ApiResponse<null>>('/api/auth/logout', data || {}),

  loginWithGoogle: (data: GoogleLoginRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/api/auth/google', data),

  checkUsername: (username: string) =>
    apiClient.get<ApiResponse<null>>(`/api/auth/check-username/${encodeURIComponent(username)}`),

  checkEmail: (email: string) =>
    apiClient.get<ApiResponse<null>>(`/api/auth/check-email/${encodeURIComponent(email)}`),

  getProfile: (id: number) =>
    apiClient.get<ApiResponse<UserProfileResponse>>(`/api/users/profile/${id}`),

  updateProfile: (id: number, data: UpdateProfileRequest) =>
    apiClient.put<ApiResponse<UserProfileResponse>>(`/api/users/profile/${id}`, data),

  changePassword: (id: number, data: ChangePasswordRequest) =>
    apiClient.put<ApiResponse<null>>(`/api/auth/change-password/${id}`, data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<ApiResponse<null>>('/api/auth/forgot-password', data),

  resetPassword: (data: ResetPasswordRequest) =>
    apiClient.post<ApiResponse<null>>('/api/auth/reset-password', data),

  toggle2FA: (id: number, enabled: boolean) =>
    apiClient.put<ApiResponse<null>>(`/api/auth/toggle-2fa/${id}`, { enabled }),

  // Admin
  getAllUsers: () =>
    apiClient.get<ApiResponse<UserProfileResponse[]>>('/api/users'),

  searchUsers: (keyword: string) =>
    apiClient.get<ApiResponse<UserProfileResponse[]>>('/api/users/search', {
      params: { keyword },
    }),

  deleteUser: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/users/${id}`),

  updateUserRoles: (id: number, roleNames: string[]) =>
    apiClient.put<ApiResponse<UserProfileResponse>>(`/api/users/${id}/roles`, roleNames),

  getTrustedDevices: () =>
    apiClient.get<ApiResponse<TrustedDeviceResponse[]>>('/api/admin/trusted-devices'),

  revokeTrustedDevice: (sessionId: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/trusted-devices/${sessionId}`),
};
