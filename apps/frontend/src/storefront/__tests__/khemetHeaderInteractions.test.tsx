// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import StorefrontShell, {
  shouldStorefrontForceDocumentNavigation,
  shouldStorefrontHeaderForceDocumentNavigation,
} from '../StorefrontShell';
import { useCartStore } from '../store/useCartStore';
import { useCheckoutStore } from '../store/useCheckoutStore';

vi.mock('../services/storefrontAnalytics', () => ({
  default: {
    trackStoreVisit: vi.fn(),
    trackProductView: vi.fn(),
    trackAddToCart: vi.fn(),
    trackCheckout: vi.fn(),
    trackPurchase: vi.fn(),
  },
}));

const companyId = 'company123';

const product = {
  id: 'hoodie-001',
  name: 'Flora Hoodie',
  description: '<p>Soft hoodie for everyday wear.</p>',
  price: 499,
  comparePrice: 599,
  images: ['https://example.com/hoodie.jpg'],
  slug: 'atlas-tee',
  categoryId: 'cat-clothing',
  category: { id: 'cat-clothing', name: 'Clothing' },
  productVariants: [
    {
      id: 'hoodie-black-xl',
      name: 'Black / XL',
      price: 499,
      comparePrice: 599,
      sku: 'HOODIE-BLACK-XL',
      attributes: { Color: 'Black', Size: 'XL' },
    },
  ],
};

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

describe('KHEMET LUXE storefront header interactions', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    window.history.pushState({}, '', `/product/${product.slug}?companyId=${companyId}`);
    localStorage.setItem('storefront_companyId', companyId);
    useCartStore.setState({ items: [], isOpen: false });
    useCheckoutStore.getState().resetCheckout();
    queryClient = createQueryClient();

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = (init?.method || 'GET').toUpperCase();
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
              name: 'Flora',
              slug: 'flora',
              logo: null,
              currency: 'EGP',
              settings: {},
            },
            storefront: {
              themeId: 'khemet-luxe-eg',
              apps: {
                'conversion-suite': {
                  enabled: true,
                  settings: {
                    modules: {
                      freeShippingBar: true,
                    },
                    thresholds: {
                      freeShippingAmount: 500,
                    },
                  },
                },
              },
              pages: {
                home: { sections: ['hero-banner', 'featured-products'] },
                shop: { sections: ['product-grid'] },
                pdp: { sections: ['product-gallery', 'product-info'] },
                cart: { sections: ['cart-items', 'order-summary'] },
                checkout: { sections: ['checkout-form', 'payment'] },
              },
              settings: {
                storeName: 'Flora',
                currency: 'EGP',
              },
              storefrontFeatures: {
                quickViewEnabled: true,
                comparisonEnabled: true,
                wishlistEnabled: true,
                recentlyViewedEnabled: false,
                advancedFiltersEnabled: true,
                productCardStyle: 'default',
                gridAddToCartIcon: false,
                gridDiscountBanner: true,
              },
            },
            templateId: null,
            lastUpdated: '2026-04-29T00:00:00.000Z',
          },
        });
      }

      if (
        url.pathname.endsWith('/public/categories') ||
        url.pathname.endsWith('/public/products/categories')
      ) {
        return jsonResponse({ success: true, data: [] });
      }

      if (url.pathname.endsWith('/public/products') && method === 'GET') {
        return jsonResponse({
          success: true,
          data: [product],
          pagination: {
            total: 1,
            page: 1,
            limit: 12,
            pages: 1,
          },
        });
      }

      if (url.pathname.includes('/public/products/') && method === 'GET') {
        return jsonResponse({ success: true, data: product });
      }

      if (url.pathname.endsWith('/public/storefront/apps/conversion-suite/track')) {
        return jsonResponse({ success: true });
      }

      return jsonResponse({ success: false, message: `Unhandled request: ${url.pathname}` }, 404);
    }) as typeof fetch;
  });

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    useCartStore.setState({ items: [], isOpen: false });
    useCheckoutStore.getState().resetCheckout();
  });

  it('lets the KHEMET product page brand link use document navigation back home', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <StorefrontShell subdomain="flora" />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    const brandLink = await screen.findByRole('link', { name: 'Flora' });
    expect(brandLink).toHaveAttribute('href', `/?companyId=${companyId}`);
    brandLink.setAttribute('href', 'javascript:void(0)');

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      button: 0,
      cancelable: true,
    });
    brandLink.dispatchEvent(clickEvent);

    expect(clickEvent.defaultPrevented).toBe(false);
  });

  it('shows the compact KHEMET service rail on product pages', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <StorefrontShell subdomain="flora" />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    const orderLink = await screen.findByRole('link', { name: 'ابدئي الطلب' });
    expect(orderLink).toHaveAttribute('href', `/shop?companyId=${companyId}`);
    expect(screen.getByText(/شحن مجاني فوق .* جنيه/)).toBeInTheDocument();
    expect(screen.getByText('تبديل مقاس خلال 14 يوم')).toBeInTheDocument();
  });

  it('opens menu, search, and empty cart controls from the KHEMET product page header', async () => {
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <StorefrontShell subdomain="flora" />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole('link', { name: 'Flora' })).toBeInTheDocument();

    await user.click(await screen.findByRole('button', { name: /فتح القائمة|Open menu/ }));
    expect(
      await screen.findByRole('dialog', { name: /قائمة المتجر|Store navigation/ }),
    ).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /إغلاق القائمة|Close menu/ }).at(-1)!);
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /قائمة المتجر|Store navigation/ }),
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /فتح البحث|Open search/ }));
    expect(
      await screen.findByRole('dialog', { name: /بحث المنتجات|Search products/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /إغلاق البحث|Close search/ }));
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /بحث المنتجات|Search products/ }),
      ).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /سلة التسوق|Shopping cart/ }));
    expect(await screen.findByRole('dialog', { name: /سلة|Cart/ })).toBeInTheDocument();
  });

  it('uses document navigation for KHEMET chrome links across storefront pages', () => {
    expect(
      shouldStorefrontForceDocumentNavigation('khemet-luxe-eg', true),
    ).toBe(true);
    expect(
      shouldStorefrontForceDocumentNavigation('khemet-luxe-eg', false),
    ).toBe(true);
    expect(
      shouldStorefrontHeaderForceDocumentNavigation('khemet-luxe-eg', true),
    ).toBe(true);
    expect(
      shouldStorefrontHeaderForceDocumentNavigation('khemet-luxe-eg', false),
    ).toBe(true);
    expect(
      shouldStorefrontHeaderForceDocumentNavigation('vela-fashion-eg', true),
    ).toBe(false);
  });
});
