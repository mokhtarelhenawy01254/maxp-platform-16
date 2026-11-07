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

  it('attaches one stable cart id across sequential and parallel draft saves', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { cartId: 'server-cart-1' } }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    await storefrontApi.saveCheckoutDraft({ customerName: 'First Draft' });
    await Promise.all([
      storefrontApi.saveCheckoutDraft({ customerName: 'Parallel A' }),
      storefrontApi.saveCheckoutDraft({ customerName: 'Parallel B' }),
    ]);

    const bodies = fetchMock.mock.calls.map(([, init]) =>
      JSON.parse(String((init as RequestInit).body)),
    );
    // أول استدعاء يولّد معرف عميل، والرد يتبناه، والطلبات اللاحقة تعيد استخدام نفس المعرف
    expect(bodies[0].cartId).toMatch(/^cart_/);
    expect(bodies[1].cartId).toBe('server-cart-1');
    expect(bodies[2].cartId).toBe('server-cart-1');
  });

  it('keeps the cart id stable in memory when localStorage writes fail (FB in-app browsers)', async () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded');
      });

    try {
      fetchMock.mockResolvedValue(
        new Response(
          JSON.stringify({ success: true, data: { cartId: 'server-cart-9' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

      await storefrontApi.saveCheckoutDraft({ customerName: 'Broken Storage 1' });
      await storefrontApi.saveCheckoutDraft({ customerName: 'Broken Storage 2' });

      const bodies = fetchMock.mock.calls.map(([, init]) =>
        JSON.parse(String((init as RequestInit).body)),
      );
      expect(bodies[0].cartId).toMatch(/^cart_/);
      expect(bodies[1].cartId).toBe('server-cart-9');
    } finally {
      setItemSpy.mockRestore();
    }
  });
});
