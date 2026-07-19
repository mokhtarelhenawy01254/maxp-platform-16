// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductGallery from '../sections/ProductGallery';
import { StorefrontThemeProvider } from '../engine/ThemeProvider';
import { usePdpSelectionStore } from '../store/usePdpSelectionStore';

const useProductMock = vi.fn();
const useStorefrontSettingsMock = vi.fn();

vi.mock('../hooks/useProduct', () => ({
  useProduct: (...args: unknown[]) => useProductMock(...args),
}));

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => useStorefrontSettingsMock(),
}));

const renderGallery = () =>
  render(
    <StorefrontThemeProvider>
      <MemoryRouter initialEntries={['/products/test-product']}>
        <Routes>
          <Route
            path="/products/:id"
            element={<ProductGallery section={{ variant: 'standard' }} />}
          />
        </Routes>
      </MemoryRouter>
    </StorefrontThemeProvider>,
  );

describe('ProductGallery', () => {
  beforeEach(() => {
    usePdpSelectionStore.setState({ selection: null, quantity: 1 });
    useStorefrontSettingsMock.mockReturnValue({
      settings: {
        storefront: {
          settings: {
            currency: 'EGP',
          },
        },
      },
      isLoading: false,
      error: null,
      previewThemeId: null,
    });
    useProductMock.mockReturnValue({
      product: {
        id: 'test-product',
        name: 'Test Product',
        images: ['/assets/product-default-1.jpg', '/assets/product-default-2.jpg'],
        productVariants: [
          {
            id: 'variant-gold',
            image: '/assets/variant-gold-cover.jpg',
            images: ['/assets/variant-gold-1.jpg', '/assets/variant-gold-2.jpg'],
            attributeValues: { Color: 'Gold' },
          },
        ],
      },
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    usePdpSelectionStore.setState({ selection: null, quantity: 1 });
  });

  it('prefers selected variant galleries when the current PDP selection points at a variant', () => {
    usePdpSelectionStore.setState({
      selection: {
        productId: 'test-product',
        productName: 'Test Product',
        variantId: 'variant-gold',
        imageUrl: '/assets/variant-gold-cover.jpg',
        unitPrice: 100,
        basePrice: 100,
        attributes: { Color: 'Gold' },
        volumeDiscounts: [],
        requiresVariantSelection: true,
        isSelectionReady: true,
      },
      quantity: 1,
    });

    renderGallery();

    expect(screen.getByAltText('Test Product main view')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/variant-gold-1.jpg'),
    );
    expect(screen.getByAltText('Test Product thumbnail 2')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/variant-gold-2.jpg'),
    );
  });

  it('falls back to the product gallery when the selected variant has no dedicated imagery', () => {
    useProductMock.mockReturnValue({
      product: {
        id: 'test-product',
        name: 'Test Product',
        images: ['/assets/product-default-1.jpg', '/assets/product-default-2.jpg'],
        productVariants: [
          {
            id: 'variant-black',
            attributeValues: { Color: 'Black' },
          },
        ],
      },
      isLoading: false,
      error: null,
    });

    usePdpSelectionStore.setState({
      selection: {
        productId: 'test-product',
        productName: 'Test Product',
        variantId: 'variant-black',
        imageUrl: '/assets/variant-black-cover.jpg',
        unitPrice: 100,
        basePrice: 100,
        attributes: { Color: 'Black' },
        volumeDiscounts: [],
        requiresVariantSelection: true,
        isSelectionReady: true,
      },
      quantity: 1,
    });

    renderGallery();

    expect(screen.getByAltText('Test Product main view')).toHaveAttribute(
      'src',
      expect.stringContaining('/assets/product-default-1.jpg'),
    );
  });

  it('preserves the full hero image frame while serving an optimized PDP hero source', () => {
    useProductMock.mockReturnValue({
      product: {
        id: 'test-product',
        name: 'Test Product',
        images: [
          '/uploads/products/product-default-1.jpg',
          '/uploads/products/product-default-2.jpg',
        ],
        productVariants: [],
      },
      isLoading: false,
      error: null,
    });

    renderGallery();

    const mainImage = screen.getByAltText('Test Product main view');

    expect(mainImage).toHaveStyle({ objectFit: 'contain' });
    expect(mainImage).toHaveAttribute(
      'src',
      expect.stringContaining('/uploads/products/product-default-1.jpg'),
    );
    expect(mainImage.getAttribute('src')).toContain('format=webp');
    expect(mainImage.getAttribute('src')).toContain('w=1280');
    expect(mainImage.getAttribute('srcset')).toContain('w=640');
  });
});
