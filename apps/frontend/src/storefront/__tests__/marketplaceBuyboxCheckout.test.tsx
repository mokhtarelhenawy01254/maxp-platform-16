import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { MarketplaceBuybox } from '../sections/product-info/buyboxes/MarketplaceBuybox';
import type { ProductInfoController } from '../sections/product-info/productInfoTypes';

describe('MarketplaceBuybox with PDP Checkout and Quantity Offers', () => {
  const createMockCtrl = (overrides?: Partial<ProductInfoController>): ProductInfoController => {
    return {
      product: {
        id: 'test-product-1',
        name: 'شاشة سامسونج سمارت 55 بوصة',
        price: 12500,
        originalPrice: 15000,
        discount: 17,
        productVariants: [],
        images: ['/test.jpg'],
        imageUrl: '/test.jpg',
      } as any,
      prefersArabicCopy: true,
      displayPrice: '12,500 ج.م',
      originalPrice: '15,000 ج.م',
      discount: 17,
      selectedAttributes: {},
      setSelectedAttributes: vi.fn(),
      variantSettings: {} as any,
      quantity: 1,
      setQuantity: vi.fn(),
      addToCartText: 'أضف إلى السلة',
      buyNowText: 'شراء الآن',
      addToCartButtonClassName: '',
      buyNowButtonClassName: '',
      handleAddToCart: vi.fn(),
      handleBuyNow: vi.fn(),
      descriptionTitle: 'الوصف',
      safeDescription: '<p>شاشة 4K فائقة الوضوح</p>',
      descriptionPreviewText: 'شاشة 4K فائقة الوضوح',
      shortDescription: 'شاشة 4K سمارت ريسيفر داخلي',
      guaranteesTitle: 'الضمان',
      guaranteesSubtitle: 'ضمان معتمد',
      guaranteeItems: [],
      guaranteeStyle: 'minimal',
      isStickyAddToCartEnabled: false,
      showStickyCta: false,
      activePrice: 12500,
      currency: 'ج.م',
      canOpenSizeGuide: false,
      sizeGuideText: 'دليل المقاسات',
      rawSizeGuideHref: '',
      sizeGuideDialog: null,
      shippingPolicyDialog: null,
      questionDialog: null,
      externalOnlyProduct: false,
      showExternalAffiliateCta: false,
      renderExternalPurchaseCta: vi.fn(),
      shouldRenderStandaloneBuyBox: true,
      shouldRenderPrimaryBuyBox: true,
      isCartOpen: false,
      hasEmbeddedPdpCheckout: true,
      isStrictlyOutOfStock: false,
      mergedInlinePdpQuickOrder: (
        <div data-testid="pdp-quick-order-form">
          <h3>بيانات الشحن السريع</h3>
          <input placeholder="الاسم بالكامل" />
          <input placeholder="رقم الهاتف" />
          <button type="submit">تأكيد الطلب</button>
        </div>
      ),
      inlineQuantityOffers: (
        <div data-testid="inline-quantity-offers">
          <p>عروض الباقات والوفر</p>
          <div>اشتري 2 بخصم 10%</div>
        </div>
      ),
      isPrimaryQuantityOffersDecision: false,
      shippingRailTitle: 'الشحن والتوصيل',
      shippingText: 'توصيل خلال 2-3 أيام',
      shippingWarranty: 'ضمان سنة معتمد',
      shippingReturns: 'إرجاع مجاني 14 يوم',
      ...overrides,
    } as unknown as ProductInfoController;
  };

  it('renders Quantity Offers, Add to Cart, Buy Now, and Inline Checkout Form simultaneously without hiding any buttons', () => {
    const ctrl = createMockCtrl();
    render(
      <MemoryRouter>
        <MarketplaceBuybox ctrl={ctrl} />
      </MemoryRouter>
    );

    // 1. Verify Product Title & Price
    expect(screen.getByText('شاشة سامسونج سمارت 55 بوصة')).toBeTruthy();
    expect(screen.getByText('12,500 ج.م')).toBeTruthy();

    // 2. Verify Quantity Offers block is rendered
    expect(screen.getByTestId('inline-quantity-offers')).toBeTruthy();
    expect(screen.getByText('عروض الباقات والوفر')).toBeTruthy();

    // 3. Verify Quantity Stepper + Add to Cart + Buy Now buttons are NOT hidden
    expect(screen.getByRole('button', { name: 'أضف إلى السلة' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'شراء الآن' })).toBeTruthy();

    // 4. Verify Inline Checkout Form is rendered cleanly below the buttons
    expect(screen.getByTestId('pdp-quick-order-form')).toBeTruthy();
    expect(screen.getByText('بيانات الشحن السريع')).toBeTruthy();
    expect(screen.getByPlaceholderText('الاسم بالكامل')).toBeTruthy();
    expect(screen.getByPlaceholderText('رقم الهاتف')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'تأكيد الطلب' })).toBeTruthy();

    // 5. Verify Shipping & Delivery Rail (WoodMart Column 3) is present
    expect(screen.getByText('ضمان سنة على المنتج')).toBeTruthy();
    expect(screen.getByText('إرجاع مجاني خلال 30 يوم')).toBeTruthy();
  });
});

