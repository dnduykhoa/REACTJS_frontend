import apiClient from './client';
import type { ApiResponse, CategoryAttribute } from './types';

export const categoryAttributeApi = {
  getByCategory: (categoryId: number) =>
    apiClient.get<ApiResponse<CategoryAttribute[]>>(`/api/category-attributes/by-category/${categoryId}`),

  assign: (categoryId: number, attrDefId: number, isRequired = false, displayOrder = 0) =>
    apiClient.post<ApiResponse<CategoryAttribute>>('/api/category-attributes/assign', null, {
      params: { categoryId, attrDefId, isRequired, displayOrder },
    }),

  update: (id: number, isRequired: boolean, displayOrder: number) =>
    apiClient.put<ApiResponse<CategoryAttribute>>(`/api/category-attributes/update/${id}`, null, {
      params: { isRequired, displayOrder },
    }),

  removeById: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/category-attributes/remove/${id}`),

  removeByCategoryAndDef: (categoryId: number, attrDefId: number) =>
    apiClient.delete<ApiResponse<null>>('/api/category-attributes/remove', {
      params: { categoryId, attrDefId },
    }),
};
