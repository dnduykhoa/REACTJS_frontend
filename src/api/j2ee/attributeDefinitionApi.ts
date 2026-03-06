import apiClient from './client';
import type { ApiResponse, AttributeDefinition, AttributeDefinitionRequest } from './types';

export const attributeDefinitionApi = {
  getAll: () =>
    apiClient.get<ApiResponse<AttributeDefinition[]>>('/api/attribute-definitions'),

  getActive: () =>
    apiClient.get<ApiResponse<AttributeDefinition[]>>('/api/attribute-definitions/active'),

  getFilterable: () =>
    apiClient.get<ApiResponse<AttributeDefinition[]>>('/api/attribute-definitions/filterable'),

  getByGroup: (groupId: number) =>
    apiClient.get<ApiResponse<AttributeDefinition[]>>(`/api/attribute-definitions/by-group/${groupId}`),

  getById: (id: number) =>
    apiClient.get<ApiResponse<AttributeDefinition>>(`/api/attribute-definitions/${id}`),

  getByKey: (attrKey: string) =>
    apiClient.get<ApiResponse<AttributeDefinition>>(`/api/attribute-definitions/key/${attrKey}`),

  create: (data: AttributeDefinitionRequest) =>
    apiClient.post<ApiResponse<AttributeDefinition>>('/api/attribute-definitions/add', data),

  update: (id: number, data: AttributeDefinitionRequest) =>
    apiClient.put<ApiResponse<AttributeDefinition>>(`/api/attribute-definitions/update/${id}`, data),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/attribute-definitions/delete/${id}`),
};
