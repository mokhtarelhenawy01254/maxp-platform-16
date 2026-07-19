// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('storefrontApi.saveCheckoutDraft', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let storefrontApi: typeof import('../storefrontApi').storefrontApi;

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/store?companyId=company-test');

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    ({ storefrontApi } = await import('../storefrontApi'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists checkout drafts remotely and remembers the returned cart id', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            cartId: 'cart-draft-123',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    const response = await storefrontApi.saveCheckoutDraft({
      customerName: 'Draft User',
      items: [
        {
          productId: 'prod-1',
          quantity: 1,
          price: 990,
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/public/orders/checkout-draft?companyId=company-test'),
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }),
    );
    expect(response.success).toBe(true);
    expect(JSON.parse(localStorage.getItem('storefront_checkout_draft') || '{}')).toMatchObject({
      customerName: 'Draft User',
    });
    expect(localStorage.getItem('cart_session_id')).toBe('cart-draft-123');
    expect(localStorage.getItem('cart_id')).toBe('cart-draft-123');
  });

  it('keeps a local fallback when the draft request fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    const response = await storefrontApi.saveCheckoutDraft({
      customerName: 'Offline Draft User',
    });

    expect(response).toMatchObject({
      success: false,
      localOnly: true,
    });
    expect(JSON.parse(localStorage.getItem('storefront_checkout_draft') || '{}')).toMatchObject({
      customerName: 'Offline Draft User',
    });
  });
});
