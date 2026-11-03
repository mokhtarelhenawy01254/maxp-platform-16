// @vitest-environment jsdom
/**
 * Shipping Client Portal — API hook (SHIP-W2C)
 */

import { tokenManager } from '../../utils/tokenManager';

const BASE = '/api/v1/shipping-client';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  let token: string | null = null;
  try {
    token = tokenManager.getAccessToken() || localStorage.getItem('token') || localStorage.getItem('accessToken');
  } catch {
    // fallback if outside browser
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'خطأ في الشبكة' }));
    throw new Error(err.message || err.error || 'خطأ غير متوقع');
  }
  return res.json();
}

export const shippingClientApi = {
  getMe: () => apiFetch<{ success: boolean; data: any }>('/me'),
  getSummary: () => apiFetch<{ success: boolean; data: any }>('/summary'),
  getShipments: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ success: boolean; data: any[]; pagination: any }>(`/shipments${qs}`);
  },
  getShipmentById: (id: string) => apiFetch<{ success: boolean; data: any }>(`/shipments/${id}`),
  createShipment: (body: Record<string, unknown>) =>
    apiFetch<{ success: boolean; data: any }>('/shipments', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getRateCard: () => apiFetch<{ success: boolean; data: any[] }>('/rate-card'),
  getPickups: () => apiFetch<{ success: boolean; data: any[] }>('/pickups'),
  createPickup: (body: Record<string, unknown>) =>
    apiFetch<{ success: boolean; data: any }>('/pickups', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
