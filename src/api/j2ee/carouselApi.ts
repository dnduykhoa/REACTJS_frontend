import apiClient from './client';
import type { ApiResponse, CarouselSlide, CarouselSlideRequest } from './types';

export const carouselApi = {
  // Public — lấy các slide đang active (cho HomePage)
  getActive: () =>
    apiClient.get<ApiResponse<CarouselSlide[]>>('/api/carousel'),

  // Admin — lấy tất cả slides
  getAll: () =>
    apiClient.get<ApiResponse<CarouselSlide[]>>('/api/carousel/all'),

  // Admin — upload ảnh hoặc video, trả về { url, mediaType }
  uploadMedia: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient.post<ApiResponse<{ url: string; mediaType: string }>>('/api/carousel/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Admin — tạo slide mới
  create: (data: CarouselSlideRequest) =>
    apiClient.post<ApiResponse<CarouselSlide>>('/api/carousel', data),

  // Admin — cập nhật slide
  update: (id: number, data: CarouselSlideRequest) =>
    apiClient.put<ApiResponse<CarouselSlide>>(`/api/carousel/${id}`, data),

  // Admin — xóa slide
  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/carousel/${id}`),
};
