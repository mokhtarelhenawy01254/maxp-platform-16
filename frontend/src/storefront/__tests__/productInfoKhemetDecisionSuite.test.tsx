// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import ProductInfo from '../sections/ProductInfo';
import { useCartStore } from '../store/useCartStore';
import { usePdpSelectionStore } from '../store/usePdpSelectionStore';

const mockUseProduct = vi.hoisted(() => vi.fn());
const mockUseStorefrontSettings = vi.hoisted(() => vi.fn());
const mockUseStorefrontTheme = vi.hoisted(() => vi.fn());

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../hooks/useProduct', () => ({
  useProduct: mockUseProduct,
}));

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: mockUseStorefrontSettings,
}));

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: mockUseStorefrontTheme,
}));

vi.mock('../hooks/useStorefrontFacebookTracking', () => ({
  useStorefrontFacebookTracking: () => ({
    trackAddToCartEvent: vi.fn(),
    trackViewContentEvent: vi.fn(),
  }),
}));

vi.mock('../sections/PdpQuickOrderPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="pdp-quick-order-panel">Quick order panel</div>,
}));

const khemetProduct = {
  id: 'khemet-sneaker-001',
  name: 'KHEMET Cloud Sneaker',
  slug: 'khemet-cloud-sneaker',
  description: '<p>سنيكرز جلد خفيف للاستخدام اليومي.</p>',
  price: 2280,
  comparePrice: 2600,
  images: ['/shoe.png'],
  imageUrl: '/shoe.png',
  stock: 7,
  soldCount: 6,
  activeCartCount: 11,
  recentOrderCount: 5,
  saleEndDate: '2026-06-01T23:59:59+02:00',
  safeCheckoutItems: [
    'دفع عند الاستلام متاح',
    'تأكيد المقاس واللون قبل التجهيز',
    'تبديل مقاس خلال 14 يوم',
  ],
  productVariants: [
    {
      id: 'khemet-sneaker-37',
      name: 'أبيض / 37',
      price: 2280,
      comparePrice: 2600,
      stock: 7,
      attributes: {
        اللون: 'أبيض',
        المقاس: '37',
      },
    },
  ],
};

const storefrontSettings = {
  company: {
    id: 'company123',
    name: 'KHEMET LUXE',
    slug: 'khemet-luxe',
    currency: 'EGP',
    settings: {},
  },
  storefront: {
    themeId: 'khemet-luxe-eg',
    settings: {
      storeName: 'KHEMET LUXE',
      currency: 'EGP',
    },
    apps: {
      'conversion-suite': {
        enabled: true,
        settings: {
          modules: {
            soldCounter: true,
            purchaseFomo: true,
            lowStockNotice: true,
            saleCountdown: true,
            estimatedDelivery: true,
          },
        },
      },
    },
  },
  storefrontSettings: {
    storeName: 'KHEMET LUXE',
    currency: 'EGP',
    designTokens: {},
    productPageShowCheckoutForm: true,
  },
};

const khemetTheme = {
  id: 'khemet-luxe-eg',
  name: 'KHEMET LUXE',
  direction: 'rtl',
  tokens: {
    colors: {},
    typography: { direction: 'rtl' },
    shape: {},
  },
  header: { navigation: [], showSearch: true, showCart: true },
  footer: { navigation: [], socialLinks: {} },
  pages: {
    pdp: {
      sections: [
        { type: 'product-info', variant: 'elessi-care-buybox' },
        {
          type: 'pdp-checkout',
          settings: {
            placement: 'before-description',
            surfaceMode: 'merged-buybox',
            formVariant: 'khemet-luxe-eg',
          },
        },
      ],
    },
  },
};

describe('KHEMET inline quick-order buybox', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useCartStore.setState({ items: [], isOpen: false });
    usePdpSelectionStore.getState().resetSelection();

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    mockUseProduct.mockReturnValue({
      product: khemetProduct,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseStorefrontSettings.mockReturnValue({
      settings: storefrontSettings,
      isLoading: false,
      error: null,
      previewThemeId: null,
    });
    mockUseStorefrontTheme.mockReturnValue({ theme: khemetTheme });
  });

  afterEach(() => {
    cleanup();
  });

  it('keeps the merged quick-order form without the removed decision suite panel', async () => {
    render(
      <MemoryRouter initialEntries={['/store/products/khemet-cloud-sneaker?companyId=company123']}>
        <Routes>
          <Route
            path="/store/products/:id"
            element={<ProductInfo section={{ variant: 'elessi-care-buybox' }} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('pdp-quick-order-panel')).toBeInTheDocument();
    expect(screen.queryByTestId('khemet-purchase-decision-suite')).not.toBeInTheDocument();
  });
});
