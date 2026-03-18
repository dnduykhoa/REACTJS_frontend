import apiClient from './client';
import type { ApiResponse, SaleProgram, SaleProgramRequest } from './types';

interface UpsertSaleProgramOptions {
  fillAllProductIdsWhenEmpty?: boolean;
  allProductIds?: number[];
}

function buildSaleProgramPayload(
  payload: SaleProgramRequest,
  options?: UpsertSaleProgramOptions
): SaleProgramRequest {
  const next: SaleProgramRequest = { ...payload };

  if (
    options?.fillAllProductIdsWhenEmpty &&
    (!next.productIds || next.productIds.length === 0)
  ) {
    next.productIds = options.allProductIds ?? [];
  }

  return next;
}

export const saleProgramApi = {
  // Public
  getActive: () =>
    apiClient.get<ApiResponse<SaleProgram[]>>('/api/sale-programs/active'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<SaleProgram>>(`/api/sale-programs/${id}`),

  // Admin
  getAll: () =>
    apiClient.get<ApiResponse<SaleProgram[]>>('/api/sale-programs'),

  create: (data: SaleProgramRequest, options?: UpsertSaleProgramOptions) =>
    apiClient.post<ApiResponse<SaleProgram>>(
      '/api/sale-programs',
      buildSaleProgramPayload(data, options)
    ),

  update: (id: number, data: SaleProgramRequest, options?: UpsertSaleProgramOptions) =>
    apiClient.put<ApiResponse<SaleProgram>>(
      `/api/sale-programs/${id}`,
      buildSaleProgramPayload(data, options)
    ),

  toggle: (id: number) =>
    apiClient.patch<ApiResponse<SaleProgram>>(`/api/sale-programs/${id}/toggle`),

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/sale-programs/${id}`),
};
