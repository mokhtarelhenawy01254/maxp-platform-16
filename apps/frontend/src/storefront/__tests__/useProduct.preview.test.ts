// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchStorefrontProduct } from '../hooks/useProduct';

const mocks = vi.hoisted(() => ({
  storefrontFetch: vi.fn(),
  tokenManager: {
    getAccessToken: vi.fn(() => 'admin-token'),
  },
}));

vi.mock('../../utils/storefrontApi', () => ({
  getCompanyId: () => 'company123',
  getStorefrontScope: () => 'company123',
  storefrontFetch: mocks.storefrontFetch,
}));

vi.mock('../../config/environment', () => ({
  getApiUrl: () => 'https://api.example.com/api/v1',
}));

vi.mock('../../utils/tokenManager', () => ({
  tokenManager: mocks.tokenManager,
}));

const jsonResponse = (payload: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  );

const productPayload = {
  id: 'prod123',
  slug: 'nova-sneakers',
  name: 'Nova Sneakers',
  description: '',
  price: '1200',
  images: [],
  productVariants: [],
};

describe('fetchStorefrontProduct preview mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    window.history.pushState(
      {},
      '',
      '/store/product/nova-sneakers?companyId=company123&productPreview=1&previewProductId=prod123',
    );
  });

  it('loads admin preview data by previewProductId instead of the route slug', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl);

      expect(url.pathname).toBe('/api/v1/products/prod123');
      return jsonResponse({ success: true, data: productPayload });
    });

    const product = await fetchStorefrontProduct('nova-sneakers', true);

    expect(product.id).toBe('prod123');
    expect(product.price).toBe(1200);
    expect(mocks.storefrontFetch).not.toHaveBeenCalled();
  });

  it('falls back to the public storefront product when admin preview lookup returns 404', async () => {
    globalThis.fetch = vi.fn(() =>
      jsonResponse({ success: false, message: 'Not found' }, 404),
    );
    mocks.storefrontFetch.mockResolvedValue({
      success: true,
      data: {
        ...productPayload,
        id: 'public-prod123',
        price: 1250,
      },
    });

    const product = await fetchStorefrontProduct('nova-sneakers', true);

    expect(product.id).toBe('public-prod123');
    expect(mocks.storefrontFetch).toHaveBeenCalledWith(
      '/products/nova-sneakers?preview=1',
    );
  });
});
