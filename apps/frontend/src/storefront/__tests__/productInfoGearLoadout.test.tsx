// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductInfo from '../sections/ProductInfo';
import { useCartStore } from '../store/useCartStore';
import { usePdpSelectionStore } from '../store/usePdpSelectionStore';

const mockUseProduct = vi.hoisted(() => vi.fn());
const mockUseStorefrontSettings = vi.hoisted(() => vi.fn());
const mockUseStorefrontTheme = vi.hoisted(() => vi.fn());
const trackingMocks = vi.hoisted(() => ({
  trackAddToCartEvent: vi.fn(),
  trackViewContentEvent: vi.fn(),
}));

vi.mock('sonner', () => ({
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
  useStorefrontFacebookTracking: () => trackingMocks,
}));

vi.mock('../hooks/useProductReviews', () => ({
  useProductReviews: () => ({ reviews: [], averageRating: 0 }),
}));

const product = {
  id: 'tee-001',
  name: 'Atlas Tee',
  description: '<p>Soft cotton tee for daily wear.</p>',
  price: 1200,
  comparePrice: 1500,
  images: ['https://example.com/atlas-tee.jpg'],
  slug: 'atlas-tee',
  categoryId: 'cat-clothing',
  category: { id: 'cat-clothing', name: 'Clothing' },
  productVariants: [
    {
      id: 'tee-red-m',
      name: 'Red / M',
      price: 1200,
      comparePrice: 1500,
      sku: 'TEE-RED-M',
      attributes: { Color: 'Red', Size: 'M' },
    },
    {
      id: 'tee-blue-m',
      name: 'Blue / M',
      price: 1350,
      comparePrice: 1500,
      sku: 'TEE-BLUE-M',
      attributes: { Color: 'Blue', Size: 'M' },
    },
  ],
};

const storefrontSettings = {
  company: {
    id: 'company123',
    name: 'Mock Outfitters',
    slug: 'mock-outfitters',
    logo: null,
    currency: 'EGP',
    settings: {},
  },
  storefront: {
    themeId: 'electronics-demo',
    settings: {
      storeName: 'Mock Outfitters',
      currency: 'EGP',
    },
    storefrontFeatures: {
      quickViewEnabled: true,
      comparisonEnabled: false,
      wishlistEnabled: false,
      recentlyViewedEnabled: false,
      advancedFiltersEnabled: true,
      productCardStyle: 'default',
      gridAddToCartIcon: 'bag',
      gridDiscountBanner: true,
    },
  },
  storefrontSettings: {
    storeName: 'Mock Outfitters',
    currency: 'EGP',
    designTokens: {},
  },
  templateId: null,
  lastUpdated: '2026-05-03T00:00:00.000Z',
};

const theme = {
  id: 'electronics-demo',
  name: 'TECHZONE',
  direction: 'rtl',
  tokens: {
    colors: {},
    typography: { direction: 'rtl' },
    shape: {},
  },
  header: { navigation: [], showSearch: true, showCart: true },
  footer: { navigation: [], socialLinks: {} },
  pages: {},
};

describe('ProductInfo gear-loadout variant selection', () => {
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
      product,
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
    mockUseStorefrontTheme.mockReturnValue({ theme });
  });

  it('renders color swatches and lets the customer switch colors', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/store/products/tee-001?companyId=company123']}>
        <Routes>
          <Route
            path="/store/products/:id"
            element={<ProductInfo section={{ variant: 'gear-loadout' }} />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Atlas Tee', level: 1 })).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getAllByRole('button', { name: /(?:Select Color|اختر اللون) Red/ }).length,
      ).toBeGreaterThan(0);
      expect(
        screen.getAllByRole('button', { name: /(?:Select Color|اختر اللون) Blue/ }).length,
      ).toBeGreaterThan(0);
    });

    await user.click(
      screen.getAllByRole('button', { name: /(?:Select Color|اختر اللون) Blue/ })[0]!,
    );

    await waitFor(() => {
      expect(screen.getByText(/EGP\s*1,350\.00/)).toBeInTheDocument();
    });
  });
});
