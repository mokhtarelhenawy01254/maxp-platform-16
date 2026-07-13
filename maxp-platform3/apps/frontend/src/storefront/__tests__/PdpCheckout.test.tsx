// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PdpCheckout from '../sections/PdpCheckout';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockUseProduct = vi.fn();
const mockUseStorefrontTheme = vi.fn();
const mockUseStorefrontSettings = vi.fn();
const mockIsProductPageCheckoutEnabledForProduct = vi.fn();
const mockGetPdpQuickOrderSettingsFromDesignTokens = vi.fn(() => ({
  placement: 'before-description',
  surfaceMode: 'merged-buybox',
}));

vi.mock('../hooks/useProduct', () => ({
  useProduct: (...args: unknown[]) => mockUseProduct(...args),
}));

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => mockUseStorefrontTheme(),
}));

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => mockUseStorefrontSettings(),
}));

vi.mock('../../utils/productPageCheckout', () => ({
  isProductPageCheckoutEnabledForProduct: (...args: unknown[]) =>
    mockIsProductPageCheckoutEnabledForProduct(...args),
}));

vi.mock('../utils/pdpQuickOrderSettings', () => ({
  getPdpQuickOrderSettingsFromDesignTokens: (...args: unknown[]) =>
    mockGetPdpQuickOrderSettingsFromDesignTokens(...args),
}));

vi.mock('../sections/PdpQuickOrderPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="pdp-quick-order-panel">Quick order panel</div>,
}));

const baseProduct = {
  id: 'prod-1',
  name: 'Luna City Sneaker',
  slug: 'luna-city-sneaker',
  description: 'Comfortable sneaker',
  price: 2280,
  imageUrl: '/shoe.png',
  images: [],
  productVariants: [],
  hasVariants: false,
};

const renderAtProductRoute = (ui: React.ReactElement) =>
  render(
    <MemoryRouter initialEntries={['/product/luna-city-sneaker']}>
      <Routes>
        <Route path="/product/:id" element={ui} />
      </Routes>
    </MemoryRouter>,
  );

describe('PdpCheckout', () => {
  it('does not render a standalone quick-order panel when product-info supports inline placement', () => {
    mockUseProduct.mockReturnValue({ product: baseProduct });
    mockUseStorefrontTheme.mockReturnValue({
      theme: {
        id: 'women-fashion-eg',
        pages: {
          pdp: {
            sections: [
              {
                type: 'product-info',
                variant: 'style-ledger',
              },
            ],
          },
        },
      },
    });
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        storefrontSettings: {
          designTokens: {},
        },
      },
    });
    mockIsProductPageCheckoutEnabledForProduct.mockReturnValue(true);

    renderAtProductRoute(<PdpCheckout section={{ settings: {} }} />);

    expect(screen.queryByTestId('pdp-quick-order-panel')).not.toBeInTheDocument();
  });

  it('does not render a standalone quick-order panel for elessi care buybox because it supports inline placement', () => {
    mockUseProduct.mockReturnValue({ product: baseProduct });
    mockUseStorefrontTheme.mockReturnValue({
      theme: {
        id: 'khemet-luxe-eg',
        pages: {
          pdp: {
            sections: [
              {
                type: 'product-info',
                variant: 'elessi-care-buybox',
              },
            ],
          },
        },
      },
    });
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        storefrontSettings: {
          designTokens: {},
        },
      },
    });
    mockIsProductPageCheckoutEnabledForProduct.mockReturnValue(true);

    renderAtProductRoute(<PdpCheckout section={{ settings: {} }} />);

    expect(screen.queryByTestId('pdp-quick-order-panel')).not.toBeInTheDocument();
  });

  it('renders the standalone quick-order panel when product-info does not support inline placement', () => {
    mockUseProduct.mockReturnValue({ product: baseProduct });
    mockUseStorefrontTheme.mockReturnValue({
      theme: {
        id: 'women-fashion-eg',
        pages: {
          pdp: {
            sections: [
              {
                type: 'product-info',
                variant: 'specs-grid',
              },
            ],
          },
        },
      },
    });
    mockUseStorefrontSettings.mockReturnValue({
      settings: {
        storefrontSettings: {
          designTokens: {},
        },
      },
    });
    mockIsProductPageCheckoutEnabledForProduct.mockReturnValue(true);

    renderAtProductRoute(<PdpCheckout section={{ settings: {} }} />);

    expect(screen.getByTestId('pdp-quick-order-panel')).toBeInTheDocument();
  });
});
