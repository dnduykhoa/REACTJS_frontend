import apiClient from './client';
import type {
  ApiResponse,
  Product,
  ProductMedia,
  ProductSpecification,
  ProductVariant,
  ProductVariantRequest,
} from './types';

// ─── Products ─────────────────────────────────────────────────────────────────
export const productApi = {
  getAll: () =>
    apiClient.get<ApiResponse<Product[]>>('/api/products'),

  getById: (id: number) =>
    apiClient.get<ApiResponse<Product>>(`/api/products/${id}`),

  getActive: () =>
    apiClient.get<ApiResponse<Product[]>>('/api/products/active'),

  search: (name: string) =>
    apiClient.get<ApiResponse<Product[]>>('/api/products/search', { params: { name } }),

  getByCategory: (categoryId: number) =>
    apiClient.get<ApiResponse<Product[]>>(`/api/products/category/${categoryId}`),

  getByCategoryTree: (categoryId: number) =>
    apiClient.get<ApiResponse<Product[]>>(`/api/products/category/${categoryId}/with-children`),

  getByCategories: (ids: number[]) =>
    apiClient.get<ApiResponse<Product[]>>(
      `/api/products/categories?${ids.map((id) => `ids=${id}`).join('&')}`
    ),

  getByBrand: (brandId: number) =>
    apiClient.get<ApiResponse<Product[]>>(`/api/products/brand/${brandId}`),

  getByPriceRange: (min: number, max: number) =>
    apiClient.get<ApiResponse<Product[]>>('/api/products/price-range', { params: { min, max } }),

  filterBySpec: (attrKey: string, minValue: number, maxValue: number) =>
    apiClient.get<ApiResponse<Product[]>>('/api/products/filter/by-spec', {
      params: { attrKey, minValue, maxValue },
    }),

  /** Create product with optional media files */
  create: (params: {
    name: string;
    description?: string;
    price: number;
    stockQuantity: number;
    categoryId?: number;
    brandId?: number;
    isActive?: boolean;
    files?: File[];
  }) => {
    const form = new FormData();
    form.append('name', params.name);
    if (params.description) form.append('description', params.description);
    form.append('price', String(params.price));
    form.append('stockQuantity', String(params.stockQuantity));
    if (params.categoryId != null) form.append('categoryId', String(params.categoryId));
    if (params.brandId != null) form.append('brandId', String(params.brandId));
    if (params.isActive != null) form.append('isActive', String(params.isActive));
    (params.files || []).forEach((f) => form.append('files', f));
    return apiClient.post<ApiResponse<Product>>('/api/products/add', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Update product; optionally add new files / delete existing media by id */
  update: (
    id: number,
    params: {
      name?: string;
      description?: string;
      price?: number;
      stockQuantity?: number;
      categoryId?: number;
      brandId?: number;
      isActive?: boolean;
      replaceMedia?: boolean;
      files?: File[];
      deleteMediaIds?: number[];
    }
  ) => {
    const form = new FormData();
    if (params.name != null) form.append('name', params.name);
    if (params.description != null) form.append('description', params.description);
    if (params.price != null) form.append('price', String(params.price));
    if (params.stockQuantity != null) form.append('stockQuantity', String(params.stockQuantity));
    if (params.categoryId != null) form.append('categoryId', String(params.categoryId));
    if (params.brandId != null) form.append('brandId', String(params.brandId));
    if (params.isActive != null) form.append('isActive', String(params.isActive));
    if (params.replaceMedia != null) form.append('replaceMedia', String(params.replaceMedia));
    (params.files || []).forEach((f) => form.append('files', f));
    (params.deleteMediaIds || []).forEach((mid) => form.append('deleteMediaIds', String(mid)));
    return apiClient.put<ApiResponse<Product>>(`/api/products/update/${id}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  delete: (id: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/products/delete/${id}`),

  toggleActive: (id: number) =>
    apiClient.patch<ApiResponse<Product>>(`/api/products/${id}/toggle-active`),

  outOfStock: (id: number) =>
    apiClient.patch<ApiResponse<Product>>(`/api/products/${id}/out-of-stock`),

  restore: (id: number) =>
    apiClient.patch<ApiResponse<Product>>(`/api/products/${id}/restore`),

  getInactive: () =>
    apiClient.get<ApiResponse<Product[]>>('/api/products/inactive'),

  getOutOfStock: () =>
    apiClient.get<ApiResponse<Product[]>>('/api/products/out-of-stock'),
};

// ─── Product Media ────────────────────────────────────────────────────────────
export const productMediaApi = {
  getByProduct: (productId: number) =>
    apiClient.get<ApiResponse<ProductMedia[]>>(`/api/products/${productId}/media`),

  delete: (productId: number, mediaId: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/products/${productId}/media/${mediaId}`),

  setPrimary: (productId: number, mediaId: number) =>
    apiClient.put<ApiResponse<ProductMedia>>(
      `/api/products/${productId}/media/${mediaId}/set-primary`
    ),
};

// ─── Product Specifications ───────────────────────────────────────────────────
export const productSpecApi = {
  getByProduct: (productId: number) =>
    apiClient.get<ApiResponse<ProductSpecification[]>>(
      `/api/products/${productId}/specifications`
    ),

  getById: (productId: number, id: number) =>
    apiClient.get<ApiResponse<ProductSpecification>>(
      `/api/products/${productId}/specifications/${id}`
    ),

  add: (
    productId: number,
    params: {
      attrDefId?: number;
      specKey?: string;
      specValue?: string;
      valueNumber?: number;
      displayOrder?: number;
    }
  ) =>
    apiClient.post<ApiResponse<ProductSpecification>>(
      `/api/products/${productId}/specifications/add`,
      null,
      { params }
    ),

  update: (
    productId: number,
    id: number,
    params: { specValue?: string; valueNumber?: number; displayOrder?: number }
  ) =>
    apiClient.put<ApiResponse<ProductSpecification>>(
      `/api/products/${productId}/specifications/update/${id}`,
      null,
      { params }
    ),

  delete: (productId: number, id: number) =>
    apiClient.delete<ApiResponse<null>>(
      `/api/products/${productId}/specifications/delete/${id}`
    ),

  clearAll: (productId: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/products/${productId}/specifications/clear`),
};

// ─── Product Variants ────────────────────────────────────────────────────────
export const productVariantApi = {
  getByProduct: (productId: number, onlyActive = false) =>
    apiClient.get<ApiResponse<ProductVariant[]>>(`/api/products/${productId}/variants`, {
      params: { onlyActive },
    }),

  getById: (productId: number, variantId: number) =>
    apiClient.get<ApiResponse<ProductVariant>>(`/api/products/${productId}/variants/${variantId}`),

  create: (productId: number, data: ProductVariantRequest) =>
    apiClient.post<ApiResponse<ProductVariant>>(`/api/products/${productId}/variants/add`, data),

  update: (productId: number, variantId: number, data: ProductVariantRequest) =>
    apiClient.put<ApiResponse<ProductVariant>>(`/api/products/${productId}/variants/update/${variantId}`, data),

  delete: (productId: number, variantId: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/products/${productId}/variants/delete/${variantId}`),

  getOptions: (productId: number) =>
    apiClient.get<ApiResponse<Record<string, string[]>>>(`/api/products/${productId}/variants/options`),

  resolve: (productId: number, selections: Record<string, string>) =>
    apiClient.post<ApiResponse<ProductVariant>>(`/api/products/${productId}/variants/resolve`, {
      selections,
    }),

  getMedia: (productId: number, variantId: number) =>
    apiClient.get<ApiResponse<ProductMedia[]>>(`/api/products/${productId}/variants/${variantId}/media`),

  uploadMedia: (productId: number, variantId: number, files: File[], isPrimary = true) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    form.append('isPrimary', String(isPrimary));
    return apiClient.post<ApiResponse<ProductMedia[]>>(
      `/api/products/${productId}/variants/${variantId}/media/upload`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  deleteMedia: (productId: number, variantId: number, mediaId: number) =>
    apiClient.delete<ApiResponse<null>>(`/api/products/${productId}/variants/${variantId}/media/${mediaId}`),

  setPrimaryMedia: (productId: number, variantId: number, mediaId: number) =>
    apiClient.put<ApiResponse<ProductMedia>>(
      `/api/products/${productId}/variants/${variantId}/media/${mediaId}/set-primary`
    ),
};
