import type { ApiResponse } from './types';

export function unwrapApiData<T>(payload: T | ApiResponse<T>): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    message?: string;
    response?: { status?: number; data?: { message?: string } };
  };

  const status = err?.response?.status;
  const message = err?.response?.data?.message?.trim();

  if ((status === 400 || status === 403 || status === 404) && message) {
    return message;
  }

  if (message) {
    return message;
  }

  if (err?.message) {
    return err.message;
  }

  return fallback;
}
