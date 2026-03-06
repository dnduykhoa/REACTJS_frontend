import apiClient from './client';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
  GoogleLoginRequest,
  UserProfileResponse,
} from './types';

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/api/auth/register', data),

  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/api/auth/login', data),

  loginWithGoogle: (data: GoogleLoginRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/api/auth/google', data),

  checkUsername: (username: string) =>
    apiClient.get<ApiResponse<null>>(`/api/auth/check-username/${encodeURIComponent(username)}`),

  checkEmail: (email: string) =>
    apiClient.get<ApiResponse<null>>(`/api/auth/check-email/${encodeURIComponent(email)}`),

  getProfile: (id: number) =>
    apiClient.get<ApiResponse<UserProfileResponse>>(`/api/auth/profile/${id}`),

  updateProfile: (id: number, data: UpdateProfileRequest) =>
    apiClient.put<ApiResponse<UserProfileResponse>>(`/api/auth/profile/${id}`, data),

  changePassword: (id: number, data: ChangePasswordRequest) =>
    apiClient.put<ApiResponse<null>>(`/api/auth/change-password/${id}`, data),

  // Admin
  getAllUsers: () =>
    apiClient.get<ApiResponse<UserProfileResponse[]>>('/api/auth/users'),

  searchUsers: (keyword: string) =>
    apiClient.get<ApiResponse<UserProfileResponse[]>>('/api/auth/users/search', {
      params: { keyword },
    }),

  deleteUser: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/auth/users/${id}`),

  updateUserRoles: (id: number, roleNames: string[]) =>
    apiClient.put<ApiResponse<UserProfileResponse>>(`/api/auth/users/${id}/roles`, roleNames),
};
