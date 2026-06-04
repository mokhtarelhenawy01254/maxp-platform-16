// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildCheckoutOrderPayload, useCheckout } from '../hooks/useCheckout';
import { useCartStore } from '../store/useCartStore';
import type { CartItem } from '../store/useCartStore';
import { storefrontApi } from '../../utils/storefrontApi';
import { renderHook, act } from '@testing-library/react';

// Mock the dependencies
vi.mock('../store/useCartStore');
vi.mock('../../utils/storefrontApi', () => ({
  storefrontApi: {
    createOrder: vi.fn(),
  },
  getCompanyId: vi.fn(() => 'test-company-123'),
}));
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useCheckout Hook Logic Audit', () => {
  const mockUseCartStore = vi.mocked(useCartStore);
  const mockCreateOrder = vi.mocked(storefrontApi.createOrder);
  const mockItems: Partial<CartItem>[] = [
    {
      id: '123-variant_red',
      productId: '123',
      variantId: 'variant_red',
      name: 'Test Product',
      price: 100,
      quantity: 2,
      attributes: { color: 'Red' },
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockUseCartStore.mockReturnValue({
      items: mockItems,
      getSubtotal: () => 200,
      clearCart: vi.fn(),
    } as ReturnType<typeof useCartStore>);
  });

  it('should construct a valid order payload and call createOrder', async () => {
    mockCreateOrder.mockResolvedValue({ success: true, data: { id: 'order_123' } });
    
    const { result } = renderHook(() => useCheckout());

    const checkoutData = {
      customerName: 'Test User',
      email: 'test@example.com',
      phone: '0123456789',
      address: '123 Test St',
      city: 'Cairo',
      governorate: 'Cairo',
      paymentMethod: 'cod' as const,
      shippingCost: 60,
      subtotal: 200,
      total: 260,
    };

    await act(async () => {
      await result.current.placeOrder(checkoutData);
    });

    expect(storefrontApi.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      companyId: 'test-company-123',
      guestName: 'Test User',
      guestEmail: 'test@example.com',
      guestPhone: '0123456789',
      shippingAddress: expect.objectContaining({
        address: '123 Test St',
        city: 'Cairo',
        governorate: 'Cairo',
      }),
      subtotal: 200,
      shippingCost: 60,
      total: 260,
      items: expect.arrayContaining([
        expect.objectContaining({ productId: '123', variantId: 'variant_red' })
      ]),
      paymentMethod: 'cod',
    }));
    
    expect(result.current.orderSuccess).toBeDefined();
    expect(result.current.orderSuccess?.purchaseTracking.items[0]?.id).toBe('123-variant_red');
  });

  it('preserves quantity offer metadata inside the checkout payload', () => {
    const payload = buildCheckoutOrderPayload(
      {
        customerName: 'Offer User',
        email: 'offer@example.com',
        phone: '01111111111',
        address: 'Offer St',
        city: 'Cairo',
        governorate: 'Cairo',
        paymentMethod: 'cod',
        shippingCost: 50,
        subtotal: 610,
        total: 660,
      },
      [
        {
          id: 'offer-line-1',
          productId: 'product-1',
          variantId: 'variant-1',
          name: 'Atlas Shoe',
          price: 305,
          basePrice: 400,
          quantity: 1,
          imageUrl: '/atlas.jpg',
          attributes: {
            Color: 'Black',
          },
          quantityOffer: {
            groupId: 'group-1',
            offerId: 'offer-2',
            offerLabel: 'اشتري القطعتين بـ610 بدل 800',
            offerQuantity: 2,
            slotIndex: 1,
            freeShipping: true,
          },
          volumeDiscounts: [],
        } as CartItem,
      ],
      610,
      'test-company-123',
      'pixel-123',
    );

    expect(payload.items[0]).toEqual(
      expect.objectContaining({
        productId: 'product-1',
        variantId: 'variant-1',
        price: 305,
        quantityOffer: expect.objectContaining({
          groupId: 'group-1',
          offerId: 'offer-2',
          offerQuantity: 2,
          freeShipping: true,
        }),
        metadata: expect.objectContaining({
          quantityOffer: expect.objectContaining({
            offerLabel: 'اشتري القطعتين بـ610 بدل 800',
            slotIndex: 1,
          }),
        }),
      }),
    );
  });

  it('attaches stored campaign attribution to the checkout payload', () => {
    sessionStorage.setItem(
      'storefront_order_attribution_v1',
      JSON.stringify({
        source: 'facebook',
        medium: 'paid_social',
        platform: 'facebook',
        campaignName: 'summer-sale',
        campaignId: 'cmp_12001',
        adSetId: 'adset_450',
        adId: 'ad_990',
        landingPath: '/shop?utm_source=facebook',
        capturedAt: '2026-04-20T12:00:00.000Z',
      }),
    );

    const payload = buildCheckoutOrderPayload(
      {
        customerName: 'Attribution User',
        email: 'campaign@example.com',
        phone: '01111111111',
        address: 'Campaign St',
        city: 'Cairo',
        governorate: 'Cairo',
        paymentMethod: 'cod',
        shippingCost: 50,
        subtotal: 610,
        total: 660,
      },
      [
        {
          id: 'offer-line-1',
          productId: 'product-1',
          variantId: 'variant-1',
          name: 'Atlas Shoe',
          price: 305,
          quantity: 1,
          imageUrl: '/atlas.jpg',
          attributes: {
            Color: 'Black',
          },
          volumeDiscounts: [],
        } as CartItem,
      ],
      610,
      'test-company-123',
      'pixel-123',
    );

    expect(payload.attribution).toEqual(
      expect.objectContaining({
        source: 'facebook',
        medium: 'paid_social',
        platform: 'facebook',
        campaignName: 'summer-sale',
        campaignId: 'cmp_12001',
        adSetId: 'adset_450',
        adId: 'ad_990',
      }),
    );
  });
});
