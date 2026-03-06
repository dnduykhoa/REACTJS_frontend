import apiClient from './client';
import type { ApiResponse, Brand } from './types';

export const brandApi = {
  getAll: () =>
    apiClient.get<ApiResponse<Brand[]>>('/api/brands'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Brand>>(`/api/brands/${id}`),

  getActive: () =>
    apiClient.get<ApiResponse<Brand[]>>('/api/brands/active'),

  search: (name: string) =>
    apiClient.get<ApiResponse<Brand[]>>('/api/brands/search', { params: { name } }),

  create: (data: Partial<Brand>) =>
    apiClient.post<ApiResponse<Brand>>('/api/brands/add', data),

  update: (id: number, data: Partial<Brand>) =>
    apiClient.put<ApiResponse<Brand>>(`/api/brands/update/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/brands/delete/${id}`),
};
