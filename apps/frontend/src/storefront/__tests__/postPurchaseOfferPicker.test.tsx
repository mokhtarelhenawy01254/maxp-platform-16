// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostPurchaseOfferPage from '../pages/PostPurchaseOfferPage';
import { storefrontApi } from '../../utils/storefrontApi';
import { toast } from 'sonner';

afterEach(() => {
  cleanup();
});

// Mock dependencies
vi.mock('../../utils/storefrontApi', () => ({
  storefrontApi: {
    getPostPurchaseOffer: vi.fn(),
    acceptPostPurchaseOffer: vi.fn(),
  },
}));

const mockSettings = {
  storefront: { settings: { currency: 'EGP' } },
  company: { currency: 'EGP' },
};

const mockTheme = { direction: 'rtl', id: 'khemet-luxe-eg' };

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => ({
    settings: mockSettings,
  }),
}));

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: mockTheme,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const mockSwanOffer = {
  enabled: true,
  title: 'استني! خصم خاص على قطعة تانية قبل ما شحنتك تطلع 🚚',
  subtitle: 'ضيفي Swan Aura لطلبك بـ399 بس بدل 850 — وهتتشحن معاك في نفس الطرد',
  badgeText: 'عرض لمرة واحدة لطلبك فقط',
  productId: 'prod-swan-aura',
  productName: 'Swan Aura',
  productImage: '/uploads/products/swan-aura.jpeg',
  offerPrice: 399,
  originalPrice: 850,
  freeShipping: true,
  timerMinutes: 5,
  description: 'خامة مريحة طول اليوم ومقاساتها مظبوطة',
  features: ['تيجي في نفس شحنتك — بدون شحن إضافي'],
  acceptButtonText: 'أيوه! ضيفي Swan Aura بـ399 لطلبي',
  declineButtonText: 'لا شكراً، كمّلي طلبي زي ما هو',
  triggerCondition: 'all' as const,
  product: {
    id: 'prod-swan-aura',
    name: 'Swan Aura',
    price: 549,
    comparePrice: 850,
    imageUrl: '/uploads/products/swan-aura.jpeg',
    variants: [
      { id: 'v-black-37', name: 'أبيض × أسود - 37', price: 549, comparePrice: 850, stock: 10, options: {} },
      { id: 'v-black-38', name: 'أبيض × أسود - 38', price: 549, comparePrice: 850, stock: 15, options: {} },
      { id: 'v-black-39', name: 'أبيض × أسود - 39', price: 549, comparePrice: 850, stock: 20, options: {} },
      { id: 'v-black-40', name: 'أبيض × أسود - 40', price: 549, comparePrice: 850, stock: 0, options: {} }, // OUT OF STOCK
      { id: 'v-black-41', name: 'أبيض × أسود - 41', price: 549, comparePrice: 850, stock: 5, options: {} },
      { id: 'v-wine-37', name: 'أبيض × نبيتي - 37', price: 549, comparePrice: 850, stock: 12, options: {} },
      { id: 'v-wine-38', name: 'أبيض × نبيتي - 38', price: 549, comparePrice: 850, stock: 18, options: {} },
      { id: 'v-wine-39', name: 'أبيض × نبيتي - 39', price: 549, comparePrice: 850, stock: 22, options: {} },
      { id: 'v-wine-40', name: 'أبيض × نبيتي - 40', price: 549, comparePrice: 850, stock: 7, options: {} },
      { id: 'v-wine-41', name: 'أبيض × نبيتي - 41', price: 549, comparePrice: 850, stock: 0, options: {} }, // OUT OF STOCK in wine
    ],
  },
};

