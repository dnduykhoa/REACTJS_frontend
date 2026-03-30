import apiClient from './client';
import type { ApiResponse, CategoryAttribute, CategoryAttributeSchema } from './types';

export const categoryAttributeApi = {
  getByCategory: (categoryId: number) =>
    apiClient.get<ApiResponse<CategoryAttribute[]>>(`/api/category-attributes/by-category/${categoryId}`),

  getSchema: (categoryId: number) =>
    apiClient.get<ApiResponse<CategoryAttributeSchema>>(`/api/category-attributes/schema/${categoryId}`),

  assign: (
    categoryId: number,
    attrDefId: number,
    isRequired = false,
    displayOrder = 0,
    groupId?: number,
  ) =>
    apiClient.post<ApiResponse<CategoryAttribute>>('/api/category-attributes/assign', null, {
      params: { categoryId, attrDefId, isRequired, displayOrder, groupId },
    }),

  update: (
    id: number,
    payload: {
      isRequired?: boolean;
      displayOrder?: number;
      groupId?: number;
    },
  ) =>
    apiClient.put<ApiResponse<CategoryAttribute>>(`/api/category-attributes/update/${id}`, null, {
      params: payload,
    }),

  removeById: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/category-attributes/remove/${id}`),

  removeByCategoryAndDef: (categoryId: number, attrDefId: number) =>
    apiClient.delete<ApiResponse<null>>('/api/category-attributes/remove', {
      params: { categoryId, attrDefId },
    }),
};
