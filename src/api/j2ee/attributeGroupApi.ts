import apiClient from './client';
import type { ApiResponse, AttributeGroup } from './types';

export const attributeGroupApi = {
  getAll: () =>
    apiClient.get<ApiResponse<AttributeGroup[]>>('/api/attribute-groups'),

  getActive: () =>
    apiClient.get<ApiResponse<AttributeGroup[]>>('/api/attribute-groups/active'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<AttributeGroup>>(`/api/attribute-groups/${id}`),

  create: (data: Partial<AttributeGroup>) =>
    apiClient.post<ApiResponse<AttributeGroup>>('/api/attribute-groups/add', data),

  update: (id: number, data: Partial<AttributeGroup>) =>
    apiClient.put<ApiResponse<AttributeGroup>>(`/api/attribute-groups/update/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/attribute-groups/delete/${id}`),
};
