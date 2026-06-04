// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';

import RelatedProducts from '../sections/RelatedProducts';

const useDeferredSectionActivationMock = vi.hoisted(() =>
  vi.fn(() => ({
    isActive: true,
    sectionRef: { current: null },
  })),
);

const currentProduct = {
  id: 'swan',
  slug: 'kotshy-soan',
  name: 'كوتشي سوان',
  price: 330,
  categoryId: 'women-shoes',
};

const relatedProducts = [
  {
    id: 'flat',
    slug: 'kotshy-eskotch-flat',
    name: 'كوتشي اسكوتش فلات',
    price: 280,
    comparePrice: 0,
    category: { name: "WOMEN'S SHOES" },
    productVariants: [{ id: 'flat-37', attributes: { المقاس: '37' } }],
  },
  {
    id: 'line',
    slug: 'swan-line',
    name: 'سوان لاين',
    price: 449,
    comparePrice: 550,
    category: { name: "WOMEN'S SHOES" },
    productVariants: [{ id: 'line-37', attributes: { المقاس: '37' } }],
  },
];

vi.mock('../hooks/useProduct', () => ({
  useProduct: () => ({ product: currentProduct, isLoading: false }),
}));

vi.mock('../hooks/useProducts', () => ({
  useProducts: () => ({
    products: relatedProducts,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../hooks/useStorefrontSettings', () => ({
  useStorefrontSettings: () => ({
    settings: {
      company: { currency: 'EGP' },
      storefront: {
        settings: { currency: 'EGP' },
      },
    },
  }),
}));

vi.mock('../engine/ThemeProvider', () => ({
  useStorefrontTheme: () => ({
    theme: {
      id: 'khemet-luxe-eg',
      direction: 'rtl',
    },
  }),
}));

vi.mock('../hooks/useDeferredSectionActivation', () => ({
  useDeferredSectionActivation: useDeferredSectionActivationMock,
}));

vi.mock('../utils/marketplaceApps', () => ({
  getStorefrontMarketplaceAppSettings: () => ({}),
  isStorefrontMarketplaceAppEnabled: () => false,
}));

vi.mock('../components/StorefrontProductImage', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe('Elessi complete-set related products', () => {
  beforeEach(() => {
    cleanup();
    useDeferredSectionActivationMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('does not render a zero compare price as a sale price', () => {
    render(
      <MemoryRouter initialEntries={['/product/kotshy-soan']}>
        <Routes>
          <Route
            path="/product/:id"
            element={
              <RelatedProducts
                section={{ variant: 'elessi-complete-set' }}
                settings={{ limit: 2 }}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('كوتشي اسكوتش فلات')).toBeInTheDocument();
    expect(screen.queryByText(/EGP\s*0\.00/)).not.toBeInTheDocument();
    expect(screen.getByText(/EGP\s*280\.00/)).toBeInTheDocument();
    expect(screen.getByText(/EGP\s*550\.00/)).toBeInTheDocument();
  });

  it('reserves space and prewarms recommendations before the complete-set rail enters view', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/product/kotshy-soan']}>
        <Routes>
          <Route
            path="/product/:id"
            element={
              <RelatedProducts
                section={{ variant: 'elessi-complete-set' }}
                settings={{ limit: 2 }}
              />
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.querySelector('section')?.className).toContain('min-h-[44rem]');
    expect(useDeferredSectionActivationMock).toHaveBeenCalledWith({
      idleTimeout: 3500,
      rootMargin: '1800px 0px',
    });
  });
});
