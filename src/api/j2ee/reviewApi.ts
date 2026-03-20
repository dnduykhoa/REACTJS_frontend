import apiClient from './client';
import type { ApiResponse, ReviewResponse, ReviewSummary } from './types';

export const reviewApi = {
  // POST /api/reviews — Gửi đánh giá (multipart/form-data, hỗ trợ upload ảnh)
  submitReview: (params: {
    orderItemId: number;
    rating: number;
    comment?: string;
    images?: File[];
  }) => {
    const formData = new FormData();
    formData.append('orderItemId', String(params.orderItemId));
    formData.append('rating', String(params.rating));
    if (params.comment) formData.append('comment', params.comment);
    if (params.images) {
      params.images.forEach((file) => formData.append('images', file));
    }
    return apiClient.post<ApiResponse<ReviewResponse>>('/api/reviews', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // PUT /api/reviews/:id — Sửa đánh giá đã gửi (multipart/form-data, hỗ trợ upload ảnh mới)
  updateReview: (
    reviewId: number,
    params: {
      rating: number;
      comment?: string;
      images?: File[];
      keepImageUrls?: string[];
    }
  ) => {
    const formData = new FormData();
    formData.append('rating', String(params.rating));
    if (params.comment !== undefined) formData.append('comment', params.comment);
    if (params.images) {
      params.images.forEach((file) => formData.append('images', file));
    }
    if (params.keepImageUrls) {
      params.keepImageUrls.forEach((url) => formData.append('keepImageUrls', url));
    }
    return apiClient.put<ApiResponse<ReviewResponse>>(`/api/reviews/${reviewId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // GET /api/products/:productId/reviews — Lấy danh sách đánh giá của sản phẩm (có thể lọc theo biến thể)
  getProductReviews: (productId: number, variantId?: number) =>
    apiClient.get<ApiResponse<ReviewResponse[]>>(`/api/products/${productId}/reviews`, {
      params: variantId != null ? { variantId } : undefined,
    }),

  // GET /api/reviews/order-item/:orderItemId — Lấy đánh giá của user cho một order item cụ thể
  getReviewByOrderItem: (orderItemId: number) =>
    apiClient.get<ApiResponse<ReviewResponse>>(`/api/reviews/order-item/${orderItemId}`),

  // GET /api/products/:productId/reviews/summary — Lấy điểm trung bình (có thể lọc theo biến thể)
  getReviewSummary: (productId: number, variantId?: number) =>
    apiClient.get<ApiResponse<ReviewSummary>>(`/api/products/${productId}/reviews/summary`, {
      params: variantId != null ? { variantId } : undefined,
    }),

  // [ADMIN] GET /api/admin/reviews — Lấy tất cả đánh giá, lọc theo keyword/rating
  adminGetAllReviews: (params?: { keyword?: string; rating?: number }) =>
    apiClient.get<ApiResponse<ReviewResponse[]>>('/api/admin/reviews', { params }),

  // [ADMIN] DELETE /api/admin/reviews/:id — Xóa một đánh giá
  adminDeleteReview: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/admin/reviews/${id}`),

  // [ADMIN] PATCH /api/admin/reviews/:id/toggle-hidden — Ẩn / hiện đánh giá
  adminToggleHidden: (id: number) =>
    apiClient.patch<ApiResponse<ReviewResponse>>(`/api/admin/reviews/${id}/toggle-hidden`),

  // [ADMIN] POST /api/admin/reviews/:id/reply — Trả lời đánh giá (reply rỗng = xóa phản hồi)
  adminReplyReview: (id: number, reply: string) =>
    apiClient.post<ApiResponse<ReviewResponse>>(`/api/admin/reviews/${id}/reply`, { reply }),
};
