/**
 * API Helpers
 * 
 * مساعدين للتعامل مع API باستخدام إعدادات البيئة المركزية
 */

import { config } from '../config';
import { authService } from '../services/authService';

/**
 * إنشاء URL كامل للـ API endpoint
 */
export const createApiUrl = (endpoint: string): string => {
  // إزالة slash في البداية إذا وجد
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${config.apiUrl}/${cleanEndpoint}`;
};

/**
 * إنشاء URL كامل للـ API endpoint (alias for createApiUrl)
 */
export const buildApiUrl = (endpoint: string): string => {
  return createApiUrl(endpoint);
};

/**
 * إنشاء headers افتراضية للطلبات
 */
export const createHeaders = (additionalHeaders: Record<string, string> = {}): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...additionalHeaders
  };

  // إضافة توكن المصادقة إذا وجد
  const token = authService.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};

/**
 * دالة fetch محسنة تستخدم إعدادات البيئة
 */
export const apiFetch = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> => {
  const url = createApiUrl(endpoint);
  const headers = createHeaders(options.headers as Record<string, string>);

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include'
  });
};

/**
 * دالة مساعدة لرفع الملفات
 */
export const uploadFiles = async (
  files: File[],
  endpoint: string = 'upload/multiple'
): Promise<any> => {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const url = createApiUrl(endpoint);
  const token = authService.getAccessToken();

  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success === false) {
    const message =
      result?.message ||
      result?.error ||
      `Upload failed with status ${response.status}`;
    throw new Error(message);
  }

  return result;
};

/**
 * دالة مساعدة لحذف ملف
 */
export const deleteFile = async (fileReference: string): Promise<any> => {
  const sanitizedReference = (fileReference || "").split("?")[0]?.split("#")[0] || "";
  const segments = sanitizedReference.split("/").filter(Boolean);
  const filename = segments[segments.length - 1];

  if (!filename) {
    throw new Error("Invalid file reference");
  }

  const response = await apiFetch(`upload/file/${encodeURIComponent(filename)}`, {
    method: 'DELETE'
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success === false) {
    const message =
      result?.message ||
      result?.error ||
      `Delete failed with status ${response.status}`;
    throw new Error(message);
  }

  return result;
};

/**
 * دوال مساعدة للمنتجات
 */
export const productApi = {
  // جلب جميع المنتجات
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiFetch(`products${queryString}`);
  },

  // جلب منتج واحد
  getById: (id: string) => {
    return apiFetch(`products/${id}`);
  },

  // إنشاء منتج جديد
  create: (data: any) => {
    return apiFetch('products', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // تحديث منتج
  update: (id: string, data: any) => {
    return apiFetch(`products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  },

  // حذف منتج
  delete: (id: string) => {
    return apiFetch(`products/${id}`, {
      method: 'DELETE'
    });
  },

  // إدارة صور المنتج
  addImageFromUrl: (productId: string, imageUrl: string) => {
    return apiFetch(`products/${productId}/images/url`, {
      method: 'POST',
      body: JSON.stringify({ imageUrl })
    });
  },

  removeImage: (productId: string, imageUrl: string) => {
    return apiFetch(`products/${productId}/images`, {
      method: 'DELETE',
      body: JSON.stringify({ imageUrl })
    });
  },

  // إدارة المتغيرات (variants)
  getVariants: (productId: string) => {
    return apiFetch(`products/${productId}/variants`);
  },

  createVariant: async (productId: string, data: any) => {
    console.log('📤 [API] Creating variant for product:', productId);
    console.log('📤 [API] Variant data:', data);

    const response = await apiFetch(`products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ [API] Variant creation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  },

  updateVariant: (variantId: string, data: any) => {
    return apiFetch(`products/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteVariant: (variantId: string) => {
    return apiFetch(`products/variants/${variantId}`, {
      method: 'DELETE'
    });
  }
};

/**
 * دوال مساعدة للفئات
 */
export const categoryApi = {
  getAll: () => apiFetch('products/categories'),
  create: (data: any) => apiFetch('products/categories', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id: string, data: any) => apiFetch(`products/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id: string) => apiFetch(`products/categories/${id}`, {
    method: 'DELETE'
  })
};

/**
 * دوال مساعدة للطلبات
 */
export const orderApi = {
  getAll: () => apiFetch('orders-new/simple'),
  getStats: () => apiFetch('orders-new/simple/stats'),
  getById: (id: string) => apiFetch(`orders-enhanced/${id}`),
  updateStatus: (id: string, status: string) => apiFetch(`orders-enhanced/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  })
};

export default {
  createApiUrl,
  buildApiUrl,
  createHeaders,
  apiFetch,
  uploadFiles,
  deleteFile,
  productApi,
  categoryApi,
  orderApi
};
