import apiClient from './client';
import type { ApiResponse, CartResponse, CartItemRequest } from './types';

export const cartApi = {
  getCart: (userId: number) =>
    apiClient.get<ApiResponse<CartResponse>>('/api/cart', { params: { userId } }),

  addItem: (userId: number, data: CartItemRequest) =>
    apiClient.post<ApiResponse<CartResponse>>('/api/cart/items', data, { params: { userId } }),

  updateItem: (userId: number, itemId: number, quantity: number) =>
    apiClient.put<ApiResponse<CartResponse>>(`/api/cart/items/${itemId}`, { quantity }, { params: { userId } }),

  removeItem: (userId: number, itemId: number) =>
    apiClient.delete<ApiResponse<CartResponse>>(`/api/cart/items/${itemId}`, { params: { userId } }),

  clearCart: (userId: number) =>
    apiClient.delete<ApiResponse<null>>('/api/cart', { params: { userId } }),
};

