import apiClient from './client';
import type { ApiResponse, Category, CategoryRequest } from './types';

export const categoryApi = {
  getAll: () =>
    apiClient.get<ApiResponse<Category[]>>('/api/categories'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Category>>(`/api/categories/${id}`),

  getRoot: () =>
    apiClient.get<ApiResponse<Category[]>>('/api/categories/root'),

  getChildren: (parentId: number) =>
    apiClient.get<ApiResponse<Category[]>>(`/api/categories/${parentId}/children`),

  getActive: () =>
    apiClient.get<ApiResponse<Category[]>>('/api/categories/active'),

  search: (name: string) =>
    apiClient.get<ApiResponse<Category[]>>('/api/categories/search', { params: { name } }),

  create: (data: CategoryRequest) =>
    apiClient.post<ApiResponse<Category>>('/api/categories/add', data),

  update: (id: number, data: CategoryRequest) =>
    apiClient.put<ApiResponse<Category>>(`/api/categories/update/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/categories/delete/${id}`),
};
