import apiClient from './client';
import type { ApiResponse, UserNotificationResponse } from './types';

export const notificationApi = {
  getMy: () => apiClient.get<ApiResponse<UserNotificationResponse[]>>('/api/notifications/my'),

  getMyUnread: () => apiClient.get<ApiResponse<UserNotificationResponse[]>>('/api/notifications/my/unread'),

  getUnreadCount: () => apiClient.get<ApiResponse<{ count: number }>>('/api/notifications/my/unread-count'),

  markAsRead: (id: number) =>
    apiClient.patch<ApiResponse<UserNotificationResponse>>(`/api/notifications/${id}/read`),

  markAllAsRead: () => apiClient.patch<ApiResponse<null>>('/api/notifications/my/read-all'),
};
