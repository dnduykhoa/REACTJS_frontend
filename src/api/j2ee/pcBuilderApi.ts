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
  name: string;
  price: number;
}

export interface PcBuilderSummaryData {
  selectedParts: PcBuilderSelectedPart[];
  totalPrice: number;
  estimatedPower: number;
  recommendedPsuWatt: number;
  compatible: boolean;
  warnings: PcBuilderWarning[];
}

const toParams = (selection: PcBuilderSelection) => {
  const params = new URLSearchParams();

  (Object.entries(selection) as Array<[keyof PcBuilderSelection, number | null]>).forEach(([key, value]) => {
    if (value != null) {
      params.set(key, String(value));
    }
  });

  return params;
};

export const pcBuilderApi = {
  getSlots: () =>
    apiClient.get<ApiResponse<PcBuilderSlot[]>>('/api/products/pc-builder/slots'),

  getOptions: (slot: PcBuilderSlotKey, selection: PcBuilderSelection) => {
    const params = toParams(selection);
    params.set('slot', slot);

    return apiClient.get<ApiResponse<PcBuilderOptionsData>>(
      `/api/products/pc-builder/options?${params.toString()}`
    );
  },

  getSummary: (selection: PcBuilderSelection) => {
    const params = toParams(selection);
    const suffix = params.toString();
    const url = suffix
      ? `/api/products/pc-builder/summary?${suffix}`
      : '/api/products/pc-builder/summary';
    return apiClient.get<ApiResponse<PcBuilderSummaryData>>(url);
  },
};