describe('PostPurchaseOfferPage - Grouped Variant Picker (Color -> Size)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (storefrontApi.getPostPurchaseOffer as any).mockResolvedValue({
      data: mockSwanOffer,
    });
  });

  it('renders the offer with NO default variant selected initially', async () => {
    render(
      <MemoryRouter initialEntries={['/order-offer?orderId=ORD-123']}>
        <PostPurchaseOfferPage />
      </MemoryRouter>
    );

    await screen.findByText('Swan Aura');

    // Color and size labels must be present (feminine)
    expect(screen.getByText('اختاري اللون')).toBeInTheDocument();
    expect(screen.getByText('اختاري المقاس')).toBeInTheDocument();

    // The two unique colors should be displayed
    expect(screen.getByText('أبيض × أسود')).toBeInTheDocument();
    expect(screen.getByText('أبيض × نبيتي')).toBeInTheDocument();

    // The 5 sizes should be displayed
    expect(screen.getByText('37')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
    expect(screen.getByText('39')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('41')).toBeInTheDocument();

    // Check that neither color nor size is pre-selected
    const blackBtn = screen.getByText('أبيض × أسود').closest('button');
    const wineBtn = screen.getByText('أبيض × نبيتي').closest('button');
    expect(blackBtn?.className).not.toContain('bg-emerald-500/10');
    expect(wineBtn?.className).not.toContain('bg-emerald-500/10');
  });

  it('blocks CTA if no color or size is selected and shows toast with ZERO API calls', async () => {
    render(
      <MemoryRouter initialEntries={['/order-offer?orderId=ORD-123']}>
        <PostPurchaseOfferPage />
      </MemoryRouter>
    );

    await screen.findByText('Swan Aura');

    const ctaBtn = screen.getByText('أيوه! ضيفي Swan Aura بـ399 لطلبي').closest('button');
    expect(ctaBtn).not.toBeNull();

    fireEvent.click(ctaBtn!);

    // Should show error toast
    expect(toast.error).toHaveBeenCalledWith('اختاري اللون والمقاس الأول 🙏');

    // ZERO calls to accept API
    expect(storefrontApi.acceptPostPurchaseOffer).not.toHaveBeenCalled();
  });

  it('allows selecting color then size, resolves matching variant, and passes correct variantId to accept API', async () => {
    (storefrontApi.acceptPostPurchaseOffer as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter initialEntries={['/order-offer?orderId=ORD-123']}>
        <PostPurchaseOfferPage />
      </MemoryRouter>
    );

    await screen.findByText('Swan Aura');

    // 1. Select Color "أبيض × أسود"
    const blackBtn = screen.getByText('أبيض × أسود').closest('button');
    fireEvent.click(blackBtn!);

    // 2. Select Size "39"
    const size39Btn = screen.getByText('39').closest('button');
    fireEvent.click(size39Btn!);

    // 3. Click CTA
    const ctaBtn = screen.getByText('أيوه! ضيفي Swan Aura بـ399 لطلبي').closest('button');
    fireEvent.click(ctaBtn!);

    // Should call API with variantId 'v-black-39'
    expect(storefrontApi.acceptPostPurchaseOffer).toHaveBeenCalledTimes(1);
    expect(storefrontApi.acceptPostPurchaseOffer).toHaveBeenCalledWith(
      'ORD-123',
      expect.objectContaining({
        variantId: 'v-black-39',
        price: 399,
        quantity: 1,
      })
    );
  });

  it('disables out-of-stock sizes when color is selected', async () => {
    render(
      <MemoryRouter initialEntries={['/order-offer?orderId=ORD-123']}>
        <PostPurchaseOfferPage />
      </MemoryRouter>
    );

    await screen.findByText('Swan Aura');

    // In mockSwanOffer: size 40 is stock 0 for 'أبيض × أسود'
    const blackBtn = screen.getByText('أبيض × أسود').closest('button');
    fireEvent.click(blackBtn!);

    const size40Btn = screen.getByText('40').closest('button');
    expect(size40Btn?.hasAttribute('disabled')).toBe(true);
    expect(size40Btn?.className).toContain('line-through');

    // Size 39 should be enabled
    const size39Btn = screen.getByText('39').closest('button');
    expect(size39Btn?.hasAttribute('disabled')).toBe(false);
  });

  it('switching color maintains selected size if available in new color', async () => {
    (storefrontApi.acceptPostPurchaseOffer as any).mockResolvedValue({ success: true });

    render(
      <MemoryRouter initialEntries={['/order-offer?orderId=ORD-123']}>
        <PostPurchaseOfferPage />
      </MemoryRouter>
    );

    await screen.findByText('Swan Aura');

    // Select color 'أبيض × أسود' and size '38'
    fireEvent.click(screen.getByText('أبيض × أسود').closest('button')!);
    fireEvent.click(screen.getByText('38').closest('button')!);

    // Now switch color to 'أبيض × نبيتي' (where 38 has stock 18)
    fireEvent.click(screen.getByText('أبيض × نبيتي').closest('button')!);

    // Click CTA -> variantId should now be 'v-wine-38'
    const ctaBtn = screen.getByText('أيوه! ضيفي Swan Aura بـ399 لطلبي').closest('button');
    fireEvent.click(ctaBtn!);

    expect(storefrontApi.acceptPostPurchaseOffer).toHaveBeenCalledWith(
      'ORD-123',
      expect.objectContaining({
        variantId: 'v-wine-38',
      })
    );
  });

  it('switching color clears size if that size is out-of-stock in the new color', async () => {
    render(
      <MemoryRouter initialEntries={['/order-offer?orderId=ORD-123']}>
        <PostPurchaseOfferPage />
      </MemoryRouter>
    );

    await screen.findByText('Swan Aura');

    // Size 41 is in stock in 'أبيض × أسود' (stock 5) but stock 0 in 'أبيض × نبيتي'
    fireEvent.click(screen.getByText('أبيض × أسود').closest('button')!);
    fireEvent.click(screen.getByText('41').closest('button')!);

    // Switch to 'أبيض × نبيتي'
    fireEvent.click(screen.getByText('أبيض × نبيتي').closest('button')!);

    // Click CTA -> should fail because size 41 was cleared (out of stock in wine)
    const ctaBtn = screen.getByText('أيوه! ضيفي Swan Aura بـ399 لطلبي').closest('button');
    fireEvent.click(ctaBtn!);

    expect(toast.error).toHaveBeenCalledWith('اختاري اللون والمقاس الأول 🙏');
    expect(storefrontApi.acceptPostPurchaseOffer).not.toHaveBeenCalled();
  });

  it('gracefully falls back to flat chips if any variant cannot be parsed into color and size', async () => {
    const unparseableOffer = {
      ...mockSwanOffer,
      product: {
        ...mockSwanOffer.product,
        variants: [
          { id: 'v1', name: 'Standard Edition', price: 399, stock: 5 },
          { id: 'v2', name: 'Deluxe Edition', price: 499, stock: 5 },
        ],
      },
    };

    (storefrontApi.getPostPurchaseOffer as any).mockResolvedValue({
      data: unparseableOffer,
    });

    render(
      <MemoryRouter initialEntries={['/order-offer?orderId=ORD-123']}>
        <PostPurchaseOfferPage />
      </MemoryRouter>
    );

    await screen.findByText('اختاري الخيار المناسب:');

    expect(screen.getByText('Standard Edition')).toBeInTheDocument();
    expect(screen.getByText('Deluxe Edition')).toBeInTheDocument();
  });
});
