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

  create: (data: Partial<Brand> & { logoFile?: File | null }) => {
    const form = new FormData();
    form.append('name', data.name || '');
    if (data.description) form.append('description', data.description);
    form.append('displayOrder', String(data.displayOrder ?? 0));
    form.append('isActive', String(data.isActive ?? true));
    if (data.logoFile) form.append('logo', data.logoFile);
    return apiClient.post<ApiResponse<Brand>>('/api/brands/add', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  update: (id: number, data: Partial<Brand> & { logoFile?: File | null }) => {
    const form = new FormData();
    form.append('name', data.name || '');
    if (data.description) form.append('description', data.description);
    form.append('displayOrder', String(data.displayOrder ?? 0));
    form.append('isActive', String(data.isActive ?? true));
    if (data.logoFile) form.append('logo', data.logoFile);
    return apiClient.put<ApiResponse<Brand>>(`/api/brands/update/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/brands/delete/${id}`),
};
