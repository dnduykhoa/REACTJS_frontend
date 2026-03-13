import apiClient from './client';
import type { ApiResponse, OrderRequest, OrderResponse } from './types';

export const orderApi = {
  // POST /api/orders — Tạo đơn hàng (yêu cầu đăng nhập)
  createOrder: (data: OrderRequest) =>
    apiClient.post<ApiResponse<OrderResponse>>('/api/orders', data),

  // GET /api/orders/my — Lấy đơn hàng của user hiện tại
  getMyOrders: () =>
    apiClient.get<ApiResponse<OrderResponse[]>>('/api/orders/my'),

  // GET /api/orders/:id — Lấy chi tiết đơn hàng
  getOrderById: (id: number) =>
    apiClient.get<ApiResponse<OrderResponse>>(`/api/orders/${id}`),

  // POST /api/orders/:id/cancel — Huỷ đơn hàng (có thể kèm lý do)
  cancelOrder: (id: number, cancelReason?: string) =>
    apiClient.post<ApiResponse<OrderResponse>>(`/api/orders/${id}/cancel`, cancelReason ? { cancelReason } : undefined),

  // GET /api/orders — Admin lấy tất cả đơn hàng
  getAllOrders: () =>
    apiClient.get<ApiResponse<OrderResponse[]>>('/api/orders'),

  // PATCH /api/orders/:id/status — Admin cập nhật trạng thái
  updateOrderStatus: (id: number, status: string) =>
    apiClient.patch<ApiResponse<OrderResponse>>(`/api/orders/${id}/status`, { status }),
};
