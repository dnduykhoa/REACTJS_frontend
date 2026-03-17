import apiClient from './client';
import type {
  ApiResponse,
  PreorderRegistrationRequest,
  PreorderRequestResponse,
} from './types';

export const preorderApi = {
  create: (data: PreorderRegistrationRequest) =>
    apiClient.post<ApiResponse<PreorderRequestResponse>>('/api/preorders', data),

  getAllAdmin: () =>
    apiClient.get<ApiResponse<PreorderRequestResponse[]>>('/api/admin/preorders'),
};