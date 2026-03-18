import apiClient from './client';
import type {
  ApiResponse,
  Voucher,
  VoucherRequest,
  VoucherValidateRequest,
  VoucherValidateResponse,
} from './types';

export const voucherApi = {
  // Public
  getActive: () =>
    apiClient.get<ApiResponse<Voucher[]>>('/api/vouchers/active'),

  // Authenticated
  validate: async (data: VoucherValidateRequest) => {
    const code = (data.code || '').trim().toUpperCase();
    const amount = data.orderAmount;

    const bodyPayload = {
      code,
      voucherCode: code,
      orderAmount: amount,
      totalAmount: amount,
    };

    try {
      return await apiClient.post<ApiResponse<VoucherValidateResponse>>('/api/vouchers/validate', bodyPayload);
    } catch (firstError) {
      try {
        return await apiClient.post<ApiResponse<VoucherValidateResponse>>('/api/vouchers/validate', null, {
          params: {
            code,
            voucherCode: code,
            orderAmount: amount,
            totalAmount: amount,
          },
        });
      } catch {
        throw firstError;
      }
    }
  },

  // Admin
  getAll: () =>
    apiClient.get<ApiResponse<Voucher[]>>('/api/vouchers'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Voucher>>(`/api/vouchers/${id}`),

  create: (data: VoucherRequest) =>
    apiClient.post<ApiResponse<Voucher>>('/api/vouchers', data),

  update: async (id: number, data: VoucherRequest) => {
    const routes = [`/api/vouchers/${id}`, `/api/vouchers/update/${id}`];

    let firstError: unknown;

    for (const route of routes) {
      try {
        return await apiClient.put<ApiResponse<Voucher>>(route, data);
      } catch (error) {
        if (!firstError) firstError = error;
      }
    }

    throw firstError;
  },

  toggle: (id: number) =>
    apiClient.patch<ApiResponse<Voucher>>(`/api/vouchers/${id}/toggle`),

  delete: async (id: number) => {
    const routes = [
      `/api/vouchers/${id}`,
      `/api/vouchers/delete/${id}`,
    ];

    let firstError: unknown;

    for (const route of routes) {
      try {
        return await apiClient.delete<ApiResponse<null>>(route);
      } catch (error) {
        if (!firstError) firstError = error;
      }
    }

    throw firstError;
  },
};
