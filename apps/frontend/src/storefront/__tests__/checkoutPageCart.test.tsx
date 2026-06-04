// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import StorefrontShell from '../StorefrontShell';
import { useCartStore } from '../store/useCartStore';
import { useCheckoutStore } from '../store/useCheckoutStore';

const companyId = 'company123';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

describe('Storefront checkout cart injection', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('storefront_companyId', companyId);
    useCheckoutStore.getState().resetCheckout();
    useCartStore.setState({
      isOpen: false,
      items: [
        {
          id: 'tee-001-tee-blue-l',
          productId: 'tee-001',
          variantId: 'tee-blue-l',
          name: 'Atlas Tee',
          price: 1350,
          basePrice: 1350,
          quantity: 1,
          imageUrl: 'https://example.com/atlas-tee.jpg',
          attributes: {
            Color: 'Blue',
            Size: 'L',
          },
        },
      ],
    });

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const url = new URL(requestUrl, window.location.origin);

      const jsonResponse = (payload: unknown, status = 200) =>
        Promise.resolve(
          new Response(JSON.stringify(payload), {
            status,
            headers: {
              'Content-Type': 'application/json',
            },
          }),
        );

      if (url.pathname.endsWith('/public/storefront/settings')) {
        return jsonResponse({
          success: true,
          data: {
            company: {
              id: companyId,
              name: 'Mock Outfitters',
              slug: 'mock-outfitters',
              logo: null,
              currency: 'EGP',
              settings: {},
            },
            storefront: {
              themeId: 'modern-minimal',
              pages: {
                home: { sections: ['hero-banner', 'featured-products', 'newsletter'] },
                shop: { sections: ['filters-sidebar', 'product-grid'] },
                pdp: { sections: ['product-gallery', 'product-info', 'reviews'] },
                cart: { sections: ['cart-items', 'order-summary'] },
                checkout: { sections: ['checkout-form', 'payment'] },
              },
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
                gridAddToCartIcon: false,
                gridDiscountBanner: true,
              },
            },
            templateId: null,
            lastUpdated: '2026-03-25T00:00:00.000Z',
          },
        });
      }

      if (
        url.pathname.endsWith('/public/categories') ||
        url.pathname.endsWith('/public/products/categories')
      ) {
        return jsonResponse({ success: true, data: [] });
      }

      if (url.pathname.endsWith('/public/products')) {
        return jsonResponse({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 12,
            pages: 0,
          },
        });
      }

      if (url.pathname.endsWith('/public/storefront/apps/conversion-suite/track')) {
        return jsonResponse({ success: true });
      }

      return jsonResponse({ success: false, message: `Unhandled request: ${url.pathname}` }, 404);
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useCartStore.setState({ items: [], isOpen: false });
    useCheckoutStore.getState().resetCheckout();
  });

  it('shows cart products on the checkout page even when the theme omits cart-items explicitly', async () => {
    const queryClient = createQueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/store/checkout?companyId=${companyId}`]}>
          <Routes>
            <Route path="/store/*" element={<StorefrontShell />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Shopping cart|سلة التسوق/)).toBeInTheDocument();
    expect(screen.getAllByText('Atlas Tee').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/(Color|اللون):\s*Blue/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/(Size|المقاس):\s*L/).length).toBeGreaterThan(0);
  });

  it('shows a cart icon in the checkout header and opens the cart drawer from there', async () => {
    const queryClient = createQueryClient();
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/store/checkout?companyId=${companyId}`]}>
          <Routes>
            <Route path="/store/*" element={<StorefrontShell />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const cartButtons = await screen.findAllByRole('button', {
      name: /Open cart|فتح السلة/,
    });
    expect(cartButtons.length).toBeGreaterThan(0);

    await user.click(cartButtons[0]!);

    expect(
      await screen.findByRole('dialog', { name: /Shopping Cart|سلة التسوق/ }),
    ).toBeInTheDocument();
  });
});
