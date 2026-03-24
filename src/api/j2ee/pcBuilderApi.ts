import apiClient from './client';
import type { ApiResponse } from './types';

export type PcBuilderSlotKey =
  | 'cpu'
  | 'mainboard'
  | 'ram'
  | 'gpu'
  | 'storage'
  | 'psu'
  | 'case'
  | 'cooling';

export type PcBuilderSelection = {
  cpuId: number | null;
  mainboardId: number | null;
  ramId: number | null;
  gpuId: number | null;
  storageId: number | null;
  psuId: number | null;
  caseId: number | null;
  coolingId: number | null;
};

export interface PcBuilderSelectionItem {
  productId: number;
  variantId: number | null;
  quantity: number;
}

export interface PcBuilderSelectionPayload {
  cpu: PcBuilderSelectionItem | null;
  mainboard: PcBuilderSelectionItem | null;
  gpu: PcBuilderSelectionItem | null;
  storage: PcBuilderSelectionItem | null;
  psu: PcBuilderSelectionItem | null;
  case: PcBuilderSelectionItem | null;
  cooling: PcBuilderSelectionItem | null;
  ramSelections: PcBuilderSelectionItem[];
}

export interface PcBuilderOptionsRequest {
  slot: PcBuilderSlotKey;
  selection: PcBuilderSelectionPayload;
}

export interface PcBuilderSlot {
  key: PcBuilderSlotKey;
  label: string;
  productCount: number;
}

export interface PcBuilderOption {
  productId: number;
  name: string;
  price: number;
  stockQuantity: number;
  brandName: string | null;
  categoryName: string | null;
  keySpecs: Record<string, string | number | boolean | null>;
  hasVariants?: boolean;
  defaultVariantId?: number | null;
  availableVariants?: PcBuilderAvailableVariant[];
  compatibility?: PcBuilderOptionCompatibility;
}

export interface PcBuilderAvailableVariant {
  variantId: number | null;
  label: string;
  price: number;
  stockQuantity: number;
  keySpecs: Record<string, string | number | boolean | null>;
}

export type PcBuilderCompatibilityStatus = 'COMPATIBLE' | 'WARNING' | 'INCOMPATIBLE';

export interface PcBuilderOptionCompatibility {
  status: PcBuilderCompatibilityStatus;
  reasons: string[];
}

export interface PcBuilderOptionsData {
  slot: PcBuilderSlotKey;
  estimatedPower: number;
  recommendedPsuWatt: number;
  appliedFilters: Record<string, string>;
  options: PcBuilderOption[];
}

export type PcBuilderWarningSeverity = 'INFO' | 'WARNING' | 'ERROR';

export interface PcBuilderWarning {
  severity: PcBuilderWarningSeverity;
  code: string;
  message: string;
}

export interface PcBuilderSelectedPart {
  slot?: string;
  slotKey?: string;
  productId: number;
  variantId?: number | null;
  quantity?: number;
  unitPrice?: number;
  lineTotal?: number;
  name: string;
  price: number;
  variantLabel?: string | null;
}

export interface PcBuilderSummaryData {
  selectedParts: PcBuilderSelectedPart[];
  totalPrice: number;
  estimatedPower: number;
  recommendedPsuWatt: number;
  compatible: boolean;
  warnings: PcBuilderWarning[];
}

export interface PcBuilderCheckoutItem {
  productId: number;
  variantId: number | null;
  quantity: number;
}

export const pcBuilderApi = {
  getSlots: () =>
    apiClient.get<ApiResponse<PcBuilderSlot[]>>('/api/products/pc-builder/slots'),

  getOptions: (request: PcBuilderOptionsRequest) =>
    apiClient.post<ApiResponse<PcBuilderOptionsData>>('/api/products/pc-builder/options', request),

  getSummary: (selection: PcBuilderSelectionPayload) =>
    apiClient.post<ApiResponse<PcBuilderSummaryData>>('/api/products/pc-builder/summary', { selection }),

  getCheckoutPreview: (selection: PcBuilderSelectionPayload) =>
    apiClient.post<ApiResponse<PcBuilderCheckoutItem[]>>('/api/products/pc-builder/checkout-preview', { selection }),
};