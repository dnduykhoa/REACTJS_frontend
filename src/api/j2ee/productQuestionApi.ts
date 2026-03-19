import apiClient from './client';
import type {
  ApiResponse,
  ProductQuestionAnswerRequest,
  ProductQuestionCreateRequest,
  ProductQuestionResponse,
} from './types';

export const productQuestionApi = {
  getByProduct: (productId: number) =>
    apiClient.get<ApiResponse<ProductQuestionResponse[]>>(`/api/products/${productId}/questions`),

  create: (productId: number, data: ProductQuestionCreateRequest) =>
    apiClient.post<ApiResponse<ProductQuestionResponse>>(`/api/products/${productId}/questions`, data),

  getAllForAdmin: (answered?: boolean) => {
    const params = answered == null ? {} : { answered };
    return apiClient.get<ApiResponse<ProductQuestionResponse[]>>('/api/admin/product-questions', { params });
  },

  answer: (questionId: number, data: ProductQuestionAnswerRequest) =>
    apiClient.patch<ApiResponse<ProductQuestionResponse>>(`/api/admin/product-questions/${questionId}/answer`, data),
};
