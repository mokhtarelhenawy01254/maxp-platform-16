// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import {
  isProductInfoConversionModuleEnabled,
  shouldProductInfoAddToCartOpenCart,
  shouldProductInfoAddToCartOpenEmbeddedCheckout,
  shouldProductInfoMobileStickyOpenVariantSheet,
} from '../sections/ProductInfo';

describe('isProductInfoConversionModuleEnabled', () => {
  it('enables Sold Counter only when conversion-suite is active and the store setting is on', () => {
    expect(
      isProductInfoConversionModuleEnabled(true, { soldCounter: true }, 'soldCounter'),
    ).toBe(true);
    expect(
      isProductInfoConversionModuleEnabled(false, { soldCounter: true }, 'soldCounter'),
    ).toBe(false);
    expect(
      isProductInfoConversionModuleEnabled(true, { soldCounter: false }, 'soldCounter'),
    ).toBe(false);
  });

  it('enables Purchase FOMO only when its store setting is on', () => {
    expect(
      isProductInfoConversionModuleEnabled(true, { purchaseFomo: true }, 'purchaseFomo'),
    ).toBe(true);
    expect(
      isProductInfoConversionModuleEnabled(true, { purchaseFomo: false }, 'purchaseFomo'),
    ).toBe(false);
  });

  it('enables Low Stock Notice only when conversion-suite and its module are both active', () => {
    expect(
      isProductInfoConversionModuleEnabled(true, { lowStockNotice: true }, 'lowStockNotice'),
    ).toBe(true);
    expect(
      isProductInfoConversionModuleEnabled(false, { lowStockNotice: true }, 'lowStockNotice'),
    ).toBe(false);
    expect(
      isProductInfoConversionModuleEnabled(true, { lowStockNotice: false }, 'lowStockNotice'),
    ).toBe(false);
  });

  it('enables Sticky Add to Cart only when conversion-suite and its module are both active', () => {
    expect(
      isProductInfoConversionModuleEnabled(true, { stickyAddToCart: true }, 'stickyAddToCart'),
    ).toBe(true);
    expect(
      isProductInfoConversionModuleEnabled(false, { stickyAddToCart: true }, 'stickyAddToCart'),
    ).toBe(false);
    expect(
      isProductInfoConversionModuleEnabled(true, { stickyAddToCart: false }, 'stickyAddToCart'),
    ).toBe(false);
  });
});

describe('product-info add-to-cart routing', () => {
  it('keeps KHEMET add-to-cart on the cart drawer path even with embedded PDP checkout', () => {
    expect(shouldProductInfoAddToCartOpenCart('khemet-luxe-eg', true)).toBe(true);
    expect(
      shouldProductInfoAddToCartOpenEmbeddedCheckout('khemet-luxe-eg', true),
    ).toBe(false);
  });

  it('preserves embedded checkout behavior for non-KHEMET direct-order themes', () => {
    expect(shouldProductInfoAddToCartOpenCart('women-fashion-eg', true)).toBe(false);
    expect(
      shouldProductInfoAddToCartOpenEmbeddedCheckout('women-fashion-eg', true),
    ).toBe(true);
  });

  it('sends mobile sticky add-to-cart directly when a variant is already selected', () => {
    expect(shouldProductInfoMobileStickyOpenVariantSheet(true, true)).toBe(false);
    expect(shouldProductInfoMobileStickyOpenVariantSheet(true, false)).toBe(true);
    expect(shouldProductInfoMobileStickyOpenVariantSheet(false, false)).toBe(false);
  });
});
